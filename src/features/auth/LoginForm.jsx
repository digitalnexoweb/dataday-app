import { useState } from "react";
import { authApi } from "../../lib/authApi";
import { supabase } from "../../lib/supabase";
import {
  clearBiometricData,
  clearSession,
  getBiometricMeta,
  isBiometricRegistered,
  saveSession,
  verifyBiometric,
} from "../../lib/biometricAuth";
import { FingerprintSvg, mountBiometricPrompt } from "./BiometricPrompt";

// Show at most the first 8 chars of the local part to avoid overflow.
function truncateEmail(email = "") {
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local  = email.slice(0, at);
  const domain = email.slice(at);
  return (local.length > 8 ? local.slice(0, 8) + "…" : local) + domain;
}

export function LoginForm() {
  // Computed once on mount — never stale within a single component lifecycle.
  const [biometricMeta] = useState(() =>
    isBiometricRegistered() ? getBiometricMeta() : null,
  );
  const [biometricMode, setBiometricMode] = useState(biometricMeta !== null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
    recoveryLoading: false,
  });

  function updateField(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
    setStatus((c) => ({ ...c, error: "", success: "" }));
  }

  // ── Normal email/password login ──────────────────────────────────────────────

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus((c) => ({ ...c, loading: true, error: "", success: "" }));

    try {
      await authApi.signIn(form);

      // Save session tokens and (conditionally) offer biometric registration.
      // getSession() reads from Supabase's in-memory cache — no network request.
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          saveSession(data.session);
          mountBiometricPrompt({
            userId: data.session.user?.id    ?? "",
            email:  data.session.user?.email ?? "",
          });
        }
      }
    } catch (error) {
      setStatus((c) => ({ ...c, loading: false, error: error.message }));
    }
  }

  async function handleForgotPassword() {
    if (!form.email) {
      setStatus((c) => ({
        ...c,
        error:   "Ingresa tu email para enviarte el enlace de recuperacion.",
        success: "",
      }));
      return;
    }

    setStatus((c) => ({ ...c, recoveryLoading: true, error: "", success: "" }));

    try {
      await authApi.requestPasswordSetup(form.email);
      setStatus((c) => ({
        ...c,
        recoveryLoading: false,
        success: "Te enviamos un enlace para restablecer tu contrasena.",
      }));
    } catch (error) {
      setStatus((c) => ({ ...c, recoveryLoading: false, error: error.message }));
    }
  }

  // ── Biometric login ──────────────────────────────────────────────────────────

  async function handleBiometricLogin() {
    if (!supabase) return; // mock mode — biometric never registers, but guard anyway

    setBiometricLoading(true);
    setStatus((c) => ({ ...c, error: "" }));

    const result = await verifyBiometric();

    if (result.ok) {
      const { error } = await supabase.auth.setSession({
        access_token:  result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (error) {
        // Refresh token expired — ask user to log in the normal way.
        clearSession();
        setBiometricLoading(false);
        setBiometricMode(false);
        setStatus((c) => ({
          ...c,
          error: "Sesion expirada. Ingresa con tu contrasena.",
        }));
      }
      // On success: onAuthStateChange fires in App.jsx → app re-renders authenticated.
      return;
    }

    setBiometricLoading(false);

    if (result.error === "user_cancelled") {
      // User dismissed the system sheet — silent fallback, no error shown.
      return;
    }

    if (result.error === "no_session") {
      clearSession();
      setBiometricMode(false);
      setStatus((c) => ({
        ...c,
        error: "Sesion expirada. Ingresa con tu contrasena.",
      }));
      return;
    }

    if (result.threshold) {
      // 3 consecutive failures: biometric data cleared, fall back to full form.
      setBiometricMode(false);
      setStatus((c) => ({
        ...c,
        error: "Demasiados intentos fallidos. Ingresa con tu contrasena.",
      }));
      return;
    }

    setStatus((c) => ({
      ...c,
      error: "No se pudo verificar. Intentalo de nuevo.",
    }));
  }

  function handleUsePassword() {
    setBiometricMode(false);
    setStatus({ loading: false, error: "", success: "", recoveryLoading: false });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (biometricMode && biometricMeta) {
    return (
      <div className="biometric-login">
        <button
          className="biometric-login-button"
          type="button"
          onClick={handleBiometricLogin}
          disabled={biometricLoading}
        >
          <span className="biometric-login-icon">
            <FingerprintSvg size={22} />
          </span>
          <span className="biometric-login-copy">
            <span className="biometric-login-label">
              {biometricLoading ? "Verificando…" : "Ingresar con biometria"}
            </span>
            <span className="biometric-login-email">
              {truncateEmail(biometricMeta.email)}
            </span>
          </span>
        </button>

        {status.error ? <p className="error-banner">{status.error}</p> : null}

        <button
          className="biometric-switch-link"
          type="button"
          onClick={handleUsePassword}
        >
          Usar otra cuenta o contrasena
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          required
        />
      </label>

      <p className="auth-helper-text">
        Si ya tenes acceso aprobado, ingresá normalmente. Si olvidaste tu contrasena, usá el enlace de recuperacion.
      </p>

      {status.success ? <p className="success-banner">{status.success}</p> : null}
      {status.error   ? <p className="error-banner">{status.error}</p>   : null}

      <button className="primary-button" type="submit" disabled={status.loading}>
        {status.loading ? "Ingresando..." : "Ingresar"}
      </button>

      <button
        className="secondary-button"
        type="button"
        disabled={status.recoveryLoading}
        onClick={handleForgotPassword}
      >
        {status.recoveryLoading ? "Enviando enlace..." : "Olvide mi contrasena"}
      </button>
    </form>
  );
}
