import { useState } from "react";
import { AccessRequestForm } from "./AccessRequestForm";
import { LoginForm } from "./LoginForm";
import { SetPasswordForm } from "./SetPasswordForm";
import { authApi } from "../../lib/authApi";

export function AuthPage({ authError }) {
  const [mode, setMode] = useState("login");
  const isPasswordRecovery = authApi.isPasswordRecoveryFlow();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p className="eyebrow">DataDay Cuotas</p>
            <h1>
              {isPasswordRecovery ? "Crea tu contrasena" : mode === "login" ? "Ingresa a tu club" : "Solicita acceso"}
            </h1>
            <p className="auth-subtitle">
              {isPasswordRecovery
                ? "Activa tu acceso definiendo una contrasena propia para entrar a la plataforma."
                : "Plataforma con acceso controlado por DigitalNexo para clubes, academias e institutos."}
            </p>
          </div>
          {!isPasswordRecovery ? (
            <div className="auth-hero-logo" aria-label="Logo de Data Day">
              <img src="/android-chrome-192x192.png" alt="Logo de Data Day" className="auth-hero-logo-image" />
            </div>
          ) : null}
        </div>

        {!isPasswordRecovery ? (
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "secondary-button auth-tab active" : "secondary-button auth-tab"}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "secondary-button auth-tab active" : "secondary-button auth-tab"}
              onClick={() => setMode("register")}
              type="button"
            >
              Solicitar acceso
            </button>
          </div>
        ) : null}

        {authError ? <p className="error-banner">{authError}</p> : null}
        {isPasswordRecovery ? <SetPasswordForm /> : mode === "login" ? <LoginForm /> : <AccessRequestForm />}
      </div>
    </div>
  );
}
