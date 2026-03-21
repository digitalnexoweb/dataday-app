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
          <button className="theme-toggle" type="button" onClick={onToggleTheme}>
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
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
              className="secondary-button"
              onClick={() => onNavigate({ section: "members", memberId: null })}
            >
              Ver socios
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
