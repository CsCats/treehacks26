import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

// GET /api/profile?userId=xxx — get profile + stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = userDoc.data();

    // Build stats based on role
    if (profile.role === 'contributor') {
      const subsQuery = query(
        collection(db, 'submissions'),
        where('contributorId', '==', userId)
      );
      const subsSnap = await getDocs(subsQuery);
      const submissions = subsSnap.docs.map(d => d.data());

      const approved = submissions.filter(s => s.status === 'approved').length;
      const pending = submissions.filter(s => s.status === 'pending').length;
      const rejected = submissions.filter(s => s.status === 'rejected').length;

      // Count unique tasks
      const taskIds = new Set(submissions.map(s => s.taskId));

      // Count unique businesses
      const businessIds = new Set(submissions.map(s => s.businessId).filter(Boolean));

      // Calculate earnings from transactions
      let totalEarned = 0;
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId)
        );
        const txSnap = await getDocs(txQuery);
        for (const t of txSnap.docs) {
          const data = t.data();
          if (data.type === 'earning') {
            totalEarned += data.amount || 0;
          }
        }
      } catch {
        totalEarned = profile.balance || 0;
      }

      return NextResponse.json({
        profile: {
          uid: userId,
          email: profile.email,
          displayName: profile.displayName || '',
          role: profile.role,
          balance: profile.balance || 0,
          createdAt: profile.createdAt,
        },
        stats: {
          totalSubmissions: submissions.length,
          approved,
          pending,
          rejected,
          approvalRate: submissions.length > 0 ? Math.round((approved / submissions.length) * 100) : 0,
          uniqueTasks: taskIds.size,
          uniqueBusinesses: businessIds.size,
          totalEarned,
        },
      });
    } else {
      // Business stats
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('businessId', '==', userId)
      );
      const tasksSnap = await getDocs(tasksQuery);

      const subsQuery = query(
        collection(db, 'submissions'),
        where('businessId', '==', userId)
      );
      const subsSnap = await getDocs(subsQuery);
      const submissions = subsSnap.docs.map(d => d.data());

      const approved = submissions.filter(s => s.status === 'approved').length;
      const pending = submissions.filter(s => s.status === 'pending').length;
      const rejected = submissions.filter(s => s.status === 'rejected').length;

      const contributorIds = new Set(submissions.map(s => s.contributorId).filter(Boolean));

      let totalPaidOut = 0;
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId)
        );
        const txSnap = await getDocs(txQuery);
        for (const t of txSnap.docs) {
          const data = t.data();
          if (data.type === 'payout') {
            totalPaidOut += Math.abs(data.amount || 0);
          }
        }
      } catch {
        // ignore
      }

      return NextResponse.json({
        profile: {
          uid: userId,
          email: profile.email,
          displayName: profile.displayName || '',
          role: profile.role,
          balance: profile.balance || 0,
          createdAt: profile.createdAt,
        },
        stats: {
          totalTasks: tasksSnap.size,
          totalSubmissions: submissions.length,
          approved,
          pending,
          rejected,
          uniqueContributors: contributorIds.size,
          totalPaidOut,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH /api/profile — update display name
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName } = body;

    if (!userId || displayName === undefined) {
      return NextResponse.json(
        { error: 'userId and displayName are required' },
        { status: 400 }
      );
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { displayName: displayName.trim() });

    return NextResponse.json({ success: true, displayName: displayName.trim() });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
