'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface Task {
  id: string;
  title: string;
}

interface ApiEndpoint {
  id: string;
  name: string;
  taskId: string;
  apiKey: string;
  includeVideo: boolean;
  includePose: boolean;
  includeMetadata: boolean;
  statusFilter: string;
  createdAt?: { seconds: number };
}

export default function DeveloperPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [includeVideo, setIncludeVideo] = useState(true);
  const [includePose, setIncludePose] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [statusFilter, setStatusFilter] = useState('approved');
  const [creating, setCreating] = useState(false);

  // Test panel
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'business')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'business') {
      fetchData();
    }
  }, [user, profile, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [endpointsRes, tasksRes] = await Promise.all([
        fetch(`/api/developer?businessId=${user.uid}`),
        fetch(`/api/tasks?businessId=${user.uid}`),
      ]);
      const endpointsData = await endpointsRes.json();
      const tasksData = await tasksRes.json();
      if (Array.isArray(endpointsData)) setEndpoints(endpointsData);
      if (Array.isArray(tasksData)) setTasks(tasksData);
    } catch (err) {
      console.error('Failed to fetch developer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTaskId || !user) return;
    setCreating(true);
    try {
      const res = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: user.uid,
          name: newName,
          taskId: newTaskId,
          includeVideo,
          includePose,
          includeMetadata,
          statusFilter,
        }),
      });
      if (res.ok) {
        setNewName('');
        setNewTaskId('');
        setIncludeVideo(true);
        setIncludePose(true);
        setIncludeMetadata(true);
        setStatusFilter('approved');
        setShowCreate(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create endpoint:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteEndpoint = async (endpointId: string) => {
    if (!confirm('Delete this API endpoint? This cannot be undone.')) return;
    try {
      await fetch('/api/developer', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId }),
      });
      setEndpoints(prev => prev.filter(e => e.id !== endpointId));
      if (testingEndpoint === endpointId) {
        setTestingEndpoint(null);
        setTestResponse(null);
      }
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const testEndpoint = async (apiKey: string, endpointId: string) => {
    setTestingEndpoint(endpointId);
    setTestResponse(null);
    setTestLoading(true);
    try {
      const res = await fetch(`/api/developer/${apiKey}`);
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResponse(JSON.stringify({ error: 'Request failed' }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Developer Integration</h1>
            <p className="text-zinc-400">
              Create API endpoints to programmatically access your training data
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
          >
            {showCreate ? 'Cancel' : '+ New Endpoint'}
          </button>
        </div>

        {/* Create Endpoint Form */}
        {showCreate && (
          <form
            onSubmit={createEndpoint}
            className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
          >
            <h2 className="mb-4 text-lg font-semibold">Create New API Endpoint</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Endpoint Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Production Data Feed"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Task
                </label>
                {tasks.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No tasks found. Create a task in the Dashboard first.
                  </p>
                ) : (
                  <select
                    value={newTaskId}
                    onChange={e => setNewTaskId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a task...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">
                  Submission Status Filter
                </label>
                <div className="flex gap-2">
                  {['approved', 'pending', 'all'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-lg border px-4 py-1.5 text-sm font-medium capitalize transition ${
                        statusFilter === s
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">
                  Include in Response
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'Video URLs', value: includeVideo, setter: setIncludeVideo },
                    { label: 'Pose Data', value: includePose, setter: setIncludePose },
                    { label: 'Metadata', value: includeMetadata, setter: setIncludeMetadata },
                  ].map(opt => (
                    <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={opt.value}
                        onChange={e => opt.setter(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-zinc-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !newName || !newTaskId}
                className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Endpoint'}
              </button>
            </div>
          </form>
        )}

        {/* Endpoints List */}
        {endpoints.length === 0 && !showCreate ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <div className="mb-3 text-4xl">🔌</div>
            <p className="text-zinc-400">No API endpoints yet.</p>
            <p className="mt-1 text-sm text-zinc-600">
              Create an endpoint to start accessing your training data programmatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map(ep => {
              const taskName = tasks.find(t => t.id === ep.taskId)?.title || ep.taskId;
              const endpointUrl = `${getBaseUrl()}/api/developer/${ep.apiKey}`;

              return (
                <div
                  key={ep.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{ep.name}</h3>
                          <span className="rounded-full bg-purple-600/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                            {taskName}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            ep.statusFilter === 'approved'
                              ? 'bg-green-500/10 text-green-400'
                              : ep.statusFilter === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-zinc-700 text-zinc-300'
                          }`}>
                            {ep.statusFilter}
                          </span>
                        </div>

                        {/* Endpoint URL */}
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-medium text-zinc-500">
                            ENDPOINT URL
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono">
                              <span className="text-green-400">GET</span>{' '}
                              {endpointUrl}
                            </code>
                            <button
                              onClick={() => copyToClipboard(endpointUrl, `url-${ep.id}`)}
                              className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white"
                            >
                              {copiedId === `url-${ep.id}` ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {/* API Key */}
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-medium text-zinc-500">
                            API KEY
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono">
                              {ep.apiKey}
                            </code>
                            <button
                              onClick={() => copyToClipboard(ep.apiKey, `key-${ep.id}`)}
                              className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white"
                            >
                              {copiedId === `key-${ep.id}` ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {/* Config badges */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ep.includeVideo && (
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Video URLs</span>
                          )}
                          {ep.includePose && (
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Pose Data</span>
                          )}
                          {ep.includeMetadata && (
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Metadata</span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => testEndpoint(ep.apiKey, ep.id)}
                          className="rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/30"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => deleteEndpoint(ep.id)}
                          className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Usage Example */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-400">
                        Usage Examples
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="mb-1 block text-xs text-zinc-600">cURL</label>
                          <div className="flex items-start gap-2">
                            <pre className="flex-1 overflow-x-auto rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 font-mono">
{`curl "${endpointUrl}"`}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(`curl "${endpointUrl}"`, `curl-${ep.id}`)}
                              className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-500 hover:text-white"
                            >
                              {copiedId === `curl-${ep.id}` ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-600">Python</label>
                          <div className="flex items-start gap-2">
                            <pre className="flex-1 overflow-x-auto rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 font-mono">
{`import requests

response = requests.get("${endpointUrl}")
data = response.json()
print(f"Got {data['count']} submissions")
for sub in data['submissions']:
    print(sub['id'], sub.get('videoUrl', ''))`}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(
                                `import requests\n\nresponse = requests.get("${endpointUrl}")\ndata = response.json()\nprint(f"Got {data['count']} submissions")\nfor sub in data['submissions']:\n    print(sub['id'], sub.get('videoUrl', ''))`,
                                `python-${ep.id}`
                              )}
                              className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-500 hover:text-white"
                            >
                              {copiedId === `python-${ep.id}` ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-600">JavaScript</label>
                          <div className="flex items-start gap-2">
                            <pre className="flex-1 overflow-x-auto rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 font-mono">
{`const res = await fetch("${endpointUrl}");
const data = await res.json();
console.log(\`Got \${data.count} submissions\`);
data.submissions.forEach(sub => {
  console.log(sub.id, sub.videoUrl);
});`}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(
                                `const res = await fetch("${endpointUrl}");\nconst data = await res.json();\nconsole.log(\`Got \${data.count} submissions\`);\ndata.submissions.forEach(sub => {\n  console.log(sub.id, sub.videoUrl);\n});`,
                                `js-${ep.id}`
                              )}
                              className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-500 hover:text-white"
                            >
                              {copiedId === `js-${ep.id}` ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Test Response Panel */}
                  {testingEndpoint === ep.id && (
                    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-500">RESPONSE</span>
                        <button
                          onClick={() => { setTestingEndpoint(null); setTestResponse(null); }}
                          className="text-xs text-zinc-600 hover:text-zinc-400"
                        >
                          Close
                        </button>
                      </div>
                      {testLoading ? (
                        <div className="flex items-center gap-2 py-4">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-400" />
                          <span className="text-sm text-zinc-500">Fetching...</span>
                        </div>
                      ) : (
                        <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-300 font-mono">
                          {testResponse}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
