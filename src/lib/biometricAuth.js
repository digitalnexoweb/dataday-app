const KEYS = {
  META:       "dataday_biometric",            // { credentialId, userId, email }
  REGISTERED: "dataday_biometric_registered", // "true"
  SESSION:    "dataday_session",              // { access_token, refresh_token, email, userId }
  FAILURES:   "dataday_biometric_failures",   // "0" | "1" | "2"
};

const MAX_FAILURES = 3;

// ─── Encoding helpers ──────────────────────────────────────────────────────────

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToUint8Array(b64) {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ─── Capability check ──────────────────────────────────────────────────────────

export function isBiometricSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function"
  );
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

export function getBiometricMeta() {
  try {
    const raw = localStorage.getItem(KEYS.META);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isBiometricRegistered() {
  return (
    isBiometricSupported() &&
    localStorage.getItem(KEYS.REGISTERED) === "true" &&
    getBiometricMeta() !== null
  );
}

/** Called after successful email/password login to persist tokens for later. */
export function saveSession(session) {
  try {
    localStorage.setItem(
      KEYS.SESSION,
      JSON.stringify({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        email:  session.user?.email  ?? "",
        userId: session.user?.id     ?? "",
      }),
    );
  } catch { /* localStorage unavailable — fail silently */ }
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Remove all biometric data (on 3 consecutive failures or user request). */
export function clearBiometricData() {
  [KEYS.META, KEYS.REGISTERED, KEYS.SESSION, KEYS.FAILURES].forEach(
    (k) => localStorage.removeItem(k),
  );
}

/** Remove only the stored session tokens (e.g. expired refresh_token). */
export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

// Returns true if the failure threshold was reached and data was wiped.
function recordFailure() {
  const n = parseInt(localStorage.getItem(KEYS.FAILURES) ?? "0", 10) + 1;
  if (n >= MAX_FAILURES) {
    clearBiometricData();
    return true;
  }
  localStorage.setItem(KEYS.FAILURES, String(n));
  return false;
}

function resetFailures() {
  localStorage.removeItem(KEYS.FAILURES);
}

// ─── Registration ──────────────────────────────────────────────────────────────

/**
 * Create a platform authenticator credential tied to this device.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function registerBiometric({ userId, email }) {
  if (!isBiometricSupported()) return { ok: false, error: "not_supported" };

  let credential;
  try {
    credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "DataDay Cuotas", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7,   type: "public-key" }, // ES256  (preferred)
          { alg: -257, type: "public-key" }, // RS256  (fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // device biometrics only
          requireResidentKey: false,
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err.name === "NotAllowedError" ? "user_cancelled" : "create_failed",
    };
  }

  if (!credential) return { ok: false, error: "create_failed" };

  try {
    localStorage.setItem(
      KEYS.META,
      JSON.stringify({
        credentialId: bufferToBase64url(credential.rawId),
        userId,
        email,
      }),
    );
    localStorage.setItem(KEYS.REGISTERED, "true");
    resetFailures();
    return { ok: true };
  } catch {
    return { ok: false, error: "storage_failed" };
  }
}

// ─── Authentication ────────────────────────────────────────────────────────────

/**
 * Verify identity using the registered platform credential.
 *
 * Returns:
 *   { ok: true, session }
 *   { ok: false, error: "not_registered"|"no_session"|"user_cancelled"|"get_failed",
 *                threshold?: true }   ← threshold=true means data was cleared
 */
export async function verifyBiometric() {
  const meta = getBiometricMeta();
  if (!meta) return { ok: false, error: "not_registered" };

  const session = getStoredSession();
  if (!session?.refresh_token) {
    clearSession();
    return { ok: false, error: "no_session" };
  }

  let assertion;
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: base64urlToUint8Array(meta.credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });
  } catch (err) {
    // User dismissed the sheet — don't penalise, just fall back silently.
    if (err.name === "NotAllowedError") {
      return { ok: false, error: "user_cancelled" };
    }
    const threshold = recordFailure();
    return { ok: false, error: "get_failed", threshold };
  }

  if (!assertion) {
    const threshold = recordFailure();
    return { ok: false, error: "get_failed", threshold };
  }

  resetFailures();
  return { ok: true, session };
}
