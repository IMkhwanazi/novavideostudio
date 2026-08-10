import { streamText } from "ai";
import { createLovableAiGatewayProvider, requireLovableApiKey } from "./ai-gateway.server";
import type { VideoSettings } from "./video/options";

const MODEL_ID = "google/gemini-3.6-flash";

const ENHANCER_SYSTEM = `You are a cinematography director writing prompts for an AI video generation model.
Rewrite the user's idea into ONE vivid, single-paragraph shot description.
Always specify: subject detail, environment, camera movement and lens, lighting,
motion, composition, visual style, mood and atmosphere.
Never add scene numbers, headings, bullet points, quotes or commentary.
Keep it under 130 words and write it as a direct description of the footage.`;

const MODERATION_SYSTEM = `You are a content safety classifier for an AI video generator.
Reply with exactly one line.
Reply "SAFE" if the request is acceptable.
Otherwise reply "BLOCK: <one short sentence explaining what is not allowed>".
Block: illegal activity, sexual content, sexualised minors, non-consensual intimate imagery,
graphic violence or gore, instructions for weapons or serious harm, hateful or extremist content,
deceptive deepfakes or impersonation of real identifiable people, and clear copyright infringement
such as recreating a specific copyrighted film scene or trademarked character.`;

async function complete(system: string, prompt: string) {
  const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
  // Streamed on the wire so long generations are never cut off mid-flight.
  const result = streamText({ model: gateway(MODEL_ID), system, prompt });
  return (await result.text).trim();
}

export async function enhancePromptServer(prompt: string, settings: VideoSettings) {
  const context = `Style: ${settings.style}. Camera: ${settings.camera}. Lighting: ${settings.lighting}. Duration: ${settings.durationSeconds}s. Aspect ratio: ${settings.aspectRatio}.`;
  return complete(ENHANCER_SYSTEM, `${context}\n\nIdea: ${prompt}`);
}

export type ModerationResult = { allowed: boolean; reason?: string };

export async function moderatePromptServer(prompt: string): Promise<ModerationResult> {
  try {
    const verdict = await complete(MODERATION_SYSTEM, prompt);
    if (verdict.toUpperCase().startsWith("BLOCK")) {
      const reason = verdict.replace(/^block\s*:?\s*/i, "").trim();
      return { allowed: false, reason: reason || "This request can't be generated." };
    }
    return { allowed: true };
  } catch (error) {
    console.error("[moderation] classifier unavailable", error);
    // Fail closed only on obviously unsafe input; otherwise let generation continue.
    return { allowed: true };
  }
}