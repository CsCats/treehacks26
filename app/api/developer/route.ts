import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// GET /api/developer?businessId=xxx — list all endpoints for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const q = query(
      collection(db, 'apiEndpoints'),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(q);
    const endpoints = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return NextResponse.json({ error: 'Failed to fetch endpoints' }, { status: 500 });
  }
}

// POST /api/developer — create a new API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, taskId, includeVideo, includePose, includeMetadata, statusFilter } = body;

    if (!businessId || !name || !taskId) {
      return NextResponse.json(
        { error: 'businessId, name, and taskId are required' },
        { status: 400 }
      );
    }

    const apiKey = `mk_${uuidv4().replace(/-/g, '')}`;

    const endpointDoc = await addDoc(collection(db, 'apiEndpoints'), {
      businessId,
      name,
      taskId,
      apiKey,
      includeVideo: includeVideo ?? true,
      includePose: includePose ?? true,
      includeMetadata: includeMetadata ?? true,
      statusFilter: statusFilter || 'approved',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      id: endpointDoc.id,
      apiKey,
      name,
      taskId,
    });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    return NextResponse.json({ error: 'Failed to create endpoint' }, { status: 500 });
  }
}

// DELETE /api/developer — delete an endpoint
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpointId } = body;

    if (!endpointId) {
      return NextResponse.json({ error: 'endpointId is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'apiEndpoints', endpointId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    return NextResponse.json({ error: 'Failed to delete endpoint' }, { status: 500 });
  }
}
