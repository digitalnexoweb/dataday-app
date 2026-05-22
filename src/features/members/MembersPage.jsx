import { useEffect, useMemo, useState } from "react";
import { MemberDetailPanel } from "../../components/MemberDetailPanel";
import { MemberList } from "../../components/MemberList";
import { getCurrentFeeStatus, MONTH_NAMES } from "../../lib/format";
import { getMonthlyFee } from "../../lib/utils";

const PAGE_SIZE = 20;

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildNextDueDate(status, appSettings) {
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), appSettings.dueDay ?? 10);

  if (status === "current") {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  return toLocalIsoDate(dueDate);
}

// Recibe índices pre-calculados para evitar O(N×M) lookups en cada socio.
function buildMemberSummary(member, { paymentsByMemberId, categoryById, medicalRecordByMemberId }, appSettings) {
  const memberPayments = (paymentsByMemberId.get(String(member.id)) ?? [])
    .slice()
    .sort((left, right) => new Date(right.paymentDate) - new Date(left.paymentDate));
  const lastPayment = memberPayments[0] ?? null;
  const category = categoryById.get(String(member.categoryId));
  const monthlyFee = getMonthlyFee(category, appSettings.defaultMonthlyFee);
  const today = new Date();
  const dueDay = appSettings.dueDay ?? 10;
  const paidPeriods = new Set(memberPayments.map((payment) => `${payment.month}-${payment.year}`));
  const enrollmentDate = member.enrollmentDate ? new Date(`${member.enrollmentDate}T00:00:00`) : null;
  const enrollmentYear = enrollmentDate?.getFullYear() ?? today.getFullYear();
  const enrollmentMonth = (enrollmentDate?.getMonth() ?? 0) + 1;
  const currentYear = today.getFullYear();
  const lastChargeableMonth = today.getDate() <= dueDay ? today.getMonth() : today.getMonth() + 1;

  // Deuda multi-año: desde el año de inscripcion hasta el año actual
  const overduePeriods = [];
  for (let year = enrollmentYear; year <= currentYear; year++) {
    const startMonth = year === enrollmentYear ? enrollmentMonth : 1;
    const endMonth = year === currentYear ? lastChargeableMonth : 12;
    if (endMonth <= 0) continue;
    for (let month = startMonth; month <= endMonth; month++) {
      if (!paidPeriods.has(`${month}-${year}`)) {
        overduePeriods.push({ month, year });
      }
    }
  }

  const baseDebt = monthlyFee * overduePeriods.length;
  const surcharge = overduePeriods.length > 0 ? baseDebt * ((appSettings.lateFeePercent ?? 0) / 100) : 0;
  const pendingDebt = baseDebt + surcharge;
  const medicalRecord = medicalRecordByMemberId.get(String(member.id)) ?? null;
  const currencyFormatter = new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });

  return {
    ...member,
    payments: memberPayments,
    medicalRecord,
    accountStatus: getCurrentFeeStatus(member, memberPayments, { dueDay }),
    lastPaymentLabel: lastPayment?.paymentDate
      ? new Intl.DateTimeFormat("es-UY").format(new Date(`${lastPayment.paymentDate}T00:00:00`))
      : "Sin registro",
    nextDueLabel: new Intl.DateTimeFormat("es-UY").format(new Date(`${buildNextDueDate(member.accountStatus, appSettings)}T00:00:00`)),
    monthlyFee,
    monthlyFeeLabel: monthlyFee > 0 ? currencyFormatter.format(monthlyFee) : "Sin definir",
    pendingDebt,
    pendingDebtLabel: pendingDebt > 0 ? currencyFormatter.format(pendingDebt) : "Sin deuda",
    pendingMonths: overduePeriods.map(({ month, year }) => `${MONTH_NAMES[month - 1]} ${year}`),
  };
}

export function MembersPage({
  view,
  appData,
  appSettings,
  onNavigate,
  canManageClubScopedData,
  isAllClubsView,
  activeClubName,
  selectedMember,
  onSaveMedicalRecord,
  onToggleMemberActive,
}) {
  const initialStatusFilter = view?.statusFilter ?? "all";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState(selectedMember?.id ?? null);

  const dataIndexes = useMemo(() => {
    const paymentsByMemberId = new Map();
    for (const payment of appData.payments) {
      const key = String(payment.memberId);
      if (!paymentsByMemberId.has(key)) paymentsByMemberId.set(key, []);
      paymentsByMemberId.get(key).push(payment);
    }
    const categoryById = new Map(appData.categories.map((c) => [String(c.id), c]));
    const medicalRecordByMemberId = new Map(
      appData.medicalRecords.map((r) => [String(r.memberId), r]),
    );
    return { paymentsByMemberId, categoryById, medicalRecordByMemberId };
  }, [appData.payments, appData.categories, appData.medicalRecords]);

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
  const membersWithDebt = filteredMembers.filter((member) => member.pendingDebt > 0).length;
  const membersCurrent = filteredMembers.filter((member) => member.pendingDebt <= 0).length;
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  const activeMember = useMemo(
    () => memberSummaries.find((member) => member.id === selectedMemberId) ?? paginatedMembers[0] ?? null,
    [memberSummaries, paginatedMembers, selectedMemberId],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (selectedMember?.id) {
      setSelectedMemberId(selectedMember.id);
    }
  }, [selectedMember?.id]);

  useEffect(() => {
    if (!paginatedMembers.length) {
      setSelectedMemberId(null);
      return;
    }

    const existsInPage = paginatedMembers.some((member) => member.id === selectedMemberId);
    if (!existsInPage) {
      setSelectedMemberId(paginatedMembers[0].id);
    }
  }, [paginatedMembers, selectedMemberId]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <div className="crm-members-shell">
      <div className="crm-members-layout">
        <aside className="crm-members-list-panel">
          <div className="crm-panel-header">
            <div>
              <span>Listado</span>
              <strong>Base de socios</strong>
            </div>
            <div className="crm-panel-pagination">
              <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1}>
                Anterior
              </button>
              <span>
                {page}/{pageCount}
              </span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                disabled={page === pageCount}
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="crm-list-summary">
            <div className="crm-list-summary-card">
              <span>Con deuda</span>
              <strong>{membersWithDebt}</strong>
            </div>
            <div className="crm-list-summary-card">
              <span>Al dia</span>
              <strong>{membersCurrent}</strong>
            </div>
          </div>

          <MemberList
            members={paginatedMembers}
            selectedMemberId={activeMember?.id ?? null}
            onSelect={setSelectedMemberId}
            loading={appData.loading}
          />
        </aside>

        <MemberDetailPanel
          member={activeMember}
          appSettings={appSettings}
          canManageClubScopedData={canManageClubScopedData}
          isAllClubsView={isAllClubsView}
          onEdit={() => activeMember && onNavigate({ section: "member-form", memberId: activeMember.id })}
          onRegisterPayment={() => activeMember && onNavigate({ section: "register-payment", memberId: activeMember.id })}
          onSaveMedicalRecord={onSaveMedicalRecord}
          onToggleMemberActive={onToggleMemberActive}
          topSlot={
            <div className="crm-members-topbar">
              <div className="crm-members-topbar-copy">
                <span>Gestion de cuotas</span>
                <strong>
                  Socios y alumnos
                </strong>
                <p>
                  {isAllClubsView
                    ? "Vista global de socios para supervision ejecutiva."
                    : `Workspace CRM de ${activeClubName}.`}
                </p>
              </div>
              <div className="toolbar members-toolbar crm-members-toolbar">
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
                  placeholder="Buscar por nombre, categoria, telefono o email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="debt">Con deuda</option>
                  <option value="current">Al dia</option>
                  <option value="pending">Proximo a vencer</option>
                  <option value="late">Atrasados</option>
                  <option value="inactive">Archivados</option>
                </select>
                <div className="members-count-chip">
                  {filteredMembers.length} {filteredMembers.length === 1 ? "socio" : "socios"}
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
