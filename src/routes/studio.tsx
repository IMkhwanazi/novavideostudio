import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  ASPECT_RATIOS,
  CAMERA_MOVES,
  DEFAULT_SETTINGS,
  DURATIONS,
  FPS_OPTIONS,
  LIGHTING_SETUPS,
  MODEL_TIERS,
  RESOLUTIONS,
  VISUAL_STYLES,
  estimateCredits,
  type VideoSettings,
} from "@/lib/video/options";
import {
  cancelGeneration,
  createGeneration,
  enhancePrompt,
  getStudioState,
  pollGeneration,
} from "@/lib/video/video.functions";

const title = "Studio — Videonova AI";
const description = "Generate cinematic AI video from text and images in the Videonova AI studio.";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type JobView = Awaited<ReturnType<typeof pollGeneration>>;

function Studio() {
  const queryClient = useQueryClient();
  const { isAuthenticated, loading } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [activeJob, setActiveJob] = useState<JobView | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchState = useServerFn(getStudioState);
  const runEnhance = useServerFn(enhancePrompt);
  const runCreate = useServerFn(createGeneration);
  const runPoll = useServerFn(pollGeneration);
  const runCancel = useServerFn(cancelGeneration);

  const state = useQuery({
    queryKey: ["studio-state"],
    queryFn: () => fetchState({}),
    enabled: isAuthenticated,
  });

  const credits = estimateCredits(settings);
  const busy = activeJob !== null && !["completed", "failed", "cancelled"].includes(activeJob.status);

  useEffect(() => {
    if (!activeJob || !busy) return;
    pollRef.current = setTimeout(async () => {
      try {
        const next = await runPoll({ data: { jobId: activeJob.id } });
        setActiveJob(next);
        if (["completed", "failed", "cancelled"].includes(next.status)) {
          queryClient.invalidateQueries({ queryKey: ["studio-state"] });
          if (next.status === "completed") toast.success("Your video is ready.");
          if (next.status === "failed") toast.error(next.errorMessage ?? "Generation failed.");
        }
      } catch (error) {
        console.error(error);
      }
    }, 6000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [activeJob, busy, runPoll, queryClient]);

  const enhance = useMutation({
    mutationFn: () => runEnhance({ data: { prompt, settings } }),
    onSuccess: (result) => {
      setPrompt(result.prompt);
      toast.success("Prompt enhanced.");
    },
    onError: () => toast.error("Couldn't enhance that prompt right now."),
  });

  const generate = useMutation({
    mutationFn: () =>
      runCreate({ data: { mode: "text_to_video" as const, prompt, settings } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setActiveJob(result.job);
      queryClient.invalidateQueries({ queryKey: ["studio-state"] });
    },
    onError: () => toast.error("Couldn't start that generation."),
  });

  async function onCancel() {
    if (!activeJob) return;
    const next = await runCancel({ data: { jobId: activeJob.id } });
    setActiveJob(next);
    queryClient.invalidateQueries({ queryKey: ["studio-state"] });
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
              {state.data?.credits ?? 0} credits
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 lg:grid-cols-[380px_1fr]">
        <section className="glass-panel space-y-5 rounded-2xl p-6">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Slow dolly through a rain-soaked neon alley at night, anamorphic flare, shallow depth of field..."
              className="mt-2 resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={prompt.trim().length < 6 || enhance.isPending}
              onClick={() => enhance.mutate()}
            >
              {enhance.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Wand2 className="mr-1.5 size-4" /> Enhance prompt
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration">
              <Select
                value={String(settings.durationSeconds)}
                onValueChange={(value) => setSettings((s) => ({ ...s, durationSeconds: Number(value) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}s</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Aspect ratio">
              <Select
                value={settings.aspectRatio}
                onValueChange={(value) => setSettings((s) => ({ ...s, aspectRatio: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Resolution">
              <Select
                value={settings.resolution}
                onValueChange={(value) => setSettings((s) => ({ ...s, resolution: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Frame rate">
              <Select
                value={String(settings.fps)}
                onValueChange={(value) => setSettings((s) => ({ ...s, fps: Number(value) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((f) => (
                    <SelectItem key={f} value={String(f)}>{f} fps</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Style">
              <Select value={settings.style} onValueChange={(value) => setSettings((s) => ({ ...s, style: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Camera">
              <Select value={settings.camera} onValueChange={(value) => setSettings((s) => ({ ...s, camera: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMERA_MOVES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lighting">
              <Select
                value={settings.lighting}
                onValueChange={(value) => setSettings((s) => ({ ...s, lighting: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIGHTING_SETUPS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Model">
              <Select
                value={settings.modelTier}
                onValueChange={(value) =>
                  setSettings((s) => ({ ...s, modelTier: value as VideoSettings["modelTier"] }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_TIERS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Estimated cost</span>
            <span className="font-medium">{credits} credits</span>
          </div>

          <Button
            className="h-11 w-full bg-gradient-brand text-primary-foreground glow-ring"
            disabled={prompt.trim().length < 6 || generate.isPending || busy}
            onClick={() => generate.mutate()}
          >
            {generate.isPending || busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-1.5 size-4" /> Generate video
              </>
            )}
          </Button>
        </section>

        <section className="space-y-5">
          <div className="glass-panel flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-6">
            {activeJob?.status === "completed" && activeJob.videoUrl ? (
              <div className="w-full">
                <video
                  src={activeJob.videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl border border-border/60 bg-black"
                />
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <a href={activeJob.videoUrl} download>
                    <Download className="mr-1.5 size-4" /> Download MP4
                  </a>
                </Button>
              </div>
            ) : busy ? (
              <div className="w-full max-w-md text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                <p className="mt-4 text-sm text-foreground">{activeJob?.stageMessage}</p>
                <Progress value={activeJob?.progress ?? 0} className="mt-4" />
                <Button variant="ghost" size="sm" className="mt-4" onClick={onCancel}>
                  <X className="mr-1.5 size-4" /> Cancel
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {activeJob?.errorMessage ?? "Your generated video will appear here."}
                </p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm font-medium">Recent generations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(state.data?.history ?? []).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveJob(item)}
                  className="rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:border-primary/40"
                >
                  <p className="line-clamp-2 text-xs text-foreground/90">{item.prompt}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {item.status}
                  </p>
                </button>
              ))}
              {(state.data?.history ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}