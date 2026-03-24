import { SetPasswordForm } from "./SetPasswordForm";

export function ResetPasswordPage({ authError, authEvent, hasSession, loading }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p className="eyebrow">DataDay Cuotas</p>
            <h1>Restablece tu contrasena</h1>
            <p className="auth-subtitle">
              Define una nueva contrasena para volver a entrar a la plataforma sin depender de enlaces manuales.
            </p>
          </div>
        </div>

        {authError ? <p className="error-banner">{authError}</p> : null}
        <SetPasswordForm authEvent={authEvent} hasSession={hasSession} loading={loading} />
      </div>
    </div>
  );
}
