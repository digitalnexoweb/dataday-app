import { lazy, Suspense, useState } from "react";
import { AccessRequestForm } from "./AccessRequestForm";
import { LoginForm } from "./LoginForm";
import { SetPasswordForm } from "./SetPasswordForm";
import { authApi } from "../../lib/authApi";

// Carga diferida: `ogl` (~50 KB) queda en su propio chunk, asi el formulario
// de login se pinta al instante y las particulas entran despues.
const Particles = lazy(() => import("../../components/Particles"));

const matches = (query) =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches);

// Se evaluan una sola vez por carga de pagina.
const prefersReducedMotion = matches("(prefers-reduced-motion: reduce)");
const isSmallScreen = matches("(max-width: 768px)");

export function AuthPage({ authError, theme }) {
  const [mode, setMode] = useState("login");
  const isPasswordRecovery = authApi.isPasswordRecoveryFlow();

  // El violeta elegido se ve muy bien sobre el fondo claro, pero se apaga
  // sobre el oscuro: ahi se usa el mismo tono, un paso mas luminoso.
  const particleColor = theme === "light" ? "#6423d1" : "#8B5CF6";

  return (
    <div className="auth-shell auth-shell-particles">
      {!prefersReducedMotion ? (
        <div className="auth-particles" aria-hidden="true">
          <Suspense fallback={null}>
            <Particles
              particleColors={[particleColor]}
              particleCount={isSmallScreen ? 120 : 200}
              particleSpread={10}
              speed={0.1}
              particleBaseSize={200}
              moveParticlesOnHover
              alphaParticles={false}
              disableRotation={false}
              pixelRatio={isSmallScreen ? 1 : 2}
            />
          </Suspense>
        </div>
      ) : null}

      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p className="eyebrow">DataDay Cuotas</p>
            <h1>
              {isPasswordRecovery ? "Restablece tu contrasena" : mode === "login" ? "Ingresa a tu club" : "Solicita acceso"}
            </h1>
            <p className="auth-subtitle">
              {isPasswordRecovery
                ? "Defini una nueva contrasena para volver a entrar a la plataforma."
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
              className={mode === "login" ? "auth-tab is-active" : "auth-tab"}
              onClick={() => setMode("login")}
              type="button"
            >
              Iniciar sesión
            </button>
            <button
              className={mode === "register" ? "auth-tab is-active" : "auth-tab"}
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
