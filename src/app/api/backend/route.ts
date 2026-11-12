import { NextResponse, type NextRequest } from "next/server";
import { createMission, login, signUp } from "../../../lib/actions";
import { appStateStore, stateSummary } from "../../../lib/backend";
import type { State } from "../../../lib/types";

export async function GET() {
  const state = await appStateStore.load();
  return NextResponse.json({ ok: true, summary: stateSummary(state), state });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const store = appStateStore;

  if (!action) {
    return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });
  }

  const state = await store.load();

  try {
    switch (action) {
      case "login": {
        const email = String((body.email ?? "") as string);
        const passwordHash = String((body.passwordHash ?? "") as string);
        const result = login(state, email, passwordHash);
        await store.save(state);
        return NextResponse.json({ ok: true, result, summary: stateSummary(state) });
      }

      case "signup": {
        const result = signUp(state, {
          role: String((body.role ?? "senior") as string) as "senior" | "companion" | "family",
          email: String((body.email ?? "") as string),
          passwordHash: String((body.passwordHash ?? "") as string),
          firstName: String((body.firstName ?? "") as string),
          lastName: String((body.lastName ?? "") as string),
          sector: String((body.sector ?? "centre") as string) as any,
          interests: (Array.isArray(body.interests) ? (body.interests as unknown[]) : []) as any,
          inviteCode: body.inviteCode ? String(body.inviteCode) : undefined,
          relation: body.relation ? (String(body.relation) as any) : undefined,
        });
        await store.save(state);
        return NextResponse.json({ ok: true, result, summary: stateSummary(state) });
      }

      case "create-mission": {
        const result = createMission(state, {
          seniorId: String((body.seniorId ?? "") as string),
          bookedById: String((body.bookedById ?? "") as string),
          payerId: String((body.payerId ?? "") as string),
          activityId: body.activityId ? String(body.activityId) : null,
          type: String((body.type ?? "activity") as string) as any,
          note: String((body.note ?? "") as string),
          start: String((body.start ?? "") as string),
          durationMin: Number(body.durationMin ?? 60),
          sector: String((body.sector ?? "centre") as string) as any,
          meetingPoint: String((body.meetingPoint ?? "") as string),
          via: String((body.via ?? "manual") as string) as "assistant" | "manual",
        });
        await store.save(state);
        return NextResponse.json({ ok: true, result, summary: stateSummary(state) });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}

export type BackendAction = "login" | "signup" | "create-mission";
export type BackendStateEnvelope = {
  ok: boolean;
  state?: State;
  summary?: ReturnType<typeof stateSummary>;
  result?: unknown;
  error?: string;
};
