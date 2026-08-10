import type { ModelTier, VideoSettings } from "./options";

export type ProviderStatus = "queued" | "processing" | "completed" | "failed";

export type ProviderJob = {
  id: string;
  status: ProviderStatus;
  progress: number;
  error?: string;
};

export type GenerateVideoInput = {
  prompt: string;
  negativePrompt?: string | null;
  settings: VideoSettings;
  /** data: URL of a source image, for image-to-video. */
  inputImageDataUrl?: string | null;
};

/**
 * Every AI video backend implements this contract, so a new vendor is one
 * adapter file and an env var — no frontend changes.
 */
export interface VideoGenerationProvider {
  readonly id: string;
  readonly label: string;
  generateVideo(input: GenerateVideoInput): Promise<ProviderJob>;
  generateImageToVideo(input: GenerateVideoInput): Promise<ProviderJob>;
  getGenerationStatus(jobId: string): Promise<ProviderJob>;
  cancelGeneration(jobId: string): Promise<void>;
  extendVideo(jobId: string, seconds: number): Promise<ProviderJob>;
  /** Returns the finished MP4 bytes so the app can store them itself. */
  downloadVideo(jobId: string): Promise<ArrayBuffer>;
}

export function tierToModel(tier: ModelTier): string {
  switch (tier) {
    case "fast":
      return "google/veo-3.1-lite";
    case "cinematic":
      return "google/veo-3.1-fast";
    case "quality":
      return "google/veo-3.1";
    default:
      return "google/veo-3.1-lite";
  }
}

export function settingsToSize(settings: VideoSettings): string {
  const portrait = settings.aspectRatio === "9:16";
  if (settings.resolution === "1080p") return portrait ? "1080x1920" : "1920x1080";
  return portrait ? "720x1280" : "1280x720";
}

export function composeProviderPrompt(input: GenerateVideoInput): string {
  const { settings } = input;
  const directives = [
    `Visual style: ${settings.style}.`,
    `Camera: ${settings.camera} movement.`,
    `Lighting: ${settings.lighting}.`,
    `Aspect ratio ${settings.aspectRatio}, ${settings.fps} fps.`,
  ];
  const negative = input.negativePrompt?.trim() ? ` Avoid: ${input.negativePrompt.trim()}.` : "";
  return `${input.prompt.trim()}\n\n${directives.join(" ")}${negative}`;
}