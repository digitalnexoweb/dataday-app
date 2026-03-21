import { useState } from "react";
import { authApi } from "../../lib/authApi";

export function AccessRequestForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    clubName: "",
    phone: "",
    message: "",
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState({ loading: false, message: "", error: "" });

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus({ loading: false, message: "", error: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password.length < 6) {
      setStatus({ loading: false, message: "", error: "La contrasena debe tener al menos 6 caracteres." });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus({ loading: false, message: "", error: "Las contrasenas no coinciden." });
      return;
    }

    setStatus({ loading: true, message: "", error: "" });

    try {
      await authApi.submitAccessRequest(form);
      setStatus({
        loading: false,
        message:
          "Solicitud enviada correctamente. Cuando DigitalNexo apruebe tu acceso, podras entrar con el email y la contrasena que acabas de elegir.",
        error: "",
      });
      setForm({
        fullName: "",
        email: "",
        clubName: "",
        phone: "",
        message: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setStatus({ loading: false, message: "", error: error.message });
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Nombre completo
        <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
      </label>

      <label>
        Email
        <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
      </label>

      <label>
        Club / academia / institucion
        <input value={form.clubName} onChange={(event) => updateField("clubName", event.target.value)} required />
      </label>

      <label>
        Telefono
        <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
      </label>

      <label>
        Mensaje
        <textarea rows="4" value={form.message} onChange={(event) => updateField("message", event.target.value)} />
      </label>

      <label>
        Contrasena
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

      {status.message ? <p className="success-banner">{status.message}</p> : null}
      {status.error ? <p className="error-banner">{status.error}</p> : null}

      <button className="primary-button" type="submit" disabled={status.loading}>
        {status.loading ? "Enviando..." : "Solicitar acceso"}
      </button>
    </form>
  );
}
