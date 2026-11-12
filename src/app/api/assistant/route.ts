/**
 * POST /api/assistant
 * Input: the senior's message, their profile and the list of eligible activities
 * (already filtered by the hard rules in the code).
 * Output: a structured intent, up to 3 explained suggestions and an optional outing draft.
 *
 * With ANTHROPIC_API_KEY: calls the language model, JSON answer validated with zod.
 * Without a key, or if the answer is invalid: rule-based demo mode (src/lib/ai/demo.ts).
 */
import { NextResponse } from "next/server";
import { demoAssistant } from "@/lib/ai/demo";
import { buildUserContent, systemPrompt } from "@/lib/ai/prompt";
import { sanitize } from "@/lib/ai/sanitize";
import {
  assistantRequestSchema,
  modelResponseSchema,
  type AssistantRequest,
  type AssistantResponse,
  type ModelResponse,
} from "@/lib/ai/schema";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 20_000;

async function callModel(req: AssistantRequest, apiKey: string): Promise<ModelResponse> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 900,
      system: systemPrompt(req.locale),
      messages: [{ role: "user", content: buildUserContent(req) }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return modelResponseSchema.parse(JSON.parse(json));
}

export async function POST(request: Request) {
  let req: AssistantRequest;
  try {
    req = assistantRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const out = sanitize(await callModel(req, apiKey), req);
      return NextResponse.json({ ...out, source: "ai" } satisfies AssistantResponse);
    } catch (err) {
      console.error("[assistant] AI call failed, falling back to demo mode:", err);
    }
  }
  const out = sanitize(demoAssistant(req), req);
  return NextResponse.json({ ...out, source: "demo" } satisfies AssistantResponse);
}
