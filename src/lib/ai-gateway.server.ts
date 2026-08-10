import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Server-only provider bound to the Lovable AI Gateway. */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function requireLovableApiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI_UNCONFIGURED:AI features are not configured.");
  return key;
}