import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const businessId = searchParams.get('businessId');

    if (userId) {
      const q = query(
        collection(db, 'follows'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const follows = snapshot.docs.map((d) => {
        const data = d.data();
        return { businessId: data.businessId, businessName: data.businessName || '' };
      });
      return NextResponse.json({ follows });
    }

    if (businessId) {
      const q = query(
        collection(db, 'follows'),
        where('businessId', '==', businessId)
      );
      const snapshot = await getDocs(q);
      const followerIds = snapshot.docs.map((d) => d.data().userId);
      const followers: { userId: string; displayName?: string; email?: string }[] = [];
      for (const uid of followerIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        followers.push({
          userId: uid,
          displayName: userData.displayName,
          email: userData.email,
        });
      }
      return NextResponse.json({ followers });
    }

    return NextResponse.json(
      { error: 'Provide either userId or businessId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, businessId, businessName } = body;
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const existing = await getDocs(
      query(
        collection(db, 'follows'),
        where('userId', '==', userId),
        where('businessId', '==', businessId)
      )
    );
    if (!existing.empty) {
      return NextResponse.json({ followed: true, message: 'Already following' });
    }

    await addDoc(collection(db, 'follows'), {
      userId,
      businessId,
      businessName: businessName || '',
      createdAt: serverTimestamp(),
    });
    return NextResponse.json({ followed: true });
  } catch (error) {
    console.error('Error following:', error);
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, businessId } = body;
    if (!userId || !businessId) {
      return NextResponse.json(
        { error: 'userId and businessId are required' },
        { status: 400 }
      );
    }

    const snapshot = await getDocs(
      query(
        collection(db, 'follows'),
        where('userId', '==', userId),
        where('businessId', '==', businessId)
      )
    );
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'follows', d.id));
    }
    return NextResponse.json({ unfollowed: true });
  } catch (error) {
    console.error('Error unfollowing:', error);
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
  }
}
