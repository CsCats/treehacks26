import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
  increment,
  collection,
  addDoc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

// GET /api/billing?userId=xxx — get balance and transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get user balance (bypass cache)
    const userDoc = await getDocFromServer(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const balance = userDoc.data().balance || 0;

    // Get transactions (bypass cache)
    let transactions;
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocsFromServer(q);
      transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // If index doesn't exist yet, fetch without ordering and sort client-side
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocsFromServer(q);
      transactions = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const aTime = (a.createdAt as { seconds?: number })?.seconds || 0;
          const bTime = (b.createdAt as { seconds?: number })?.seconds || 0;
          return bTime - aTime;
        });
    }

    return NextResponse.json({ balance, transactions });
  } catch (error) {
    console.error('Error fetching billing:', error);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}

// POST /api/billing — add funds to business account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'userId and a positive amount are required' },
        { status: 400 }
      );
    }

    // Update balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { balance: increment(amount) });

    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'deposit',
      amount,
      description: 'Added funds to account',
      createdAt: serverTimestamp(),
    });

    // Get updated balance (bypass cache)
    const updatedDoc = await getDocFromServer(userRef);
    const newBalance = updatedDoc.data()?.balance || 0;

    return NextResponse.json({ balance: newBalance });
  } catch (error) {
    console.error('Error adding funds:', error);
    return NextResponse.json({ error: 'Failed to add funds' }, { status: 500 });
  }
}
