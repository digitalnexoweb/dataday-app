import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../lib/authApi";

export function SetPasswordForm({ authEvent = "", hasSession = false, loading = false }) {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState({ loading: false, success: "", error: "" });
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);

  const canShowForm = useMemo(
    () => isRecoveryReady || authEvent === "PASSWORD_RECOVERY" || hasSession || authApi.hasRecoveryTokens(),
    [authEvent, hasSession, isRecoveryReady],
  );

  useEffect(() => {
    let active = true;

    function markRecoveryReady(eventName, session) {
      if (!active) {
        return;
      }

      const shouldEnableForm =
        eventName === "PASSWORD_RECOVERY" ||
        authApi.hasRecoveryTokens() ||
        (authApi.isResetPasswordRoute() && Boolean(session));

      if (shouldEnableForm) {
        setIsRecoveryReady(true);
      }

      setIsCheckingRecovery(false);
    }

    markRecoveryReady(authEvent, hasSession ? { active: true } : null);

    const { data } = authApi.onAuthStateChange((session, eventName) => {
      markRecoveryReady(eventName, session);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [authEvent, hasSession]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus({ loading: false, success: "", error: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password.length < 6) {
      setStatus({ loading: false, success: "", error: "La contrasena debe tener al menos 6 caracteres." });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus({ loading: false, success: "", error: "Las contrasenas no coinciden." });
      return;
    }

    setStatus({ loading: true, success: "", error: "" });

    try {
      await authApi.updatePassword(form.password);
      setStatus({
        loading: false,
        success: "Contrasena actualizada. Redirigiendo al login...",
        error: "",
      });

      window.setTimeout(async () => {
        await authApi.signOut();
        authApi.clearAuthRedirectUrl("/");
        window.location.replace(`${window.location.origin}/`);
      }, 1400);
    } catch (error) {
      setStatus({ loading: false, success: "", error: error.message });
    }
  }

  if (loading || isCheckingRecovery) {
    return <p className="auth-helper-text">Validando enlace de recuperacion...</p>;
  }

  if (!canShowForm) {
    return (
      <div className="auth-form">
        <p className="error-banner">
          No pudimos validar el enlace de recuperacion. Solicita uno nuevo desde "Olvide mi contrasena".
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Nueva contrasena
        <input
          type="password"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          required
        />
      </label>

      <label>
        Confirmar contrasena
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
          required
        />
      </label>

      {status.success ? <p className="success-banner">{status.success}</p> : null}
      {status.error ? <p className="error-banner">{status.error}</p> : null}

      <button className="primary-button" type="submit" disabled={status.loading}>
        {status.loading ? "Guardando..." : "Guardar nueva contrasena"}
      </button>
    </form>
  );
}
