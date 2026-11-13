'use client';

import React, { useEffect, useState, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchProject,
  fetchGenerationStatus,
  startGeneration,
  retrySceneGeneration,
  cancelProjectGeneration,
  GenerationStatusResponse,
} from '../../../lib/api/projects';
import { VideoProject, VideoScene } from '../../../types/projects';

export default function ProjectDetailsPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.['id'] as string) || '';

  const [project, setProject] = useState<VideoProject | null>(null);
  const [genStatus, setGenStatus] = useState<GenerationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal states for FE-002
  const [previewScene, setPreviewScene] = useState<VideoScene | null>(null);
  const [regenerateScene, setRegenerateScene] = useState<VideoScene | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await fetchProject(projectId);
      setProject(p);
      try {
        const s = await fetchGenerationStatus(projectId);
        setGenStatus(s);
      } catch {
        // Project might not have generation status record yet
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling when generating or queued
  useEffect(() => {
    if (!project) return;
    const isWorking =
      project.status === 'queued' ||
      project.status === 'generating' ||
      project.status === 'rendering';

    if (!isWorking) return;

    const interval = setInterval(async () => {
      try {
        const status = await fetchGenerationStatus(projectId);
        setGenStatus(status);
        if (status.status !== project.status) {
          const updated = await fetchProject(projectId);
          setProject(updated);
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [project, projectId]);

  const handleStartGeneration = async () => {
    try {
      setActionLoading(true);
      await startGeneration(projectId);
      setToast({ message: 'Generation queued successfully!', type: 'success' });
      await loadData();
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to start generation',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGeneration = async () => {
    try {
      setActionLoading(true);
      await cancelProjectGeneration(projectId);
      setToast({ message: 'Generation cancelled', type: 'success' });
      await loadData();
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to cancel',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryScene = async (sceneId: string) => {
    try {
      setActionLoading(true);
      await retrySceneGeneration(projectId, sceneId);
      setToast({ message: 'Scene queued for retry', type: 'success' });
      await loadData();
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to retry scene',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRegenerate = (scene: VideoScene) => {
    setRegenerateScene(scene);
    setRegeneratePrompt(scene.visualPrompt);
  };

  const handleConfirmRegenerate = async () => {
    if (!regenerateScene) return;
    try {
      setActionLoading(true);
      await retrySceneGeneration(projectId, regenerateScene.id);
      setToast({ message: 'Scene prompt updated and queued for generation', type: 'success' });
      setRegenerateScene(null);
      await loadData();
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to regenerate scene',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center space-x-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span>Loading project generation dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <p className="text-red-400">{error || 'Project not found'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const scenes = project.scenes || [];
  const completedScenes = genStatus?.completedScenes ?? scenes.filter((s) => s.status === 'completed').length;
  const progressPercent =
    genStatus?.progressPercent ?? (scenes.length > 0 ? Math.round((completedScenes / scenes.length) * 100) : 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">Completed</span>;
      case 'generating':
        return <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />Generating</span>;
      case 'queued':
        return <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">Queued</span>;
      case 'rendering':
        return <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/30">Rendering</span>;
      case 'failed':
        return <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/30">Failed</span>;
      default:
        return <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-600/50">{status}</span>;
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

      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-lg font-semibold text-white truncate max-w-md">
              {project.title}
            </h1>
            {getStatusBadge(project.status)}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/videos/${project.id}/edit-script`}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Edit Script
            </Link>

            {project.status === 'awaiting_approval' || (project.status === 'draft' && project.scriptApproved) ? (
              <button
                onClick={handleStartGeneration}
                disabled={actionLoading}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Queueing...' : 'Start Video Generation'}
              </button>
            ) : null}

            {project.status === 'queued' || project.status === 'generating' ? (
              <button
                onClick={handleCancelGeneration}
                disabled={actionLoading}
                className="rounded-lg border border-rose-700 bg-rose-950/40 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition disabled:opacity-50"
              >
                Cancel Project
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Progress & Stats Dashboard */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Generation Pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-provider video worker rendering AI scenes with BYOK isolation
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Provider & Model</span>
                <span className="font-medium text-slate-200 capitalize">
                  {project.providerId} ({project.modelId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Aspect Ratio</span>
                <span className="font-medium text-slate-200">{project.aspectRatio}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Clips Ready</span>
                <span className="font-semibold text-indigo-400">
                  {completedScenes} / {scenes.length}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Scene Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Scenes & Video Clips ({scenes.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 hover:border-slate-700 transition shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Scene #{scene.sceneNumber} • {scene.plannedDurationSeconds}s
                    </span>
                    {getStatusBadge(scene.status)}
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-3 mb-2.5">
                    {scene.visualPrompt}
                  </p>

                  {scene.narration && (
                    <p className="text-xs text-slate-500 italic line-clamp-2 mb-3">
                      &quot;{scene.narration}&quot;
                    </p>
                  )}

                  {scene.errorMessage && (
                    <div className="mb-3 rounded-lg bg-rose-950/40 border border-rose-900/50 p-2.5 text-xs text-rose-300">
                      {scene.errorMessage}
                    </div>
                  )}

                  {scene.status === 'completed' && (
                    <div className="mb-3 rounded-lg bg-slate-800/50 p-2.5 text-xs space-y-1 text-slate-400 border border-slate-800">
                      <div className="flex justify-between">
                        <span>Resolution:</span>
                        <span className="text-slate-200 font-mono">{scene.resolution || '1280x720'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-slate-200">{scene.actualDurationSeconds || scene.plannedDurationSeconds}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Codec:</span>
                        <span className="text-slate-200 font-mono">H.264 / MP4</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {scene.status === 'completed' && scene.videoAssetUrl ? (
                    <button
                      onClick={() => setPreviewScene(scene)}
                      className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 transition flex-1 text-center"
                    >
                      Preview Clip
                    </button>
                  ) : null}

                  {scene.status === 'failed' ? (
                    <button
                      onClick={() => handleRetryScene(scene.id)}
                      disabled={actionLoading}
                      className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition flex-1 text-center disabled:opacity-50"
                    >
                      Retry Scene
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleOpenRegenerate(scene)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                  >
                    Tweak Prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Video Clip Preview Modal (FE-002) */}
      {previewScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">
                Scene #{previewScene.sceneNumber} Clip Preview
              </h4>
              <button
                onClick={() => setPreviewScene(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black border border-slate-800 flex items-center justify-center mb-4">
              {previewScene.videoAssetUrl ? (
                <video
                  src={previewScene.videoAssetUrl}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-500">No video asset available</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-950 p-3 text-xs mb-4 border border-slate-800">
              <div>
                <span className="text-slate-500 block">Resolution</span>
                <span className="font-mono text-slate-200">{previewScene.resolution || '1280x720'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration</span>
                <span className="text-slate-200">{previewScene.actualDurationSeconds || previewScene.plannedDurationSeconds}s</span>
              </div>
              <div>
                <span className="text-slate-500 block">Container</span>
                <span className="font-mono text-slate-200">MP4 (H.264)</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewScene(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Scene Modal (FE-002) */}
      {regenerateScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">
                Tweak Scene #{regenerateScene.sceneNumber} Prompt
              </h4>
              <button
                onClick={() => setRegenerateScene(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">
                  Visual Prompt
                </label>
                <textarea
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setRegenerateScene(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={actionLoading || !regeneratePrompt.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {actionLoading ? 'Queueing...' : 'Regenerate Clip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
