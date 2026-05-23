const ICONS = {
  dashboard: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="7" height="7" rx="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 16c0-3.314 2.686-5 6-5s6 1.686 6 5" />
      <path d="M13 3c1.657 0 3 1.343 3 3s-1.343 3-3 3" />
      <path d="M17 16c0-2.21-1.343-4-3-4" />
    </svg>
  ),
  "register-payment": (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="16" height="12" rx="2" />
      <path d="M1 7h16" />
      <path d="M5 11h2M9 11h4" />
    </svg>
  ),
  "payments-history": (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h14M2 9h10M2 14h7" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.42 1.42M13.54 13.54l1.41 1.41M14.95 3.05l-1.42 1.42M4.46 13.54l-1.41 1.41" />
    </svg>
  ),
  "admin-requests": (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1L11.47 6.02L17 6.82L13 10.72L13.94 16.2L9 13.6L4.06 16.2L5 10.72L1 6.82L6.53 6.02Z" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: "dashboard",         label: "Dashboard" },
  { id: "members",           label: "Socios / Alumnos" },
  { id: "register-payment",  label: "Registrar pagos" },
  { id: "payments-history",  label: "Historial" },
  { id: "settings",          label: "Configuración" },
];

export function Sidebar({ currentSection, onNavigate, authState, isSuperAdmin, onLogout }) {
  const navItems = isSuperAdmin
    ? [...NAV_ITEMS, { id: "admin-requests", label: "Solicitudes" }]
    : NAV_ITEMS;

  const email = authState?.profile?.email ?? "";
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <aside className="sidebar">
      <div className="brand-card">
        <div className="brand-lockup">
          <div className="brand-badge" aria-label="Data Day">
            <img src="/android-chrome-192x192.png" alt="" className="brand-badge-image" />
          </div>
          <div className="brand-copy">
            <strong>DATA DAY</strong>
            <span>Gestión de cuotas</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={item.id === currentSection ? "nav-item is-active" : "nav-item"}
            onClick={() => onNavigate({ section: item.id, memberId: null })}
            aria-current={item.id === currentSection ? "page" : undefined}
          >
            <span className="nav-item-icon" aria-hidden="true">
              {ICONS[item.id]}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {authState?.profile ? (
          <div className="sidebar-footer-user">
            <div className="sidebar-footer-user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="sidebar-footer-user-info">
              <span className="sidebar-footer-user-name">
                {email || "Usuario"}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-faint)", display: "block" }}>
                {isSuperAdmin ? "Superadmin" : "Club activo"}
              </span>
            </div>
          </div>
        ) : null}

        {authState?.profile && onLogout ? (
          <button className="sidebar-logout-button" onClick={onLogout} aria-label="Cerrar sesión">
            <span className="sidebar-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M7 3.5H4.5A1.5 1.5 0 003 5v8a1.5 1.5 0 001.5 1.5H7" />
                <path d="M10.5 6L14 9.5 10.5 13" />
                <path d="M14 9.5H7" />
              </svg>
            </span>
            Cerrar sesión
          </button>
        ) : null}
      </div>
    </aside>
  );
}
