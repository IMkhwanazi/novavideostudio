import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const settingsSchema = z.object({
  durationSeconds: z.number().int().min(60).max(360),
  aspectRatio: z.string().max(10),
  resolution: z.string().max(10),
  fps: z.number().int().min(12).max(60),
  style: z.string().max(40),
  camera: z.string().max(40),
  lighting: z.string().max(40),
  modelTier: z.enum(["fast", "balanced", "cinematic", "quality"]),
});

const createSchema = z.object({
  mode: z.enum(["text_to_video", "image_to_video"]),
  prompt: z.string().trim().min(6).max(2000),
  enhancedPrompt: z.string().trim().max(4000).nullable().optional(),
  negativePrompt: z.string().trim().max(600).nullable().optional(),
  settings: settingsSchema,
  inputImageDataUrl: z
    .string()
    .max(9_000_000)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
    .nullable()
    .optional(),
  projectId: z.string().uuid().nullable().optional(),
  title: z.string().trim().max(80).nullable().optional(),
});

export const enhancePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ prompt: z.string().trim().min(3).max(2000), settings: settingsSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { enhancePromptServer } = await import("@/lib/ai.server");
    return { prompt: await enhancePromptServer(data.prompt, data.settings) };
  });

export const createGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { moderatePromptServer } = await import("@/lib/ai.server");
    const { startGeneration, friendlyError } = await import("./generation.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const verdict = await moderatePromptServer(data.prompt);
    if (!verdict.allowed) {
      return { ok: false as const, error: verdict.reason ?? "This prompt can't be generated." };
    }

    try {
      const job = await startGeneration({
        client: context.supabase,
        admin: supabaseAdmin,
        userId: context.userId,
        mode: data.mode,
        prompt: data.prompt,
        enhancedPrompt: data.enhancedPrompt ?? null,
        negativePrompt: data.negativePrompt ?? null,
        settings: data.settings,
        inputImageDataUrl: data.inputImageDataUrl ?? null,
        projectId: data.projectId ?? null,
        title: data.title ?? null,
      });
      return { ok: true as const, job };
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        return { ok: false as const, error: "You don't have enough credits for this generation." };
      }
      console.error("[createGeneration]", error);
      return { ok: false as const, error: friendlyError(error) };
    }
  });

export const pollGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { advanceJob } = await import("./generation.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return advanceJob(context.supabase, supabaseAdmin, context.userId, data.jobId);
  });

export const cancelGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { failJob, toJobView, unusedCredits } = await import("./generation.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job } = await context.supabase
      .from("generation_jobs")
      .select("*, generations(credits_cost)")
      .eq("id", data.jobId)
      .single();
    if (!job) throw new Error("Generation not found.");
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      return toJobView(context.supabase, job);
    }

    const credits =
      (job as unknown as { generations: { credits_cost: number } | null }).generations?.credits_cost ?? 0;
    await failJob(
      context.supabase,
      supabaseAdmin,
      data.jobId,
      context.userId,
      job.generation_id,
      unusedCredits(credits, job.total_segments || 1, job.completed_segments || 0),
      "You cancelled this generation. Credits were returned.",
      "cancelled",
    );
    const { data: fresh } = await context.supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    return toJobView(context.supabase, fresh ?? job);
  });

export const finalizeGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        videoPath: z.string().max(400).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { completeJob } = await import("./generation.server");
    const path = data.videoPath ?? null;
    // A client may only claim a file inside its own storage folder.
    if (path && !path.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid video path.");
    }
    return completeJob(context.supabase, context.userId, data.jobId, path);
  });

export const getStudioState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { toJobView } = await import("./generation.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase, userId } = context;

    let grantedCredits: number | null = null;
    try {
      const { data: claimed } = await supabaseAdmin.rpc("claim_daily_credits", { _user_id: userId });
      grantedCredits = typeof claimed === "number" ? claimed : null;
    } catch (error) {
      console.error("[claim_daily_credits]", error);
    }

    const [profile, jobs] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, credits").eq("id", userId).maybeSingle(),
      supabase
        .from("generation_jobs")
        .select("*, generations(prompt, settings, mode)")
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    const rows = jobs.data ?? [];
    const history = await Promise.all(
      rows.map(async (row) => ({
        ...(await toJobView(supabase, row)),
        prompt:
          (row as unknown as { generations: { prompt: string } | null }).generations?.prompt ?? "",
        createdAt: row.created_at,
      })),
    );

    return {
      credits: grantedCredits ?? profile.data?.credits ?? 0,
      displayName: profile.data?.display_name ?? null,
      avatarUrl: profile.data?.avatar_url ?? null,
      history,
    };
  });