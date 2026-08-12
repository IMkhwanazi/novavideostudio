import { streamText } from "ai";
import { createLovableAiGatewayProvider, requireLovableApiKey } from "@/lib/ai-gateway.server";
import { SEGMENT_SECONDS, segmentCount, type VideoSettings } from "./options";

const MODEL_ID = "google/gemini-3.6-flash";

export type ScenePlan = {
  continuity: string;
  scenes: string[];
};

function fallbackPlan(prompt: string, count: number, settings: VideoSettings): ScenePlan {
  const continuity =
    `Consistent subject, wardrobe, location and colour palette throughout. ` +
    `${settings.style} style, ${settings.lighting.toLowerCase()} lighting, ${settings.camera.toLowerCase()} camera work.`;
  const beats = [
    "Wide establishing shot introducing the setting",
    "Medium shot moving toward the subject",
    "Close detail shot of the subject",
    "Reverse angle revealing more of the environment",
    "Slow push-in building tension",
    "Tracking shot following the action",
    "High angle showing the wider scene",
    "Final lingering shot resolving the moment",
  ];
  const scenes = Array.from({ length: count }, (_, i) => {
    const beat = beats[i % beats.length]!;
    return `Scene ${i + 1} of ${count}: ${beat}. ${prompt}`;
  });
  return { continuity, scenes };
}

function parseScenes(text: string, count: number) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:scene\s*)?\d+\s*[:.)-]\s*/i, "").trim())
    .filter((line) => line.length > 12);
  return lines.slice(0, count);
}

/**
 * Splits one idea into an ordered list of 8-second scene prompts plus a shared
 * continuity brief so every take looks like part of the same film.
 */
export async function planScenes(
  prompt: string,
  settings: VideoSettings,
  signal?: AbortSignal,
): Promise<ScenePlan> {
  const count = segmentCount(settings.durationSeconds);
  if (count === 1) {
    return { continuity: "", scenes: [prompt] };
  }

  try {
    const gateway = createLovableAiGatewayProvider(requireLovableApiKey());

    const briefResult = streamText({
      model: gateway(MODEL_ID),
      system:
        "You are a film director writing a continuity brief for an AI video generator. " +
        "In under 90 words describe the recurring characters (appearance, wardrobe), location, " +
        "colour palette, lens and lighting so every shot matches. No headings, no lists.",
      prompt: `Style: ${settings.style}. Lighting: ${settings.lighting}. Camera: ${settings.camera}. Idea: ${prompt}`,
      ...(signal ? { abortSignal: signal } : {}),
    });
    const continuity = (await briefResult.text).trim();

    const sceneResult = streamText({
      model: gateway(MODEL_ID),
      system:
        `You are a film director. Break the idea into exactly ${count} consecutive shots of ` +
        `${SEGMENT_SECONDS} seconds each, forming one continuous story with a beginning, middle and end. ` +
        "Output exactly one line per shot, numbered '1.' to '" + count + ".'. " +
        "Each line is a single vivid sentence describing subject, action, camera move and framing for that shot only. " +
        "No headings, no blank lines, no commentary.",
      prompt: `Continuity brief: ${continuity}\n\nIdea: ${prompt}`,
      ...(signal ? { abortSignal: signal } : {}),
    });
    const scenes = parseScenes(await sceneResult.text, count);

    if (scenes.length < count) {
      const filler = fallbackPlan(prompt, count, settings).scenes;
      for (let i = scenes.length; i < count; i += 1) scenes.push(filler[i]!);
    }
    return { continuity, scenes };
  } catch (error) {
    console.error("[planScenes] falling back to deterministic plan", error);
    return fallbackPlan(prompt, count, settings);
  }
}
