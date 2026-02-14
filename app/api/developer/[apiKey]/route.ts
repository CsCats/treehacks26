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

// GET /api/developer/:apiKey — public endpoint that returns task data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
) {
  try {
    const { apiKey } = await params;

    // Look up the endpoint config by API key
    const q = query(
      collection(db, 'apiEndpoints'),
      where('apiKey', '==', apiKey)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const endpointConfig = snapshot.docs[0].data();

    // Get the task info
    const taskDoc = await getDoc(doc(db, 'tasks', endpointConfig.taskId));
    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    const task = { id: taskDoc.id, ...taskDoc.data() };

    // Get submissions for this task, filtered by status
    let subsQuery;
    if (endpointConfig.statusFilter && endpointConfig.statusFilter !== 'all') {
      subsQuery = query(
        collection(db, 'submissions'),
        where('taskId', '==', endpointConfig.taskId),
        where('status', '==', endpointConfig.statusFilter)
      );
    } else {
      subsQuery = query(
        collection(db, 'submissions'),
        where('taskId', '==', endpointConfig.taskId)
      );
    }

    const subsSnapshot = await getDocs(subsQuery);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissions = subsSnapshot.docs.map(d => {
      const data = d.data();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = { id: d.id };

      if (endpointConfig.includeMetadata) {
        result.taskId = data.taskId;
        result.contributorId = data.contributorId || null;
        result.contributorName = data.contributorName || null;
        result.status = data.status || 'pending';
        result.createdAt = data.createdAt || null;
      }

      if (endpointConfig.includeVideo) {
        result.videoUrl = data.videoUrl || null;
      }

      if (endpointConfig.includePose) {
        result.poseUrl = data.poseUrl || null;
        result.poseData = data.poseData || null;
      }

      return result;
    });

    return NextResponse.json({
      endpoint: endpointConfig.name,
      task: {
        id: task.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (task as any).title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (task as any).description,
      },
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error('Error fetching endpoint data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
