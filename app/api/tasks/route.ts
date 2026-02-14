import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, doc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    let q;
    if (businessId) {
      q = query(collection(db, 'tasks'), where('businessId', '==', businessId));
    } else {
      q = query(collection(db, 'tasks'));
    }

    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements, businessId, businessName, pricePerApproval, deadline } = body;

    if (!title || !description || !businessId) {
      return NextResponse.json(
        { error: 'Title, description, and businessId are required' },
        { status: 400 }
      );
    }

    const docRef = await addDoc(collection(db, 'tasks'), {
      title,
      description,
      requirements: requirements || '',
      businessId,
      businessName: businessName || '',
      pricePerApproval: Number(pricePerApproval) || 0,
      deadline: deadline || null,
      status: 'open',
      submissionCount: 0,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, title, description, requirements, businessId, businessName, pricePerApproval: Number(pricePerApproval) || 0, deadline: deadline || null, status: 'open' });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status, deadline } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const taskRef = doc(db, 'tasks', taskId);
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!['open', 'closed'].includes(status)) {
        return NextResponse.json({ error: 'status must be open or closed' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (deadline !== undefined) {
      updateData.deadline = deadline || null;
    }

    await updateDoc(taskRef, updateData);

    return NextResponse.json({ id: taskId, ...updateData });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
