import { useState } from "react";
import { authApi } from "../../lib/authApi";

export function SetPasswordForm() {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState({ loading: false, success: "", error: "" });

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
        success: "Contrasena actualizada correctamente. Redirigiendo...",
        error: "",
      });

      window.setTimeout(() => {
        authApi.clearAuthRedirectUrl();
        window.location.replace(`${window.location.origin}${window.location.pathname}`);
      }, 1400);
    } catch (error) {
      setStatus({ loading: false, success: "", error: error.message });
    }
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
