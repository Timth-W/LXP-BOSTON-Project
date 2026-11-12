/**
 * GET  /api/joy/session → { realtime: boolean }  (is an OpenAI key configured?)
 * POST /api/joy/session → { value, model }        (short-lived client secret for GPT Realtime)
 * Without OPENAI_API_KEY the app uses Joy's demo voice (browser speech), so the demo always works.
 */
import { NextResponse } from "next/server";
import { clientSecretBody, joySessionRequestSchema, REALTIME_MODEL, type JoySessionRequest } from "@/lib/joy/realtime";

export function GET() {
  return NextResponse.json({ realtime: Boolean(process.env.OPENAI_API_KEY), model: REALTIME_MODEL });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Realtime voice is not configured." }, { status: 503 });

  let req: JoySessionRequest;
  try {
    req = joySessionRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(clientSecretBody(req)),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { value?: string };
    if (!data.value) throw new Error("No client secret in the answer.");
    return NextResponse.json({ value: data.value, model: REALTIME_MODEL });
  } catch (err) {
    console.error("[joy] Could not create a realtime session:", err);
    return NextResponse.json({ error: "Realtime voice unavailable." }, { status: 502 });
  }
}
