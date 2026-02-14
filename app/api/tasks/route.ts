import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

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
    const { title, description, requirements, businessId, businessName, pricePerApproval } = body;

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
      submissionCount: 0,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, title, description, requirements, businessId, businessName, pricePerApproval: Number(pricePerApproval) || 0 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
