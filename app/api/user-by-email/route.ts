import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'email query param is required' }, { status: 400 });
    }
    const q = query(collection(db, 'users'), where('email', '==', email.trim()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return NextResponse.json({ error: 'User not found', userId: null });
    }
    const userId = snapshot.docs[0].id;
    return NextResponse.json({ userId });
  } catch (error) {
    console.error('Error looking up user by email:', error);
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
  }
}
