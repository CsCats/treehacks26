import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const businessId = searchParams.get('businessId');

    const contributorId = searchParams.get('contributorId');

    let q;
    if (taskId) {
      q = query(
        collection(db, 'submissions'),
        where('taskId', '==', taskId)
      );
    } else if (businessId) {
      q = query(
        collection(db, 'submissions'),
        where('businessId', '==', businessId)
      );
    } else if (contributorId) {
      q = query(
        collection(db, 'submissions'),
        where('contributorId', '==', contributorId)
      );
    } else {
      q = query(collection(db, 'submissions'));
    }

    const snapshot = await getDocs(q);
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const poseDataStr = formData.get('poseData') as string | null;
    const taskId = formData.get('taskId') as string | null;
    const businessId = formData.get('businessId') as string | null;
    const contributorId = formData.get('contributorId') as string | null;
    const contributorName = formData.get('contributorName') as string | null;

    if (!videoFile || !poseDataStr || !taskId) {
      return NextResponse.json(
        { error: 'video, poseData, and taskId are required' },
        { status: 400 }
      );
    }

    const poseData = JSON.parse(poseDataStr);

    // Upload video to Firebase Storage
    const videoId = uuidv4();
    const videoRef = ref(storage, `videos/${taskId}/${videoId}.webm`);
    const videoBuffer = await videoFile.arrayBuffer();
    await uploadBytes(videoRef, new Uint8Array(videoBuffer), {
      contentType: 'video/webm',
    });
    const videoUrl = await getDownloadURL(videoRef);

    // Upload pose JSON to Firebase Storage
    const poseJsonRef = ref(storage, `poses/${taskId}/${videoId}.json`);
    const poseJsonBlob = new TextEncoder().encode(JSON.stringify(poseData));
    await uploadBytes(poseJsonRef, poseJsonBlob, {
      contentType: 'application/json',
    });
    const poseUrl = await getDownloadURL(poseJsonRef);

    // Save submission metadata to Firestore
    const submissionDoc = await addDoc(collection(db, 'submissions'), {
      taskId,
      businessId: businessId || '',
      contributorId: contributorId || '',
      contributorName: contributorName || '',
      status: 'pending',
      videoUrl,
      poseUrl,
      poseData,
      createdAt: serverTimestamp(),
    });

    // Increment submission count on the task
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      submissionCount: increment(1),
    });

    return NextResponse.json({
      id: submissionDoc.id,
      videoUrl,
      poseUrl,
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, status, feedback, rating } = body;

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: 'submissionId and status are required' },
        { status: 400 }
      );
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pending, approved, or rejected' },
        { status: 400 }
      );
    }

    const submissionRef = doc(db, 'submissions', submissionId);

    // If approving, handle the payout
    if (status === 'approved') {
      const submissionSnap = await getDoc(submissionRef);
      if (!submissionSnap.exists()) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      const submissionData = submissionSnap.data();

      // Get the task to find the price
      const taskSnap = await getDoc(doc(db, 'tasks', submissionData.taskId));
      const price = taskSnap.exists() ? (taskSnap.data().pricePerApproval || 0) : 0;

      if (price > 0) {
        const businessId = submissionData.businessId;
        const contributorId = submissionData.contributorId;

        // Check business has enough balance
        const businessDoc = await getDoc(doc(db, 'users', businessId));
        const businessBalance = businessDoc.exists() ? (businessDoc.data().balance || 0) : 0;

        if (businessBalance < price) {
          return NextResponse.json(
            { error: `Insufficient balance. You need $${price.toFixed(2)} but have $${businessBalance.toFixed(2)}. Add funds in Billing.` },
            { status: 400 }
          );
        }

        // Deduct from business
        await updateDoc(doc(db, 'users', businessId), {
          balance: increment(-price),
        });

        // Credit contributor
        if (contributorId) {
          await updateDoc(doc(db, 'users', contributorId), {
            balance: increment(price),
          });
        }

        // Record transactions
        await addDoc(collection(db, 'transactions'), {
          userId: businessId,
          type: 'payout',
          amount: -price,
          description: `Approved submission by ${submissionData.contributorName || 'contributor'}`,
          submissionId,
          taskId: submissionData.taskId,
          createdAt: serverTimestamp(),
        });

        if (contributorId) {
          await addDoc(collection(db, 'transactions'), {
            userId: contributorId,
            type: 'earning',
            amount: price,
            description: `Approved submission for task`,
            submissionId,
            taskId: submissionData.taskId,
            createdAt: serverTimestamp(),
          });
        }
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }
    if (rating !== undefined) {
      const r = Number(rating);
      if (r >= 1 && r <= 5) {
        updateData.rating = r;
      }
    }
    await updateDoc(submissionRef, updateData);

    return NextResponse.json({ id: submissionId, status, feedback: feedback || null, rating: updateData.rating || null });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
