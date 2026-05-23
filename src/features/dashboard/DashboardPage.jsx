import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { formatCurrency, MONTH_NAMES } from "../../lib/format";
import { getMonthlyFee } from "../../lib/utils";

function getRevenueForPeriod(payments, month, year) {
  return payments
    .filter((payment) => payment.month === month && payment.year === year)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

function getPreviousPeriod(month, year) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }

  return { month: month - 1, year };
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildMetrics(members, payments) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const previousPeriod = getPreviousPeriod(month, year);
  const paidThisMonth = payments.filter((payment) => payment.month === month && payment.year === year);
  const currentRevenue = getRevenueForPeriod(payments, month, year);
  const previousRevenue = getRevenueForPeriod(payments, previousPeriod.month, previousPeriod.year);
  const currentMembers = members.filter((member) => member.accountStatus === "current").length;
  const pendingCount = members.filter((member) => member.accountStatus !== "current").length;
  const lateMembers = members.filter((member) => member.accountStatus === "late").length;
  const revenueChange =
    previousRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  return {
    totalMembers: members.length,
    currentMembers,
    paidThisMonth: paidThisMonth.length,
    pendingCount,
    lateMembers,
    currentRevenue,
    previousRevenue,
    revenueChange,
    month,
    year,
    previousPeriod,
  };
}

function buildMonthlySeries(payments) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const targetMonth = date.getMonth() + 1;
    const targetYear = date.getFullYear();

    return {
      label: `${MONTH_NAMES[targetMonth - 1].slice(0, 3)} ${String(targetYear).slice(-2)}`,
      total: getRevenueForPeriod(payments, targetMonth, targetYear),
    };
  });
}

function buildCalendarData({ members, payments, categories, defaultMonthlyFee, dueDay, visibleMonthDate }) {
  const year = visibleMonthDate.getFullYear();
  const monthIndex = visibleMonthDate.getMonth();
  const month = monthIndex + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const dueDate = new Date(year, monthIndex, Math.min(dueDay, daysInMonth));
  const dueKey = toIsoDate(dueDate);
  const paidMemberIds = new Set(
    payments
      .filter((payment) => payment.month === month && payment.year === year)
      .map((payment) => String(payment.memberId)),
  );

  const dueMembers = members
    .filter((member) => {
      if (!member.enrollmentDate) {
        return true;
      }

      const enrollmentDate = new Date(`${member.enrollmentDate}T00:00:00`);
      return enrollmentDate <= dueDate;
    })
    .map((member) => {
      const category = categories.find((item) => String(item.id) === String(member.categoryId));
      const monthlyFee = getMonthlyFee(category, defaultMonthlyFee);
      const isPaid = paidMemberIds.has(String(member.id));
      let status = "upcoming";

      if (isPaid) {
        status = "paid";
      } else if (dueDate < today && !isSameDay(dueDate, today)) {
        status = "overdue";
      } else if (isSameDay(dueDate, today) && today.getDate() > dueDay) {
        status = "overdue";
      }

      return {
        id: member.id,
        fullName: member.fullName,
        categoryName: member.categoryName,
        monthlyFee,
        status,
      };
    });

  const statusCounts = dueMembers.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { overdue: 0, upcoming: 0, paid: 0 },
  );

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const currentDate = new Date(year, monthIndex, index + 1);
    const isoDate = toIsoDate(currentDate);

    return {
      date: currentDate,
      isoDate,
      dayNumber: index + 1,
      isCurrentMonth: true,
      isToday: isSameDay(currentDate, today),
      items: isoDate === dueKey ? dueMembers : [],
    };
  });

  return {
    days,
    dueMembers,
    dueDate,
    dueKey,
    statusCounts,
  };
}

export function DashboardPage({
  appData,
  appSettings,
  onNavigate,
  canManageClubScopedData,
  isAllClubsView,
  activeClubName,
}) {
  const { members = [], payments = [], categories = [] } = appData;
  const metrics = useMemo(() => buildMetrics(members, payments), [members, payments]);
  const categoryEntries = useMemo(
    () =>
      Object.entries(
        members.reduce((acc, member) => {
          acc[member.categoryName] = (acc[member.categoryName] ?? 0) + 1;
          return acc;
        }, {}),
      ),
    [members],
  );
  const monthlySeries = useMemo(() => buildMonthlySeries(payments), [payments]);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const calendarData = useMemo(
    () =>
      buildCalendarData({
        members,
        payments,
        categories,
        defaultMonthlyFee: appSettings.defaultMonthlyFee,
        dueDay: appSettings.dueDay ?? 10,
        visibleMonthDate,
      }),
    [appSettings.defaultMonthlyFee, appSettings.dueDay, categories, members, payments, visibleMonthDate],
  );
  const [selectedDateKey, setSelectedDateKey] = useState(calendarData.dueKey);
  useEffect(() => {
    setSelectedDateKey(calendarData.dueKey);
  }, [calendarData.dueKey]);

  if (appData.loading) {
    return (
      <div className="auth-shell" style={{ minHeight: "auto", padding: "3rem" }}>
        <p className="auth-helper-text">Cargando datos del dashboard...</p>
      </div>
    );
  }

  const maxCategoryCount = Math.max(...categoryEntries.map(([, count]) => count), 1);
  const maxSeries = Math.max(...monthlySeries.map((item) => item.total), 1);
  const lateNames = members
    .filter((member) => member.accountStatus === "late")
    .map((member) => member.fullName);
  const revenueChangeLabel = `${metrics.revenueChange >= 0 ? "+" : ""}${metrics.revenueChange.toFixed(0)}% respecto a ${
    MONTH_NAMES[metrics.previousPeriod.month - 1]
  }`;
  const selectedDay = calendarData.days.find((day) => day.isoDate === selectedDateKey) ?? calendarData.days[0] ?? null;
  const selectedDayItems = selectedDay?.items ?? [];
  const calendarTitle = `${MONTH_NAMES[visibleMonthDate.getMonth()]} ${visibleMonthDate.getFullYear()}`;

  return (
    <div className="page-grid dashboard-grid">
      <div className="stats-grid-3">
        <StatCard
          label="Ingreso del mes"
          value={formatCurrency(metrics.currentRevenue)}
          trend={revenueChangeLabel}
          accent="orange"
          emphasis={metrics.revenueChange >= 0 ? "success" : "danger"}
          trendDir={metrics.revenueChange >= 0 ? "up" : "down"}
          featured
          wide
          onClick={() => onNavigate({ section: "payments-history", memberId: null, monthFilter: "current" })}
        />
        <StatCard
          label="Ingreso mes anterior"
          value={formatCurrency(metrics.previousRevenue)}
          trend={MONTH_NAMES[metrics.previousPeriod.month - 1]}
          onClick={() => onNavigate({ section: "payments-history", memberId: null, monthFilter: "previous" })}
        />
        <StatCard
          label="Socios activos"
          value={metrics.currentMembers}
          trend="Al dia y operativos"
          trendDir="up"
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "current" })}
        />
        <StatCard
          label="Socios con deuda"
          value={metrics.pendingCount}
          trend="Seguimiento prioritario"
          trendDir={metrics.pendingCount > 0 ? "down" : null}
          emphasis={metrics.pendingCount > 0 ? "warning" : "neutral"}
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "debt" })}
        />
        <StatCard
          label="Socios atrasados"
          value={metrics.lateMembers}
          trend="Requieren seguimiento"
          trendDir={metrics.lateMembers > 0 ? "down" : null}
          emphasis={metrics.lateMembers > 0 ? "danger" : "neutral"}
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "late" })}
        />
      </div>

      {metrics.pendingCount > 0 && (
        <div
          className="alert-ribbon"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "debt" })}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate({ section: "members", memberId: null, statusFilter: "debt" }); }}
        >
          <span className="alert-ribbon-icon" aria-hidden="true">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5L13 12H1L7 1.5z"/><path d="M7 6v2.5"/><circle cx="7" cy="10.2" r="0.6" fill="currentColor" stroke="none"/></svg>
          </span>
          <div className="alert-ribbon-copy">
            <span className="alert-ribbon-title">
              {metrics.pendingCount} {metrics.pendingCount === 1 ? "socio con deuda" : "socios con deuda"} activa
            </span>
            <span className="alert-ribbon-meta">
              Priorizar a {lateNames.slice(0, 2).join(", ")}{lateNames.length > 2 ? ` y ${lateNames.length - 2} más` : ""}
            </span>
          </div>
          <button
            className="primary-button"
            style={{ padding: "7px 14px", fontSize: "0.8rem" }}
            onClick={(e) => { e.stopPropagation(); onNavigate({ section: "members", memberId: null, statusFilter: "debt" }); }}
          >
            Ver lista
          </button>
        </div>
      )}

      <div className="dashboard-main-grid">
        <div className="dashboard-main-column">
          <SectionCard
            title="Accesos rapidos"
            subtitle={
              isAllClubsView
                ? "Vista ejecutiva de toda la cartera. Selecciona un club en el header para operar."
                : `Flujo diario para operar ${activeClubName}.`
            }
          >
            <div className="quick-actions">
              <button
                className="action-tile"
                onClick={() => onNavigate({ section: "member-form", memberId: null })}
                disabled={!canManageClubScopedData}
              >
                <span className="action-tile-icon" aria-hidden="true">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="7" cy="6" r="3"/><path d="M1 16c0-3.314 2.686-5 6-5s6 1.686 6 5"/><path d="M14 4v6M11 7h6"/></svg>
                </span>
                <div className="action-tile-copy">
                  <strong>Agregar socio</strong>
                  <span>Alta directa para ampliar la base.</span>
                </div>
                <span className="action-tile-arrow" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M4.5 2.5l4 3.5-4 3.5"/></svg>
                </span>
              </button>
              <button
                className="action-tile"
                onClick={() => onNavigate({ section: "register-payment", memberId: null })}
                disabled={!canManageClubScopedData}
              >
                <span className="action-tile-icon" aria-hidden="true">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="1" y="3" width="16" height="12" rx="2"/><path d="M1 7h16"/><path d="M5 11h3"/></svg>
                </span>
                <div className="action-tile-copy">
                  <strong>Registrar pago</strong>
                  <span>Carga rapida con actualizacion inmediata.</span>
                </div>
                <span className="action-tile-arrow" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M4.5 2.5l4 3.5-4 3.5"/></svg>
                </span>
              </button>
              <button
                className="action-tile"
                onClick={() => onNavigate({ section: "payments-history", memberId: null })}
              >
                <span className="action-tile-icon" aria-hidden="true">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M2 4h14M2 9h10M2 14h7"/></svg>
                </span>
                <div className="action-tile-copy">
                  <strong>Ver historial</strong>
                  <span>Consulta filtrada y exportable.</span>
                </div>
                <span className="action-tile-arrow" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M4.5 2.5l4 3.5-4 3.5"/></svg>
                </span>
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Ingresos recientes" subtitle="Montos cobrados en los ultimos seis meses. El mes actual destacado en naranja.">
            <div className="chart-bars chart-bars-wide">
              {monthlySeries.map((item, idx) => {
                const isCurrent = idx === monthlySeries.length - 1;
                return (
                  <div key={item.label} className={`bar-column${isCurrent ? " is-current" : ""}`}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: `${Math.max((item.total / maxSeries) * 100, item.total > 0 ? 14 : 4)}%` }}
                      >
                        <span className="bar-value">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                    <strong>{item.label}</strong>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Socios por categoria" subtitle="Vista rapida de distribucion.">
            <div className="category-list">
              {categoryEntries.map(([label, count]) => (
                <div key={label} className="category-row">
                  <div>
                    <strong>{label}</strong>
                    <p>{count} registrados</p>
                  </div>
                  <div className="inline-progress">
                    <span className="inline-progress-fill" style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="dashboard-side-column">
          <SectionCard
            title="Calendario de vencimientos"
            subtitle={`Seguimiento del mes para ${activeClubName}.`}
            className="calendar-card"
            actions={
              <div className="calendar-nav">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                >
                  Anterior
                </button>
                <strong>{calendarTitle}</strong>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                >
                  Siguiente
                </button>
              </div>
            }
          >
            <div className="calendar-legend">
              <span className="calendar-legend-item">
                <i className="status-dot is-overdue" /> Vencidos
              </span>
              <span className="calendar-legend-item">
                <i className="status-dot is-upcoming" /> Próximos
              </span>
              <span className="calendar-legend-item">
                <i className="status-dot is-paid" /> Pagados
              </span>
            </div>

            <div className="calendar-summary-strip">
              <div className="calendar-summary-card is-overdue">
                <span>Vencidos</span>
                <strong>{calendarData.statusCounts.overdue}</strong>
              </div>
              <div className="calendar-summary-card is-upcoming">
                <span>Próximos</span>
                <strong>{calendarData.statusCounts.upcoming}</strong>
              </div>
              <div className="calendar-summary-card is-paid">
                <span>Pagados</span>
                <strong>{calendarData.statusCounts.paid}</strong>
              </div>
            </div>

            <div className="calendar-weekdays">
              {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {Array.from({ length: ((calendarData.dueDate.getDay() + 6) % 7) }, (_, index) => (
                <span key={`offset-${index}`} className="calendar-offset" aria-hidden="true" />
              ))}
              {calendarData.days.map((day) => {
                const counts = day.items.reduce(
                  (acc, item) => {
                    acc[item.status] += 1;
                    return acc;
                  },
                  { overdue: 0, upcoming: 0, paid: 0 },
                );
                const dayTone =
                  counts.overdue > 0 ? "overdue" : counts.upcoming > 0 ? "upcoming" : counts.paid > 0 ? "paid" : "idle";

                return (
                  <button
                    key={day.isoDate}
                    type="button"
                    className={`calendar-day tone-${dayTone}${day.isoDate === selectedDateKey ? " is-selected" : ""}${day.isToday ? " is-today" : ""}`}
                    onClick={() => setSelectedDateKey(day.isoDate)}
                  >
                    <span className="calendar-day-number">{day.dayNumber}</span>
                    {day.items.length > 0 ? (
                      <>
                        <span className="calendar-day-count">{day.items.length} venc.</span>
                        <span className="calendar-day-markers" aria-hidden="true">
                          {counts.overdue > 0 ? <i className="status-dot is-overdue" /> : null}
                          {counts.upcoming > 0 ? <i className="status-dot is-upcoming" /> : null}
                          {counts.paid > 0 ? <i className="status-dot is-paid" /> : null}
                        </span>
                      </>
                    ) : (
                      <span className="calendar-day-empty">Sin movimientos</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="calendar-detail-panel">
              <div className="calendar-detail-header">
                <div>
                  <span>Detalle del dia</span>
                  <strong>
                    {selectedDay
                      ? `${selectedDay.dayNumber} de ${MONTH_NAMES[visibleMonthDate.getMonth()]}`
                      : "Selecciona un dia"}
                  </strong>
                </div>
                {selectedDayItems.length > 0 ? (
                  <span className="calendar-detail-count">
                    {selectedDayItems.length} {selectedDayItems.length === 1 ? "socio" : "socios"}
                  </span>
                ) : null}
              </div>

              {selectedDayItems.length > 0 ? (
                <div className="calendar-agenda-list">
                  {selectedDayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="calendar-agenda-item"
                      onClick={() => onNavigate({ section: "member-detail", memberId: item.id })}
                    >
                      <div>
                        <strong>{item.fullName}</strong>
                        <p>{item.categoryName}</p>
                      </div>
                      <div className="calendar-agenda-meta">
                        <span className={`agenda-status status-${item.status}`}>
                          {item.status === "paid"
                            ? "Pagado"
                            : item.status === "overdue"
                              ? "Vencido"
                              : "Proximo"}
                        </span>
                        <small>{formatCurrency(item.monthlyFee)}</small>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="calendar-empty-state">
                  <strong>Sin vencimientos cargados para este dia.</strong>
                  <p>Haz click en el dia marcado de la cuota para ver a quien seguir o quien ya pago.</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
