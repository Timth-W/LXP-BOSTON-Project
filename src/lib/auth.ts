/**
 * Demo authentication helpers.
 * WARNING: accounts live in the browser for the prototype. In production, sign-up and login
 * must go through a backend (for example Supabase Auth): never hash or check passwords on the client.
 */
import { PASSWORD_MIN_LENGTH } from "./constants";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`joyto:${normalizeEmail(email)}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Short code a senior shares with relatives, e.g. "JOY-4821". */
export function generateInviteCode(random: () => number = Math.random): string {
  return `JOY-${Math.floor(1000 + random() * 9000)}`;
}

export function normalizeInviteCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.length === 4 ? `JOY-${digits}` : code.trim().toUpperCase();
}
