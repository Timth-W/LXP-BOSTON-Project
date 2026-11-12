import { describe, expect, it } from "vitest";
import { clientSecretBody, joySessionRequestSchema } from "../joy/realtime";

describe("GPT Realtime session", () => {
  it("builds a session with the voice, the tools and only the given proposals", () => {
    const req = joySessionRequestSchema.parse({
      locale: "fr",
      role: "senior",
      firstName: "Marie",
      greeting: "Bonjour Marie !",
      proposals: [{ id: "join:a1", line: "Voulez-vous participer à l'atelier ?", label: "Atelier, samedi" }],
    });
    const body = clientSecretBody(req);
    expect(body.session.type).toBe("realtime");
    expect(body.session.model).toBe("gpt-realtime-2.1");
    expect(body.session.audio.output.voice).toBeTruthy();
    expect(body.session.tools.map((tool) => tool.name)).toEqual([
      "show_proposal",
      "open_confirmation",
      "find_activities",
      "end_conversation",
    ]);
    expect(body.session.instructions).toContain('id "join:a1"');
    expect(body.session.instructions).toContain("French");
    expect(body.session.instructions).toContain("never say that something is booked".replace("never", "Never"));
  });

  it("refuses unexpected input", () => {
    expect(() => joySessionRequestSchema.parse({ locale: "de", role: "senior", firstName: "x", greeting: "", proposals: [] })).toThrow();
  });
});
