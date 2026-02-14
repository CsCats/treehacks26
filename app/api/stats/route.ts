import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
} from 'firebase/firestore';

// GET /api/stats?businessId=xxx — aggregate stats for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Fetch all tasks for this business
    const tasksQuery = query(collection(db, 'tasks'), where('businessId', '==', businessId));
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch all submissions for this business
    const subsQuery = query(collection(db, 'submissions'), where('businessId', '==', businessId));
    const subsSnap = await getDocs(subsQuery);
    const submissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Build task lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskMap: Record<string, any> = {};
    for (const t of tasks) {
      taskMap[t.id] = t;
    }

    // Aggregate per-contributor stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contributorMap: Record<string, any> = {};
    let totalApproved = 0;
    let totalPending = 0;
    let totalRejected = 0;
    let totalPaidOut = 0;

    for (const sub of submissions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = sub as any;
      const cId = s.contributorId || 'unknown';
      const cName = s.contributorName || 'Unknown';

      if (!contributorMap[cId]) {
        contributorMap[cId] = {
          contributorId: cId,
          contributorName: cName,
          totalSubmissions: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          totalEarned: 0,
        };
      }

      contributorMap[cId].totalSubmissions++;

      if (s.status === 'approved') {
        contributorMap[cId].approved++;
        totalApproved++;
        const task = taskMap[s.taskId];
        const price = task?.pricePerApproval || 0;
        contributorMap[cId].totalEarned += price;
        totalPaidOut += price;
      } else if (s.status === 'rejected') {
        contributorMap[cId].rejected++;
        totalRejected++;
      } else {
        contributorMap[cId].pending++;
        totalPending++;
      }
    }

    // Sort contributors by approved count (descending)
    const topContributors = Object.values(contributorMap)
      .sort((a, b) => b.approved - a.approved);

    // Top earners (by totalEarned)
    const topEarners = [...topContributors]
      .sort((a, b) => b.totalEarned - a.totalEarned);

    // Per-task stats
    const taskStats = tasks.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tData = t as any;
      const taskSubs = submissions.filter((s: any) => s.taskId === t.id);
      const approved = taskSubs.filter((s: any) => s.status === 'approved').length;
      const pending = taskSubs.filter((s: any) => s.status === 'pending').length;
      const rejected = taskSubs.filter((s: any) => s.status === 'rejected').length;
      return {
        taskId: t.id,
        title: tData.title,
        pricePerApproval: tData.pricePerApproval || 0,
        totalSubmissions: taskSubs.length,
        approved,
        pending,
        rejected,
        totalPaid: approved * (tData.pricePerApproval || 0),
      };
    });

    // Submissions over time (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const dailyCounts: Record<string, number> = {};
    for (const sub of submissions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = sub as any;
      if (s.createdAt?.seconds) {
        const ts = s.createdAt.seconds * 1000;
        if (ts >= thirtyDaysAgo) {
          const date = new Date(ts);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dailyCounts[key] = (dailyCounts[key] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      overview: {
        totalTasks: tasks.length,
        totalSubmissions: submissions.length,
        totalApproved,
        totalPending,
        totalRejected,
        totalPaidOut,
        uniqueContributors: Object.keys(contributorMap).length,
      },
      topContributors: topContributors.slice(0, 20),
      topEarners: topEarners.slice(0, 20),
      taskStats,
      dailyCounts,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
