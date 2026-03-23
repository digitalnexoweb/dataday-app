import { useState } from "react";
import { authApi } from "../../lib/authApi";

export function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "", recoveryLoading: false });

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus((current) => ({ ...current, error: "", success: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus((current) => ({ ...current, loading: true, error: "", success: "" }));

    try {
      await authApi.signIn(form);
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  async function handleForgotPassword() {
    if (!form.email) {
      setStatus((current) => ({
        ...current,
        error: "Ingresa tu email para enviarte el enlace de recuperacion.",
        success: "",
      }));
      return;
    }

    setStatus((current) => ({ ...current, recoveryLoading: true, error: "", success: "" }));

    try {
      await authApi.requestPasswordSetup(form.email);
      setStatus((current) => ({
        ...current,
        recoveryLoading: false,
        success: "Te enviamos un enlace para restablecer tu contrasena.",
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        recoveryLoading: false,
        error: error.message,
      }));
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
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
      {status.error ? <p className="error-banner">{status.error}</p> : null}

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
