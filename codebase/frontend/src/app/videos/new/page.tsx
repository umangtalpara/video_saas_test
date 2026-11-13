'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, generateProjectScript } from '../../../lib/api/projects';
import { fetchProviders, fetchProviderModels } from '../../../lib/api/providers';
import { fetchProviderConnections } from '../../../lib/api/provider-connections';
import { AspectRatio } from '../../../types/projects';
import { Provider, ProviderModel } from '../../../types/providers';
import { ProviderConnection } from '../../../types/provider-connections';

const STYLES = [
  { id: 'cinematic', label: 'Cinematic', desc: 'Dramatic lighting, anamorphic lens, 8k quality' },
  { id: 'realistic', label: 'Photorealistic', desc: 'Natural daylight, lifelike textures and skin tones' },
  { id: 'anime', label: 'Anime / Manga', desc: 'Vibrant hand-drawn aesthetic and dynamic motion' },
  { id: '3d_render', label: '3D CGI Render', desc: 'Octane render, Pixar-style animation and materials' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Holograms, dark rainy streets and glowing neon signs' },
];

export default function VideoCreationWizardPage(): React.JSX.Element {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [language, setLanguage] = useState('en');

  // Providers & Connections
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('runway');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gen-3-alpha-turbo');

  useEffect(() => {
    async function loadEngines() {
      try {
        setInitLoading(true);
        const [provList, connList] = await Promise.all([
          fetchProviders(),
          fetchProviderConnections(),
        ]);
        setProviders(provList);
        setConnections(connList);

        if (provList.length > 0) {
          const firstProv = provList[0]!;
          setSelectedProviderId(firstProv.providerId);
          const models = await fetchProviderModels(firstProv.providerId);
          setAvailableModels(models);
          if (models.length > 0 && models[0]) {
            setSelectedModelId(models[0].modelId);
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load video providers',
        );
      } finally {
        setInitLoading(false);
      }
    }

    void loadEngines();
  }, []);

  const handleProviderChange = async (providerId: string) => {
    setSelectedProviderId(providerId);
    try {
      const models = await fetchProviderModels(providerId);
      setAvailableModels(models);
      if (models.length > 0 && models[0]) {
        setSelectedModelId(models[0].modelId);
      }
    } catch {
      setAvailableModels([]);
    }
  };

  const selectedProvider = providers.find((p) => p.providerId === selectedProviderId);
  const isPaidOrUnknown =
    selectedProvider?.billingClassification === 'paid' ||
    selectedProvider?.billingClassification === 'unknown';

  const handleCreateAndPlan = async () => {
    if (!prompt.trim()) {
      setError('Please provide a prompt for your video idea');
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const project = await createProject({
        title: title.trim() || undefined,
        prompt: prompt.trim(),
        targetDurationSeconds: targetDuration,
        aspectRatio,
        language,
        style,
        providerId: selectedProviderId,
        providerConnectionId: selectedConnectionId || undefined,
        modelId: selectedModelId,
      });

      // Generate initial script plan
      await generateProjectScript(project.id);

      // Navigate to Script Review screen
      router.push(`/videos/${project.id}/edit-script`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate video script plan',
      );
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading video creation wizard...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Stepper Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Create New AI Video
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Step {step} of 4: {step === 1 ? 'Concept & Style' : step === 2 ? 'Format & Length' : step === 3 ? 'AI Engine & Key' : 'Review & Generate Script'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-800'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Prompt & Style */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Project Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Deep Ocean Mysteries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Video Concept / Idea Prompt *
            </label>
            <textarea
              rows={4}
              placeholder="Describe your story or video in detail... e.g. A serene aerial drone flight through misty redwood forests at dawn, tracking a herd of wild elk through golden light rays."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Visual Style
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStyle(st.id)}
                  className={`flex flex-col text-left rounded-xl border p-3 transition ${
                    style === st.id
                      ? 'border-primary bg-primary/5 shadow-sm dark:bg-primary/10'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {st.label}
                  </span>
                  <span className="mt-0.5 text-[11px] text-neutral-500">
                    {st.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Format & Duration */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Target Duration
            </label>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {[30, 60, 90, 120].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setTargetDuration(dur)}
                  className={`rounded-xl border py-3 text-center transition ${
                    targetDuration === dur
                      ? 'border-primary bg-primary/5 font-semibold text-primary dark:bg-primary/10'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <span className="text-base">{dur}s</span>
                  <span className="block text-[10px] text-neutral-500">
                    {dur / 5} scenes
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Aspect Ratio
            </label>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {[
                { ratio: '9:16' as AspectRatio, label: '9:16 Portrait', desc: 'Reels, Shorts, TikTok' },
                { ratio: '16:9' as AspectRatio, label: '16:9 Landscape', desc: 'YouTube, Web, Desktop' },
                { ratio: '1:1' as AspectRatio, label: '1:1 Square', desc: 'Instagram, Feeds' },
              ].map((item) => (
                <button
                  key={item.ratio}
                  type="button"
                  onClick={() => setAspectRatio(item.ratio)}
                  className={`rounded-xl border p-3 text-left transition ${
                    aspectRatio === item.ratio
                      ? 'border-primary bg-primary/5 font-semibold text-primary dark:bg-primary/10'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className="block text-[10px] text-neutral-500">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Narration Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="hi">Hindi</option>
              <option value="gu">Gujarati</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Engine & Provider Key */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Video Generation Provider
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => void handleProviderChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {providers.map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.displayName} ({p.billingClassification.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          {isPaidOrUnknown && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <span className="font-semibold">⚠️ Notice:</span> This provider is classified as{' '}
              <span className="font-semibold uppercase">{selectedProvider?.billingClassification}</span>.
              Please verify you have appropriate API credits in your provider console.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Provider Model
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.displayName} ({m.minDurationSeconds}s-{m.maxDurationSeconds}s per clip)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Connected BYOK Key (Optional)
              </label>
              <a
                href="/settings/providers"
                target="_blank"
                className="text-[11px] text-primary hover:underline"
              >
                + Add New Key
              </a>
            </div>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">Default Provider Key</option>
              {connections
                .filter((c) => c.providerId === selectedProviderId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.maskedKey})
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 4: Summary & Generate Script */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Configuration Summary
            </h3>
            <div className="mt-3 divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Prompt:</span>
                <span className="max-w-md text-right font-medium text-neutral-800 dark:text-neutral-200">
                  {prompt}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Target Duration:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {targetDuration} seconds ({targetDuration / 5} scenes)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Aspect Ratio:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {aspectRatio}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Visual Style:</span>
                <span className="font-medium capitalize text-neutral-800 dark:text-neutral-200">
                  {style}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Provider & Model:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {selectedProvider?.displayName} ({selectedModelId})
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 p-4 text-xs text-primary dark:bg-primary/10">
            ✨ Clicking &quot;Generate Video Script&quot; will parse your concept into structured cinematic scenes, narration text, and camera cues ready for your review and approval.
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={loading}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !prompt.trim()) {
                setError('Please provide a prompt for your video idea');
                return;
              }
              setError(null);
              setStep(step + 1);
            }}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow hover:opacity-90"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleCreateAndPlan()}
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Generating Script Plan...' : 'Generate Video Script 🎬'}
          </button>
        )}
      </div>
    </div>
  );
}

