import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  estimateCredits,
  JOB_STAGE_COPY,
  segmentCount,
  type GenerationMode,
  type VideoSettings,
} from "./options";
import { getVideoProvider } from "./registry.server";

type Client = SupabaseClient<Database>;

export type SegmentView = {
  idx: number;
  status: string;
  url: string | null;
  scenePrompt: string;
};

export type JobView = {
  id: string;
  status: string;
  progress: number;
  stageMessage: string;
  errorMessage: string | null;
  videoPath: string | null;
  projectId: string | null;
  videoUrl?: string | null;
  totalSegments: number;
  completedSegments: number;
  merged: boolean;
  segments: SegmentView[];
};

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith("OUT_OF_CREDITS")) {
    return "The video service is temporarily out of capacity. Please try again shortly.";
  }
  if (raw.startsWith("RATE_LIMITED")) {
    return "Too many videos are generating right now. Wait a moment and try again.";
  }
  if (raw.startsWith("PROVIDER_UNCONFIGURED")) {
    return "The selected video provider isn't configured yet. Switch models or contact support.";
  }
  if (raw.startsWith("UNSUPPORTED")) {
    return raw.split(":").slice(1).join(":").trim();
  }
  if (raw.startsWith("PROVIDER_ERROR")) {
    const detail = raw.split(":").slice(1).join(":").trim();
    return detail || "Your video couldn't be generated this time. Try again or adjust your prompt.";
  }
  return "Your video couldn't be generated this time. Try again or adjust your prompt.";
}

async function signedUrl(client: Client, path: string | null) {
  if (!path) return null;
  const { data } = await client.storage.from("videos").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export async function toJobView(client: Client, row: Record<string, unknown>): Promise<JobView> {
  const videoPath = (row["video_path"] as string | null) ?? null;
  const jobId = row["id"] as string;

  const { data: segmentRows } = await client
    .from("generation_segments")
    .select("idx, status, video_path, scene_prompt")
    .eq("job_id", jobId)
    .order("idx", { ascending: true });

  const segments: SegmentView[] = await Promise.all(
    (segmentRows ?? []).map(async (segment) => ({
      idx: segment.idx,
      status: segment.status,
      scenePrompt: segment.scene_prompt,
      url: await signedUrl(client, segment.video_path),
    })),
  );

  return {
    id: jobId,
    status: row["status"] as string,
    progress: (row["progress"] as number) ?? 0,
    stageMessage: (row["stage_message"] as string) ?? "",
    errorMessage: (row["error_message"] as string | null) ?? null,
    videoPath,
    projectId: (row["project_id"] as string | null) ?? null,
    videoUrl: await signedUrl(client, videoPath),
    totalSegments: (row["total_segments"] as number) || segments.length || 1,
    completedSegments: (row["completed_segments"] as number) ?? 0,
    merged: Boolean(row["merged"]),
    segments,
  };
}

function stageForSegments(done: number, total: number) {
  return `Rendering scene ${Math.min(done + 1, total)} of ${total}...`;
}

export async function startGeneration(params: {
  client: Client;
  admin: Client;
  userId: string;
  mode: GenerationMode;
  prompt: string;
  enhancedPrompt?: string | null;
  negativePrompt?: string | null;
  settings: VideoSettings;
  inputImageDataUrl?: string | null;
  projectId?: string | null;
  title?: string | null;
}) {
  const { client, admin, userId, settings } = params;
  const credits = estimateCredits(settings);
  const total = segmentCount(settings.durationSeconds);

  // 1. Project
  let projectId = params.projectId ?? null;
  if (!projectId) {
    const { data, error } = await client
      .from("projects")
      .insert({
        user_id: userId,
        title: params.title?.slice(0, 80) || params.prompt.slice(0, 60) || "Untitled project",
        mode: params.mode,
        aspect_ratio: settings.aspectRatio,
        resolution: settings.resolution,
        fps: settings.fps,
        duration_seconds: settings.durationSeconds,
        status: "generating",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    projectId = data.id;
  } else {
    await client.from("projects").update({ status: "generating" }).eq("id", projectId);
  }

  // 2. Generation record
  const { data: generation, error: generationError } = await client
    .from("generations")
    .insert({
      user_id: userId,
      project_id: projectId,
      mode: params.mode,
      prompt: params.prompt,
      enhanced_prompt: params.enhancedPrompt ?? null,
      negative_prompt: params.negativePrompt ?? null,
      settings: settings as unknown as Database["public"]["Tables"]["generations"]["Row"]["settings"],
      model_tier: settings.modelTier,
      credits_cost: credits,
    })
    .select("id")
    .single();
  if (generationError) throw new Error(generationError.message);

  // 3. Reserve credits atomically (throws when the balance is too low)
  const { error: spendError } = await admin.rpc("spend_credits", {
    _user_id: userId,
    _amount: credits,
    _description: "Video generation",
    _generation_id: generation.id,
  });
  if (spendError) {
    await client.from("generations").delete().eq("id", generation.id);
    if (spendError.message.includes("INSUFFICIENT_CREDITS")) throw new Error("INSUFFICIENT_CREDITS");
    throw new Error(spendError.message);
  }

  // 4. Job row
  const provider = getVideoProvider();
  const { data: job, error: jobError } = await client
    .from("generation_jobs")
    .insert({
      generation_id: generation.id,
      user_id: userId,
      project_id: projectId,
      status: "queued",
      progress: 3,
      stage_message: "Planning your scenes...",
      provider: provider.id,
      total_segments: total,
      completed_segments: 0,
    })
    .select("*")
    .single();
  if (jobError) throw new Error(jobError.message);

  try {
    // 5. Plan the scenes and store one row per 8-second take.
    const { planScenes } = await import("./planner.server");
    const basePrompt = params.enhancedPrompt?.trim() || params.prompt;
    const plan = await planScenes(basePrompt, settings);

    const rows = plan.scenes.slice(0, total).map((scene, idx) => ({
      generation_id: generation.id,
      job_id: job.id,
      user_id: userId,
      idx,
      scene_prompt: plan.continuity ? `${scene}\n\nContinuity: ${plan.continuity}` : scene,
    }));
    const { error: segmentError } = await client.from("generation_segments").insert(rows);
    if (segmentError) throw new Error(segmentError.message);

    // 6. Kick off the first take.
    await client
      .from("generation_jobs")
      .update({
        status: "generating",
        progress: 5,
        stage_message: stageForSegments(0, total),
      })
      .eq("id", job.id);

    return advanceJob(client, admin, userId, job.id);
  } catch (error) {
    await failJob(client, admin, job.id, userId, generation.id, credits, friendlyError(error));
    const view = await client.from("generation_jobs").select("*").eq("id", job.id).single();
    return toJobView(client, view.data ?? job);
  }
}

export async function failJob(
  client: Client,
  admin: Client,
  jobId: string,
  userId: string,
  generationId: string | null,
  credits: number,
  message: string,
  status: "failed" | "cancelled" = "failed",
) {
  await client
    .from("generation_jobs")
    .update({
      status,
      error_message: message,
      stage_message: JOB_STAGE_COPY[status] ?? message,
      progress: 0,
    })
    .eq("id", jobId);
  if (credits > 0) {
    await admin.rpc("refund_credits", {
      _user_id: userId,
      _amount: Math.round(credits),
      _description: status === "cancelled" ? "Generation cancelled" : "Generation failed",
      _generation_id: generationId as string,
    });
  }
  await client.from("notifications").insert({
    user_id: userId,
    title: status === "cancelled" ? "Generation cancelled" : "Generation failed",
    body: message,
    kind: status === "cancelled" ? "info" : "error",
  });
}

/** Credits for the scenes that never ran, so cancels and failures refund fairly. */
export function unusedCredits(totalCredits: number, total: number, done: number) {
  if (total <= 0) return totalCredits;
  const remaining = Math.max(0, total - done);
  return Math.round((totalCredits * remaining) / total);
}

export async function advanceJob(client: Client, admin: Client, userId: string, jobId: string) {
  const { data: job, error } = await client
    .from("generation_jobs")
    .select("*, generations(id, credits_cost, settings)")
    .eq("id", jobId)
    .single();
  if (error || !job) throw new Error("Generation not found.");

  const terminal = ["completed", "failed", "cancelled"];
  if (terminal.includes(job.status)) return toJobView(client, job);

  const meta = job as unknown as {
    generations: { credits_cost: number; settings: unknown } | null;
  };
  const credits = meta.generations?.credits_cost ?? 0;
  const settings = (meta.generations?.settings ?? {}) as VideoSettings;
  const generationId = job.generation_id;
  const provider = getVideoProvider(job.provider);
  const total = job.total_segments || 1;

  const { data: segments } = await client
    .from("generation_segments")
    .select("*")
    .eq("job_id", jobId)
    .order("idx", { ascending: true });

  const list = segments ?? [];
  const done = list.filter((s) => s.status === "completed").length;

  async function syncProgress(extra: Record<string, unknown> = {}) {
    const completed = list.filter((s) => s.status === "completed").length;
    await client
      .from("generation_jobs")
      .update({
        completed_segments: completed,
        progress: Math.min(95, 5 + Math.round((completed / total) * 88)),
        stage_message: stageForSegments(completed, total),
        ...extra,
      })
      .eq("id", jobId);
  }

  try {
    const running = list.find((s) => s.status === "generating");

    if (running?.provider_job_id) {
      const status = await provider.getGenerationStatus(running.provider_job_id);

      if (status.status === "completed") {
        const bytes = await provider.downloadVideo(running.provider_job_id);
        const path = `${userId}/${jobId}/scene-${String(running.idx).padStart(3, "0")}.mp4`;
        const { error: uploadError } = await admin.storage
          .from("videos")
          .upload(path, bytes, { contentType: "video/mp4", upsert: true });
        if (uploadError) throw new Error(`PROVIDER_ERROR:${uploadError.message}`);

        await client
          .from("generation_segments")
          .update({ status: "completed", video_path: path })
          .eq("id", running.id);
        running.status = "completed";
        running.video_path = path;
        await syncProgress();
      } else if (status.status === "failed") {
        if (running.attempts < 2) {
          await client
            .from("generation_segments")
            .update({ status: "pending", provider_job_id: null, error_message: status.error ?? null })
            .eq("id", running.id);
          running.status = "pending";
        } else {
          await failJob(
            client,
            admin,
            jobId,
            userId,
            generationId,
            unusedCredits(credits, total, done),
            `Scene ${running.idx + 1} couldn't be rendered. ${status.error ?? ""}`.trim(),
          );
          const { data: failed } = await client.from("generation_jobs").select("*").eq("id", jobId).single();
          return toJobView(client, failed ?? job);
        }
      } else {
        await syncProgress();
      }
    } else {
      // Nothing running: start the next scene, one at a time.
      const next = list.find((s) => s.status === "pending");
      if (next) {
        const providerJob = await provider.generateVideo({
          prompt: next.scene_prompt,
          settings,
          negativePrompt: null,
          inputImageDataUrl: null,
        });
        await client
          .from("generation_segments")
          .update({
            status: "generating",
            provider_job_id: providerJob.id,
            attempts: next.attempts + 1,
            error_message: null,
          })
          .eq("id", next.id);
        next.status = "generating";
        await syncProgress();
      }
    }

    // All scenes stored: hand the merge over to the browser.
    const remaining = list.filter((s) => s.status !== "completed").length;
    if (remaining === 0 && list.length > 0) {
      await client
        .from("generation_jobs")
        .update({
          status: "rendering",
          progress: 96,
          completed_segments: list.length,
          stage_message: "Joining scenes into your final video...",
        })
        .eq("id", jobId);
    }
  } catch (caught) {
    // Transient rate limiting should not kill the job — poll again shortly.
    if (caught instanceof Error && caught.message.startsWith("RATE_LIMITED")) {
      return toJobView(client, job);
    }
    await failJob(
      client,
      admin,
      jobId,
      userId,
      generationId,
      unusedCredits(credits, total, done),
      friendlyError(caught),
    );
  }

  const { data: fresh } = await client.from("generation_jobs").select("*").eq("id", jobId).single();
  return toJobView(client, fresh ?? job);
}

/** Called once the browser has merged the scenes and uploaded the final MP4. */
export async function completeJob(
  client: Client,
  userId: string,
  jobId: string,
  videoPath: string | null,
) {
  const { data: job } = await client.from("generation_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("Generation not found.");

  await client
    .from("generation_jobs")
    .update({
      status: "completed",
      progress: 100,
      video_path: videoPath,
      merged: Boolean(videoPath),
      stage_message: JOB_STAGE_COPY["completed"]!,
      error_message: null,
    })
    .eq("id", jobId);

  if (job.project_id) {
    await client
      .from("projects")
      .update({ status: "completed", ...(videoPath ? { video_path: videoPath } : {}) })
      .eq("id", job.project_id);
  }

  await client.from("notifications").insert({
    user_id: userId,
    title: "Video generation complete",
    body: "Your video is ready to preview.",
    kind: "success",
  });

  const { data: fresh } = await client.from("generation_jobs").select("*").eq("id", jobId).single();
  return toJobView(client, fresh ?? job);
}
