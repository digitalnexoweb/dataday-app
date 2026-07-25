import { useEffect, useState } from "react";

const TITLES = {
  dashboard: "Dashboard general",
  members: "Socios y alumnos",
  "member-detail": "Ficha individual",
  "member-form": "Gestion de socios",
  "register-payment": "Registrar pago",
  "payments-history": "Historial de pagos",
  "admin-requests": "Solicitudes de acceso",
  settings: "Configuracion",
};

export function Header({
  currentSection,
  selectedMember,
  onNavigate,
  appSettings,
  authState,
  availableClubs,
  selectedClubId,
  onSelectClub,
  activeClubName,
  activeClub,
  isAllClubsView,
  theme,
  onToggleTheme,
}) {
  const title = TITLES[currentSection] ?? "DataDay";
  const isSuperAdmin = authState?.profile?.role === "superadmin";
  const showOperationalActions = !isSuperAdmin || !isAllClubsView;
  const [clubLogoVisible, setClubLogoVisible] = useState(Boolean(activeClub?.logoSrc));

  useEffect(() => {
    setClubLogoVisible(Boolean(activeClub?.logoSrc));
  }, [activeClub?.logoSrc]);

  const subtitle = selectedMember && currentSection === "member-detail"
    ? selectedMember.fullName
    : isSuperAdmin
      ? `${activeClubName} ${isAllClubsView ? "en vista global para supervision." : "listo para operar como un club activo."}`
      : `${appSettings?.clubName || "Operacion local"} lista para cobrar y hacer seguimiento.`;

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Gestion de cuotas</p>
        <h1>{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>
      <div className="topbar-actions">
        {onToggleTheme ? (
          <button
            className={`theme-toggle ${theme === "dark" ? "is-dark" : "is-light"}`}
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={onToggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 100 11 6 6 0 007-4z" />
                  <path d="M11.2 2.2l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" fill="currentColor" stroke="none" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="3.3" />
                  <path d="M8 1.2v1.4M8 13.4V14.8M1.2 8h1.4M13.4 8H14.8M3.1 3.1l1 1M11.9 11.9l1 1M3.1 12.9l1-1M11.9 4.1l1-1" />
                </svg>
              )}
            </span>
            <span className="theme-toggle-knob" aria-hidden="true" />
          </button>
        ) : null}
        {authState?.profile ? (
          <div className={isSuperAdmin ? "club-switcher is-interactive" : "club-switcher"} aria-label="Club activo">
            <div className="club-switcher-badge">
              <div className="club-switcher-avatar" aria-hidden="true">
                {clubLogoVisible ? (
                  <img
                    src={activeClub?.logoSrc}
                    alt={`Logo de ${activeClub?.name ?? activeClubName}`}
                    className="club-switcher-avatar-image"
                    onError={() => setClubLogoVisible(false)}
                  />
                ) : (
                  <span className="club-switcher-avatar-fallback">{activeClub?.initials ?? "CL"}</span>
                )}
              </div>
              <div className="club-switcher-copy">
                <span className="club-switcher-label">{isSuperAdmin ? "Vista actual" : "Institucion"}</span>
                <strong>{activeClub?.name ?? activeClubName}</strong>
              </div>
              {isSuperAdmin ? <span className="club-switcher-chevron" aria-hidden="true">&#9662;</span> : null}
            </div>
            {isSuperAdmin ? (
              <select
                className="club-switcher-select"
                value={selectedClubId}
                onChange={(event) => onSelectClub(event.target.value)}
                aria-label="Cambiar club"
              >
                <option value="">Todos los clubes</option>
                {availableClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ) : null}
        {isSuperAdmin ? (
          <button
            className="secondary-button"
            onClick={() => onNavigate({ section: "admin-requests", memberId: null })}
          >
            Ver solicitudes
          </button>
        ) : null}
        {showOperationalActions ? (
          <>
            <button
              className="secondary-button"
              onClick={() => onNavigate({ section: "member-form", memberId: null })}
            >
              Nuevo socio
            </button>
            <button
              className="primary-button"
              onClick={() =>
                onNavigate({
                  section: "register-payment",
                  memberId: selectedMember?.id ?? null,
                })
              }
            >
              Registrar pago
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
