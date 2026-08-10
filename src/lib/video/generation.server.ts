import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { estimateCredits, JOB_STAGE_COPY, type GenerationMode, type VideoSettings } from "./options";
import { getVideoProvider } from "./registry.server";

type Client = SupabaseClient<Database>;

export type JobView = {
  id: string;
  status: string;
  progress: number;
  stageMessage: string;
  errorMessage: string | null;
  videoPath: string | null;
  projectId: string | null;
  videoUrl?: string | null;
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
  const { data } = await client.storage.from("videos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function toJobView(client: Client, row: Record<string, unknown>): Promise<JobView> {
  const videoPath = (row["video_path"] as string | null) ?? null;
  return {
    id: row["id"] as string,
    status: row["status"] as string,
    progress: (row["progress"] as number) ?? 0,
    stageMessage: (row["stage_message"] as string) ?? "",
    errorMessage: (row["error_message"] as string | null) ?? null,
    videoPath,
    projectId: (row["project_id"] as string | null) ?? null,
    videoUrl: await signedUrl(client, videoPath),
  };
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
      progress: 5,
      stage_message: JOB_STAGE_COPY["queued"]!,
      provider: provider.id,
    })
    .select("*")
    .single();
  if (jobError) throw new Error(jobError.message);

  // 5. Hand off to the provider
  try {
    const input = {
      prompt: params.enhancedPrompt?.trim() || params.prompt,
      negativePrompt: params.negativePrompt ?? null,
      settings,
      inputImageDataUrl: params.inputImageDataUrl ?? null,
    };
    const providerJob =
      params.mode === "image_to_video" && input.inputImageDataUrl
        ? await provider.generateImageToVideo(input)
        : await provider.generateVideo(input);

    const { data: updated } = await client
      .from("generation_jobs")
      .update({
        provider_job_id: providerJob.id,
        status: "generating",
        progress: Math.max(10, providerJob.progress),
        stage_message: JOB_STAGE_COPY["generating"]!,
      })
      .eq("id", job.id)
      .select("*")
      .single();
    return toJobView(client, updated ?? job);
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
      _amount: credits,
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

export async function advanceJob(client: Client, admin: Client, userId: string, jobId: string) {
  const { data: job, error } = await client
    .from("generation_jobs")
    .select("*, generations(id, credits_cost)")
    .eq("id", jobId)
    .single();
  if (error || !job) throw new Error("Generation not found.");

  const terminal = ["completed", "failed", "cancelled"];
  if (terminal.includes(job.status)) return toJobView(client, job);
  if (!job.provider_job_id) return toJobView(client, job);

  const credits =
    (job as unknown as { generations: { credits_cost: number } | null }).generations?.credits_cost ?? 0;
  const generationId = job.generation_id;
  const provider = getVideoProvider(job.provider);

  try {
    const status = await provider.getGenerationStatus(job.provider_job_id);

    if (status.status === "failed") {
      await failJob(client, admin, jobId, userId, generationId, credits, status.error ?? friendlyError(""));
    } else if (status.status === "completed") {
      await client
        .from("generation_jobs")
        .update({ status: "rendering", progress: 92, stage_message: JOB_STAGE_COPY["rendering"]! })
        .eq("id", jobId);

      const bytes = await provider.downloadVideo(job.provider_job_id);
      const path = `${userId}/${jobId}.mp4`;
      const { error: uploadError } = await admin.storage
        .from("videos")
        .upload(path, bytes, { contentType: "video/mp4", upsert: true });
      if (uploadError) throw new Error(`PROVIDER_ERROR:${uploadError.message}`);

      await client
        .from("generation_jobs")
        .update({
          status: "completed",
          progress: 100,
          video_path: path,
          stage_message: JOB_STAGE_COPY["completed"]!,
        })
        .eq("id", jobId);

      if (job.project_id) {
        await client
          .from("projects")
          .update({ status: "completed", video_path: path })
          .eq("id", job.project_id);
      }

      await client.from("notifications").insert({
        user_id: userId,
        title: "Video generation complete",
        body: "Your video is ready to preview.",
        kind: "success",
      });
    } else {
      await client
        .from("generation_jobs")
        .update({
          status: "generating",
          progress: Math.min(90, Math.max(job.progress, status.progress || job.progress + 4)),
          stage_message: JOB_STAGE_COPY["generating"]!,
        })
        .eq("id", jobId);
    }
  } catch (caught) {
    const message = friendlyError(caught);
    // Transient rate limiting should not kill the job.
    if (caught instanceof Error && caught.message.startsWith("RATE_LIMITED")) {
      return toJobView(client, job);
    }
    await failJob(client, admin, jobId, userId, generationId, credits, message);
  }

  const { data: fresh } = await client.from("generation_jobs").select("*").eq("id", jobId).single();
  return toJobView(client, fresh ?? job);
}