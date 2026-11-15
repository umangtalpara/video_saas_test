'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchProjects,
  duplicateProject,
  deleteProject,
  fetchDownloadUrl,
} from '../../lib/api/projects';
import { VideoProject, ProjectStatus } from '../../types/projects';

export default function VideoLibraryPage(): React.JSX.Element {
  const router = useRouter();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters & display mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [duplicateTarget, setDuplicateTarget] = useState<VideoProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoProject | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProjects({ limit: 50 });
      setProjects(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load video projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesSearch =
          searchQuery.trim() === '' ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [projects, statusFilter, searchQuery, sortBy]);

  const handleDownload = async (projectId: string) => {
    try {
      setActionLoading(true);
      const res = await fetchDownloadUrl(projectId);
      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ message: 'Download started!', type: 'success' });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to download video',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget) return;
    try {
      setActionLoading(true);
      const duplicated = await duplicateProject(duplicateTarget.id);
      setToast({ message: `Duplicated "${duplicateTarget.title}"`, type: 'success' });
      setDuplicateTarget(null);
      await loadProjects();
      router.push(`/videos/${duplicated.id}`);
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to duplicate project',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      await deleteProject(deleteTarget.id);
      setToast({ message: `Deleted "${deleteTarget.title}"`, type: 'success' });
      setDeleteTarget(null);
      await loadProjects();
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete project',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">Completed</span>;
      case 'generating':
        return <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 animate-pulse">Generating</span>;
      case 'rendering':
        return <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/30">Rendering</span>;
      case 'queued':
        return <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">Queued</span>;
      case 'failed':
        return <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/30">Failed</span>;
      default:
        return <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-600/50 capitalize">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-xl ${
            toast.type === 'success'
              ? 'bg-emerald-900 border border-emerald-700 text-emerald-100'
              : 'bg-rose-900 border border-rose-700 text-rose-100'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition text-sm"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-lg font-semibold text-white">Video Library</h1>
          </div>

          <Link
            href="/videos/new"
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700 transition"
          >
            + Create New Video
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters and Controls Bar */}
        <section className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              placeholder="Search videos by title or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="generating">Generating</option>
              <option value="rendering">Rendering</option>
              <option value="queued">Queued</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              aria-label="Sort Order"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'video' : 'videos'}
            </span>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Table
            </button>
          </div>
        </section>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-3" />
            <span>Loading library...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center text-red-400">
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
            <p className="text-sm font-medium text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No video projects match the selected filters.'
                : 'No video projects created yet.'}
            </p>
            <Link
              href="/videos/new"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Create Your First Video
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 transition shadow-lg group"
              >
                <div>
                  {/* Thumbnail / Poster Area */}
                  <div className="relative aspect-video w-full bg-slate-950 border-b border-slate-800 flex items-center justify-center overflow-hidden">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={p.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="text-center text-slate-600">
                        <span className="text-2xl block mb-1">🎬</span>
                        <span className="text-xs uppercase tracking-wider font-mono">{p.aspectRatio}</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 right-2.5">
                      {getStatusBadge(p.status)}
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 rounded bg-black/70 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {p.totalDurationSeconds || p.targetDurationSeconds}s • {p.aspectRatio}
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white truncate mb-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {p.prompt}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="capitalize">{p.providerId}</span>
                      <span>•</span>
                      <span>{p.scenesCount || p.scenes?.length || 0} scenes</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center justify-between gap-2">
                  <Link
                    href={`/videos/${p.id}`}
                    className="flex-1 rounded-lg bg-slate-800/80 px-3 py-1.5 text-center text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    Watch / Inspect
                  </Link>

                  {p.status === 'completed' && p.finalVideoUrl ? (
                    <button
                      onClick={() => handleDownload(p.id)}
                      disabled={actionLoading}
                      title="Download Video MP4"
                      className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-600/30 transition disabled:opacity-50"
                    >
                      Download
                    </button>
                  ) : null}

                  <button
                    onClick={() => setDuplicateTarget(p)}
                    title="Duplicate Project"
                    className="rounded-lg border border-slate-700 bg-slate-800/40 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => setDeleteTarget(p)}
                    title="Delete Project"
                    className="rounded-lg border border-rose-900/40 bg-rose-950/20 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-900/40 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Project Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                      <Link href={`/videos/${p.id}`} className="hover:text-indigo-400 transition">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 font-mono">
                      {p.totalDurationSeconds || p.targetDurationSeconds}s ({p.aspectRatio})
                    </td>
                    <td className="px-4 py-3 capitalize">{p.providerId}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/videos/${p.id}`}
                        className="rounded bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700"
                      >
                        Inspect
                      </Link>
                      {p.status === 'completed' && p.finalVideoUrl ? (
                        <button
                          onClick={() => handleDownload(p.id)}
                          className="rounded bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 text-emerald-300 hover:bg-emerald-600/30"
                        >
                          Download
                        </button>
                      ) : null}
                      <button
                        onClick={() => setDuplicateTarget(p)}
                        className="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-slate-300 hover:bg-slate-700"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="rounded border border-rose-900/50 bg-rose-950/20 px-2 py-1 text-rose-400 hover:bg-rose-900/40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Duplicate Project Modal */}
      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-sm font-semibold text-white mb-2">
              Duplicate Video Project
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              Create an editable copy of &quot;{duplicateTarget.title}&quot; with its script and scenes.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDuplicateTarget(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                disabled={actionLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {actionLoading ? 'Duplicating...' : 'Confirm Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/50 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-sm font-semibold text-rose-400 mb-2">
              Delete Video Project
            </h4>
            <p className="text-xs text-slate-300 mb-2">
              Are you sure you want to delete &quot;{deleteTarget.title}&quot;?
            </p>
            <p className="text-[11px] text-rose-400/80 mb-5">
              This will permanently remove the video project, scenes, and all associated media clips from storage.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

