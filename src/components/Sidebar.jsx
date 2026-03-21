const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Socios / Alumnos" },
  { id: "register-payment", label: "Registrar pagos" },
  { id: "payments-history", label: "Historial de pagos" },
  { id: "settings", label: "Configuracion" },
];

export function Sidebar({ currentSection, onNavigate, authState, isSuperAdmin, onLogout }) {
  const navItems = isSuperAdmin
    ? [...NAV_ITEMS, { id: "admin-requests", label: "Solicitudes" }]
    : NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="brand-card">
        <div className="brand-lockup">
          <div className="brand-badge" aria-label="Data Day">
            <img src="/android-chrome-192x192.png" alt="Logo de Data Day" className="brand-badge-image" />
          </div>
          <div className="brand-copy">
            <strong>DATA DAY</strong>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={item.id === currentSection ? "nav-item active" : "nav-item"}
            onClick={() => onNavigate({ section: item.id, memberId: null })}
          >
            <span className="nav-indicator" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>{authState?.profile?.email ?? "Acceso local"}</p>
        <small>{isSuperAdmin ? "Modo administrador principal" : "Espacio del club activo"}</small>
        {authState?.profile && onLogout ? (
          <button className="sidebar-logout-button" onClick={onLogout}>
            <span className="sidebar-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path
                  d="M8 4H6.75C5.784 4 5 4.784 5 5.75v8.5C5 15.216 5.784 16 6.75 16H8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 6.5L14.5 10L11 13.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14.25 10H8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Salir
          </button>
        ) : null}
      </div>
    </aside>
  );
}
