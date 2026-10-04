/**
 * All content is open and free.
 */

export interface KeyStatus {
  isValid: boolean;
  isExpired: boolean;
  expiresAt: number | null;
  remainingMs: number;
  sessionId: string;
  activatedAt: number | null;
  bypassError: string | null;
}

export function ensureUserSession(): string {
  return "session-active";
}

export function checkKeyStatus(): KeyStatus {
  return {
    isValid: true,
    isExpired: false,
    expiresAt: null,
    remainingMs: Infinity,
    sessionId: "active",
    activatedAt: Date.now(),
    bypassError: null,
  };
}

export function processVerificationUrl(): { verified: boolean; bypassDetected: boolean } {
  return { verified: false, bypassDetected: false };
}

export async function generateAccessKeyLink(
  _returnPath?: string,
): Promise<{ success: boolean; shortUrl?: string; error?: string }> {
  return { success: true };
}

export function clearBypassError(): void {}

export function formatRemainingTime(_ms: number): string {
  return "Unlimited";
}
