# Mobile UI Declutter — Audit

Scope: interface/layout quality on mobile (≤768px). No changes to colors, themes,
CSS custom properties, business logic, RLS, or data model. Desktop untouched.
Branch: `claude/datay-user-count-wcg0c6`.

| Req | Status | Files changed | Notes |
|-----|--------|---------------|-------|
| R1 — Slim mobile topbar | ✅ Done | `styles/global.css` (768px block) | CSS-only. Hides `.eyebrow`, `.topbar-subtitle`, and the duplicated `.topbar-actions` CTAs (`Nuevo socio`/`Registrar pago`/`Ver solicitudes`). Keeps title, theme toggle, club-switcher. No component change. |
| R1 decision — club-switcher | ✅ Visible-compact | `styles/global.css` | Stays visible; `.club-switcher-label` hidden, badge padding reduced, `is-interactive` min-width relaxed. Switcher still reachable for superadmin. |
| R2 — Logout out of primary nav | ✅ Done | `components/MobileNav.jsx`, `app/App.jsx`, `features/settings/SettingsPage.jsx`, `styles/global.css` | Removed the 6th "Salir" item (+ unused `authApi` import & `LogoutIcon`). Nav shows 5 items (4 + Solicitudes for superadmin). `.mobile-nav-item` font reverted 0.58rem→0.64rem. |
| R2 decision — logout home | ✅ Settings page | `SettingsPage.jsx`, `App.jsx` | New "Sesion" card with "Cerrar sesion" at bottom of Config; reuses `handleLogout` via `onLogout` prop wired through `screenProps`. |
| R3 — Compact dashboard KPIs | ✅ Done | `styles/global.css` (768px block) | CSS-only. `.stats-grid-3` → featured `Ingreso del mes` full-width (`grid-column: span 2`) + remaining four in 2×2. All `onClick` navigation intact. |
| R4 — Densify payments history | ✅ Done | `features/payments/PaymentsHistoryPage.jsx`, `styles/global.css` | Desktop `DataTable` wrapped in `.payments-desktop-table` (hidden ≤768px, unchanged on desktop). Mobile-only `.payments-mobile-list`: line 1 = socio + amount (emphasized), line 2 = mes/año · fecha, method as muted tag. ~5–7 rows/viewport. Filters/totals/pagination/export untouched. |
| R5 — De-duplicate CTAs | ✅ Verified | — | No screen stranded: Dashboard quick-action tiles; MembersPage own full-width "Nuevo socio"; register-payment page itself. |
| R6 — Tighten topbar rhythm | ✅ Done | `styles/global.css` (768px block) | `.topbar` mobile padding 24/20 → 14/12, margin-bottom 24 → 14. |
| R7 — Accessibility | ✅ Preserved | — | aria-labels/focus kept; ≥44px touch targets on buttons and nav items; compact payment rows are non-interactive (no new tap targets). |

All rules additive inside existing mobile `@media` blocks; desktop layout and both
themes unchanged. Verified with `npm run build` (clean).
