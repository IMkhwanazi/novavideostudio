// Browser-safe constants shared by the studio UI and the server.

export type GenerationMode =
  | "text_to_video"
  | "image_to_video"
  | "script_to_video"
  | "storyboard_to_video"
  | "product_to_video"
  | "video_to_video";

export type ModelTier = "fast" | "balanced" | "cinematic" | "quality";

export const GENERATION_MODES: {
  id: GenerationMode;
  label: string;
  description: string;
  available: boolean;
}[] = [
  {
    id: "text_to_video",
    label: "Text → Video",
    description: "Generate a video entirely from a written prompt.",
    available: true,
  },
  {
    id: "image_to_video",
    label: "Image → Video",
    description: "Upload an image and animate it into motion.",
    available: true,
  },
  {
    id: "script_to_video",
    label: "Script → Video",
    description: "Paste a script and auto-generate scenes.",
    available: false,
  },
  {
    id: "storyboard_to_video",
    label: "Storyboard → Video",
    description: "Build individual scenes and combine them.",
    available: false,
  },
  {
    id: "product_to_video",
    label: "Product → Video",
    description: "Upload a product shot and generate an advert.",
    available: false,
  },
  {
    id: "video_to_video",
    label: "Video → Video",
    description: "Transform the visual style of existing footage.",
    available: false,
  },
];

export const MODEL_TIERS: {
  id: ModelTier;
  label: string;
  speed: string;
  quality: string;
  multiplier: number;
}[] = [
  { id: "fast", label: "Fast", speed: "Fastest", quality: "Good", multiplier: 0.7 },
  { id: "balanced", label: "Balanced", speed: "Fast", quality: "Great", multiplier: 1 },
  { id: "cinematic", label: "Cinematic", speed: "Moderate", quality: "Excellent", multiplier: 1.6 },
  { id: "quality", label: "High Quality", speed: "Slowest", quality: "Maximum", multiplier: 2.4 },
];

export const DURATIONS = [60, 90, 120, 180, 240, 300, 360] as const;
export const LOCKED_DURATIONS = [] as const;

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}
export const ASPECT_RATIOS = ["16:9", "9:16"] as const;
export const LOCKED_ASPECT_RATIOS = ["1:1", "4:5"] as const;
export const RESOLUTIONS = ["720p", "1080p"] as const;
export const FPS_OPTIONS = [24, 30] as const;

export const VISUAL_STYLES = [
  "Cinematic",
  "Photorealistic",
  "Commercial",
  "Anime",
  "Documentary",
  "3D",
  "Cartoon",
  "Fashion",
  "Luxury",
  "Cyberpunk",
  "Minimalist",
  "Vintage Film",
  "Social Media",
];

export const CAMERA_MOVES = [
  "Static",
  "Pan",
  "Tilt",
  "Dolly",
  "Tracking",
  "Crane",
  "Handheld",
  "Drone",
  "Orbit",
  "Zoom",
];

export const LIGHTING_SETUPS = [
  "Natural",
  "Studio",
  "Golden Hour",
  "Neon",
  "Dramatic",
  "Soft",
  "Low-key",
  "High-key",
];

export type VideoSettings = {
  durationSeconds: number;
  aspectRatio: string;
  resolution: string;
  fps: number;
  style: string;
  camera: string;
  lighting: string;
  modelTier: ModelTier;
};

export const DEFAULT_SETTINGS: VideoSettings = {
  durationSeconds: 60,
  aspectRatio: "16:9",
  resolution: "720p",
  fps: 24,
  style: "Cinematic",
  camera: "Dolly",
  lighting: "Golden Hour",
  modelTier: "balanced",
};

/** Credits are charged per second of finished video, scaled by tier and resolution. */
export function estimateCredits(settings: Pick<VideoSettings, "durationSeconds" | "resolution" | "modelTier">) {
  const tier = MODEL_TIERS.find((t) => t.id === settings.modelTier) ?? MODEL_TIERS[1]!;
  const resolutionFactor = settings.resolution === "1080p" ? 1.5 : 1;
  return Math.max(1, Math.round(settings.durationSeconds * 6 * tier.multiplier * resolutionFactor));
}

export const JOB_STAGE_COPY: Record<string, string> = {
  queued: "Preparing your video...",
  processing: "Generating scenes...",
  generating: "Generating scenes...",
  rendering: "Rendering video...",
  completed: "Your video is ready.",
  failed: "Something went wrong while generating your video.",
  cancelled: "Generation cancelled.",
};