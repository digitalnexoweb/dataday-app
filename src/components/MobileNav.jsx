const MOBILE_NAV_ITEMS = [
  { id: "dashboard", label: "Inicio" },
  { id: "members", label: "Socios" },
  { id: "register-payment", label: "Pagos" },
  { id: "payments-history", label: "Historial" },
  { id: "settings", label: "Config" },
];

function getIcon(itemId) {
  if (itemId === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13.5h6.5V20H4v-6.5ZM13.5 4H20v9h-6.5V4ZM13.5 16h6.5v4h-6.5v-4ZM4 4h6.5v6.5H4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (itemId === "members") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16.5 20a4.5 4.5 0 0 0-9 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (itemId === "register-payment") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7.5h16v9H4v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 12h8M12 8.5v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (itemId === "payments-history") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM5.25 10.5a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm13.5 0a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM12 15.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z" fill="currentColor" />
    </svg>
  );
}

export function MobileNav({ currentSection, onNavigate, isSuperAdmin }) {
  const navItems = isSuperAdmin
    ? [...MOBILE_NAV_ITEMS.slice(0, 4), { id: "admin-requests", label: "Solicitudes" }]
    : MOBILE_NAV_ITEMS;

  return (
    <nav className="mobile-nav" aria-label="Navegacion principal movil">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === currentSection ? "mobile-nav-item is-active" : "mobile-nav-item"}
          onClick={() => onNavigate({ section: item.id, memberId: null })}
        >
          <span className="mobile-nav-icon">{getIcon(item.id)}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
