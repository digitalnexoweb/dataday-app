import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { MemberCard } from "../../components/MemberCard";
import { StatusBadge } from "../../components/StatusBadge";
import { buildDataIndexes, buildMemberSummary } from "../../lib/memberUtils";

const PAGE_SIZE = 20;
const VIEW_MODE_KEY = "dataday:membersView";

export function MembersPage({
  view,
  appData,
  appSettings,
  onNavigate,
  canManageClubScopedData,
  isAllClubsView,
  activeClubName,
}) {
  const initialStatusFilter = view?.statusFilter ?? "all";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) ?? "grid";
    } catch {
      return "grid";
    }
  });

  function handleSetViewMode(mode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  }

  const dataIndexes = useMemo(
    () => buildDataIndexes(appData.payments, appData.categories, appData.medicalRecords, appData.credits ?? []),
    [appData.payments, appData.categories, appData.medicalRecords],
  );

  const memberSummaries = useMemo(
    () => appData.members.map((member) => buildMemberSummary(member, dataIndexes, appSettings)),
    [appData.members, dataIndexes, appSettings],
  );

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return memberSummaries
      .filter((member) => {
        if (statusFilter === "inactive") return !member.active;
        if (!member.active) return false;
        const haystack = [member.fullName, member.phone, member.email, member.categoryName].join(" ").toLowerCase();
        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "debt" && member.pendingDebt > 0) ||
          member.accountStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const statusPriority = { late: 0, pending: 1, current: 2 };
        if (statusPriority[left.accountStatus] !== statusPriority[right.accountStatus]) {
          return statusPriority[left.accountStatus] - statusPriority[right.accountStatus];
        }
        return left.fullName.localeCompare(right.fullName, "es");
      });
  }, [memberSummaries, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { setStatusFilter(initialStatusFilter); }, [initialStatusFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  function handleOpenMember(id) {
    onNavigate({ section: "member-detail", memberId: id });
  }

  function handleRegisterPayment(id) {
    onNavigate({ section: "register-payment", memberId: id });
  }

  return (
    <div className="members-page">
      <div className="members-page-header">
        <div className="members-page-title">
          <h2>Socios</h2>
          {!isAllClubsView && <span>{activeClubName}</span>}
        </div>
        <div className="members-page-toolbar">
          <button
            className="primary-button"
            type="button"
            onClick={() => onNavigate({ section: "member-form", memberId: null })}
            disabled={!canManageClubScopedData}
          >
            Nuevo socio
          </button>
          <input
            className="search-input"
            placeholder="Nombre, categoria, telefono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="debt">Con deuda</option>
            <option value="current">Al dia</option>
            <option value="pending">Proximo a vencer</option>
            <option value="late">Atrasados</option>
            <option value="inactive">Archivados</option>
          </select>
          <span className="members-count-chip">
            {filteredMembers.length} {filteredMembers.length === 1 ? "socio" : "socios"}
          </span>
          <div className="view-toggle" role="group" aria-label="Modo de vista">
            <button
              className={`view-toggle-btn${viewMode === "grid" ? " is-active" : ""}`}
              type="button"
              title="Vista grilla"
              onClick={() => handleSetViewMode("grid")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" aria-hidden="true">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              className={`view-toggle-btn${viewMode === "list" ? " is-active" : ""}`}
              type="button"
              title="Vista lista"
              onClick={() => handleSetViewMode("list")}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" aria-hidden="true">
                <path d="M1 4h14M1 8h14M1 12h14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {appData.loading ? (
        <p className="auth-helper-text" style={{ padding: "2rem" }}>Cargando socios...</p>
      ) : filteredMembers.length === 0 ? (
        <div className="members-empty-state">
          <p>No hay socios que coincidan con los filtros aplicados.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="member-grid">
          {paginatedMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onOpen={handleOpenMember}
              onRegisterPayment={handleRegisterPayment}
              canRegisterPayment={canManageClubScopedData}
            />
          ))}
        </div>
      ) : (
        <div className="member-list-table">
          <div className="member-list-header">
            <span>Socio</span>
            <span>Estado</span>
            <span>Cuota</span>
            <span>Deuda</span>
            <span>Ultimo pago</span>
            <span>Acciones</span>
          </div>
          {paginatedMembers.map((member) => (
            <div key={member.id} className="member-list-row">
              <div className="member-list-row-identity">
                <Avatar name={member.fullName} src={member.photoUrl} size={36} />
                <div>
                  <strong>{member.fullName}</strong>
                  <p>{member.categoryName}</p>
                </div>
              </div>
              <StatusBadge status={member.accountStatus} />
              <span className="member-list-row-mono member-list-col-fee">{member.monthlyFeeLabel}</span>
              <span className={`member-list-row-mono member-list-col-debt${member.pendingDebt > 0 ? " debt-highlight" : ""}`}>
                {member.pendingDebtLabel}
              </span>
              <span className="member-list-row-mono member-list-col-lastpay">{member.lastPaymentLabel}</span>
              <div className="member-list-row-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleOpenMember(member.id)}
                >
                  Ver ficha
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleRegisterPayment(member.id)}
                  disabled={!canManageClubScopedData}
                >
                  Pagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="members-pagination">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span>{page} de {pageCount}</span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
            disabled={page === pageCount}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
