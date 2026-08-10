import type { VideoGenerationProvider } from "./provider.server";
import { lovableVideoProvider } from "./providers/lovable.server";
import {
  klingProvider,
  lumaProvider,
  openAiCompatibleProvider,
  runwayProvider,
} from "./providers/external.server";

const PROVIDERS: Record<string, VideoGenerationProvider> = {
  lovable: lovableVideoProvider,
  runway: runwayProvider,
  kling: klingProvider,
  luma: lumaProvider,
  openai_compatible: openAiCompatibleProvider,
};

/** Selected with VIDEO_PROVIDER; defaults to the built-in Lovable AI adapter. */
export function getVideoProvider(id?: string | null): VideoGenerationProvider {
  const key = (id ?? process.env["VIDEO_PROVIDER"] ?? "lovable").toLowerCase();
  return PROVIDERS[key] ?? lovableVideoProvider;
}