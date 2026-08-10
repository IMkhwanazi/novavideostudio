import type { VideoGenerationProvider } from "../provider.server";

/**
 * Adapter skeletons for third-party vendors. Each one only needs its HTTP calls
 * filled in plus an API key in the environment — the rest of the application
 * (queue, storage, credits, UI) already speaks this interface.
 */
function createUnconfiguredProvider(
  id: string,
  label: string,
  envVar: string,
): VideoGenerationProvider {
  const notConfigured = (): never => {
    throw new Error(
      `PROVIDER_UNCONFIGURED:${label} is selected but not configured. Add ${envVar} and implement its adapter.`,
    );
  };
  return {
    id,
    label,
    generateVideo: async () => notConfigured(),
    generateImageToVideo: async () => notConfigured(),
    getGenerationStatus: async () => notConfigured(),
    cancelGeneration: async () => notConfigured(),
    extendVideo: async () => notConfigured(),
    downloadVideo: async () => notConfigured(),
  };
}

export const runwayProvider = createUnconfiguredProvider("runway", "Runway", "RUNWAY_API_KEY");
export const klingProvider = createUnconfiguredProvider("kling", "Kling", "KLING_API_KEY");
export const lumaProvider = createUnconfiguredProvider("luma", "Luma", "LUMA_API_KEY");
export const openAiCompatibleProvider = createUnconfiguredProvider(
  "openai_compatible",
  "OpenAI-compatible video API",
  "VIDEO_API_KEY",
);