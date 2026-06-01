import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  isBiometricRegistered,
  isBiometricSupported,
  registerBiometric,
} from "../../lib/biometricAuth";

const DECLINED_KEY = "dataday_biometric_declined";

// ─── Shared fingerprint icon ───────────────────────────────────────────────────

export function FingerprintSvg({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 2C6.5 2 2 6.5 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 12C22 6.5 17.5 2 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 12c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 12a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 14c.6 4.2 4.5 7.5 10 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 14c-.6 4.2-4.5 7.5-10 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Prompt component ──────────────────────────────────────────────────────────

export function BiometricPrompt({ session, onDone }) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | loading | success | error

  // Delay appearance by 2 s so the main app can finish rendering first.
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  async function handleAccept() {
    setPhase("loading");
    const result = await registerBiometric({
      userId: session.userId,
      email:  session.email,
    });

    if (result.ok) {
      setPhase("success");
      setTimeout(onDone, 1400);
    } else {
      setPhase("error");
    }
  }

  function handleDecline() {
    try { localStorage.setItem(DECLINED_KEY, "true"); } catch { /* ignore */ }
    onDone();
  }

  if (!visible) return null;

  return (
    <div className="biometric-prompt" role="dialog" aria-label="Activar acceso biometrico">
      <div className="biometric-prompt-icon" aria-hidden="true">
        <FingerprintSvg size={24} />
      </div>

      <div className="biometric-prompt-copy">
        <strong>Acceso rapido disponible</strong>
        <p>Activa Face ID o huella para entrar sin contrasena en este dispositivo.</p>
      </div>

      <div className="biometric-prompt-actions">
        {phase === "idle" && (
          <>
            <button className="primary-button" type="button" onClick={handleAccept}>
              Activar
            </button>
            <button className="secondary-button" type="button" onClick={handleDecline}>
              No, gracias
            </button>
          </>
        )}
        {phase === "loading" && (
          <span className="biometric-status-text">Esperando verificacion…</span>
        )}
        {phase === "success" && (
          <span className="biometric-status-text biometric-status-text--ok">
            Activado correctamente
          </span>
        )}
        {phase === "error" && (
          <>
            <span className="biometric-status-text biometric-status-text--err">
              No se pudo activar
            </span>
            <button className="secondary-button" type="button" onClick={onDone}>
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Imperative mount ──────────────────────────────────────────────────────────

/**
 * Render BiometricPrompt into its own React root so it survives the
 * LoginForm unmount that happens immediately after a successful sign-in.
 * Called from LoginForm after email/password login succeeds.
 *
 * @param {{ userId: string, email: string }} session
 */
export function mountBiometricPrompt(session) {
  if (!isBiometricSupported()) return;
  if (isBiometricRegistered()) return; // already set up on this device

  try {
    if (localStorage.getItem(DECLINED_KEY) === "true") return;
  } catch {
    return;
  }

  const container = document.createElement("div");
  container.id = "biometric-prompt-root";
  document.body.appendChild(container);

  const root = createRoot(container);

  function cleanup() {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }

  root.render(<BiometricPrompt session={session} onDone={cleanup} />);
}
