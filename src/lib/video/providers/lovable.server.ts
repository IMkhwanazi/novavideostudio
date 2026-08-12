import {
  composeProviderPrompt,
  settingsToSize,
  tierToModel,
  type GenerateVideoInput,
  type ProviderJob,
  type ProviderStatus,
  type VideoGenerationProvider,
} from "../provider.server";

const BASE_URL = "https://ai.gateway.lovable.dev/v1/videos";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("PROVIDER_UNCONFIGURED");
  return key;
}

function mapStatus(status: string): ProviderStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "queued") return "queued";
  return "processing";
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message ?? text;
  } catch {
    return text;
  }
}

async function createJob(input: GenerateVideoInput): Promise<ProviderJob> {
  const { settings } = input;
  // The engine only renders 4, 6 or 8 second takes; long films are stitched
  // from many of these, so every request asks for a full 8-second take.
  const seconds = "8";

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: tierToModel(settings.modelTier),
      prompt: composeProviderPrompt(input),
      seconds,
      size: settingsToSize(settings),
      ...(input.inputImageDataUrl ? { input_reference: input.inputImageDataUrl } : {}),
    }),
  });

  if (!response.ok) {
    const message = await readError(response);
    if (response.status === 429) throw new Error(`RATE_LIMITED:${message}`);
    if (response.status === 402) throw new Error(`OUT_OF_CREDITS:${message}`);
    throw new Error(`PROVIDER_ERROR:${message}`);
  }

  const job = (await response.json()) as { id: string; status: string; progress?: number };
  return { id: job.id, status: mapStatus(job.status), progress: job.progress ?? 5 };
}

export const lovableVideoProvider: VideoGenerationProvider = {
  id: "lovable",
  label: "Lovable AI (Veo)",
  generateVideo: createJob,
  generateImageToVideo: createJob,

  async getGenerationStatus(jobId) {
    const response = await fetch(`${BASE_URL}/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    if (!response.ok) throw new Error(`PROVIDER_ERROR:${await readError(response)}`);
    const job = (await response.json()) as {
      id: string;
      status: string;
      progress?: number;
      error?: { message?: string };
    };
    return {
      id: job.id,
      status: mapStatus(job.status),
      progress: job.progress ?? 0,
      ...(job.error?.message ? { error: job.error.message } : {}),
    };
  },

  async cancelGeneration() {
    // The gateway has no cancel endpoint; the app stops polling and marks the
    // job cancelled locally so the credits are returned to the user.
  },

  async extendVideo(jobId) {
    throw new Error(`UNSUPPORTED:Video extension is not available on this provider yet (${jobId}).`);
  },

  async downloadVideo(jobId) {
    const response = await fetch(`${BASE_URL}/${jobId}/content`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    if (!response.ok) throw new Error(`PROVIDER_ERROR:${await readError(response)}`);
    return response.arrayBuffer();
  },
};