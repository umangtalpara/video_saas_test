'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  approveProjectScript,
  fetchProject,
  generateProjectScript,
  updateProjectScript,
} from '../../../../lib/api/projects';
import { UpdateSceneItemInput, VideoProject } from '../../../../types/projects';

export default function EditScriptPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.['id'] as string) || '';

  const [project, setProject] = useState<VideoProject | null>(null);
  const [scenes, setScenes] = useState<UpdateSceneItemInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      if (!projectId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProject(projectId);
        setProject(data);

        if (data.scenes && data.scenes.length > 0) {
          setScenes(
            data.scenes.map((s) => ({
              sceneNumber: s.sceneNumber,
              narration: s.narration,
              visualPrompt: s.visualPrompt,
              negativePrompt: s.negativePrompt || '',
              plannedDurationSeconds: s.plannedDurationSeconds || 5,
              continuityNotes: s.continuityNotes || '',
              transition: s.transition || 'none',
            })),
          );
        } else {
          // If no scenes yet, auto trigger script generation
          const updated = await generateProjectScript(projectId);
          setProject(updated);
          if (updated.scenes) {
            setScenes(
              updated.scenes.map((s) => ({
                sceneNumber: s.sceneNumber,
                narration: s.narration,
                visualPrompt: s.visualPrompt,
                negativePrompt: s.negativePrompt || '',
                plannedDurationSeconds: s.plannedDurationSeconds || 5,
                continuityNotes: s.continuityNotes || '',
                transition: s.transition || 'none',
              })),
            );
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load project script',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [projectId]);

  const totalCalculatedDuration = useMemo(() => {
    return scenes.reduce((acc, s) => acc + (s.plannedDurationSeconds || 0), 0);
  }, [scenes]);

  const handleSceneChange = (
    index: number,
    field: keyof UpdateSceneItemInput,
    value: string | number,
  ) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, [field]: value };
      return copy;
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setScenes((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1]!;
      copy[index - 1] = copy[index]!;
      copy[index] = temp;
      return copy.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === scenes.length - 1) return;
    setScenes((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1]!;
      copy[index + 1] = copy[index]!;
      copy[index] = temp;
      return copy.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    });
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) {
      alert('Video project must have at least one scene');
      return;
    }
    setScenes((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    });
  };

  const handleAddScene = () => {
    setScenes((prev) => [
      ...prev,
      {
        sceneNumber: prev.length + 1,
        narration: 'New scene narration...',
        visualPrompt: 'Cinematic visual description...',
        negativePrompt: 'blurry, low quality, distorted',
        plannedDurationSeconds: 5,
        continuityNotes: 'Smooth transition from previous scene',
        transition: 'none',
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateProjectScript(projectId, scenes);
      setProject(updated);
      setToast({ type: 'success', message: 'Script changes saved successfully' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save script');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      setError(null);
      await updateProjectScript(projectId, scenes);
      const updated = await approveProjectScript(projectId);
      setProject(updated);
      setToast({
        type: 'success',
        message: 'Script approved! Video generation queued.',
      });
      setTimeout(() => {
        router.push(`/videos/${projectId}`);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve script');
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading project script and scene planner...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Script Review & Scene Planner
          </span>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {project?.title || 'Video Script'}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Total Duration: <span className="font-semibold">{totalCalculatedDuration}s</span> (Target: {project?.targetDurationSeconds}s) • {scenes.length} Scenes • Aspect {project?.aspectRatio}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddScene}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            + Add Scene
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {saving ? 'Saving...' : 'Save Script'}
          </button>
          <button
            type="button"
            disabled={approving || scenes.length === 0}
            onClick={() => void handleApprove()}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
          >
            {approving ? 'Approving...' : 'Approve & Queue Video 🚀'}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`mt-6 rounded-lg p-3 text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Scenes List */}
      <div className="mt-8 space-y-5">
        {scenes.map((scene, index) => (
          <div
            key={scene.sceneNumber}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {scene.sceneNumber}
                </span>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Scene {scene.sceneNumber}
                </span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {scene.plannedDurationSeconds}s
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  title="Move scene up"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ▲
                </button>
                <button
                  type="button"
                  title="Move scene down"
                  disabled={index === scenes.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ▼
                </button>
                <button
                  type="button"
                  title="Delete scene"
                  onClick={() => handleDeleteScene(index)}
                  className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  🎙️ Narration / Voiceover Script
                </label>
                <textarea
                  rows={2}
                  value={scene.narration}
                  onChange={(e) =>
                    handleSceneChange(index, 'narration', e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5 text-xs shadow-sm focus:border-primary focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/40 dark:focus:bg-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  🎬 Visual Prompt (Sent to AI Video Engine)
                </label>
                <textarea
                  rows={3}
                  value={scene.visualPrompt}
                  onChange={(e) =>
                    handleSceneChange(index, 'visualPrompt', e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5 font-mono text-xs shadow-sm focus:border-primary focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/40 dark:focus:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={scene.plannedDurationSeconds}
                    onChange={(e) =>
                      handleSceneChange(
                        index,
                        'plannedDurationSeconds',
                        Number(e.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Scene Transition
                  </label>
                  <select
                    value={scene.transition}
                    onChange={(e) =>
                      handleSceneChange(index, 'transition', e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <option value="none">Cut (None)</option>
                    <option value="fade">Fade through black</option>
                    <option value="dissolve">Cross Dissolve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={scene.negativePrompt}
                    onChange={(e) =>
                      handleSceneChange(index, 'negativePrompt', e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
