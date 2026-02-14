import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
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
    const { submissionId, status } = body;

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
    await updateDoc(submissionRef, { status });

    return NextResponse.json({ id: submissionId, status });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
