import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { formatCurrency, MONTH_NAMES } from "../../lib/format";

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

function getMonthlyFee(category, fallbackFee) {
  return Number(category?.monthlyFee ?? category?.monthly_fee ?? fallbackFee ?? 0);
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
  const { members, payments, categories } = appData;
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
  const maxCategoryCount = Math.max(...categoryEntries.map(([, count]) => count), 1);
  const monthlySeries = useMemo(() => buildMonthlySeries(payments), [payments]);
  const maxSeries = Math.max(...monthlySeries.map((item) => item.total), 1);
  const lateMembersPreview = members
    .filter((member) => member.accountStatus === "late")
    .slice(0, 4);
  const revenueChangeLabel = `${metrics.revenueChange >= 0 ? "+" : ""}${metrics.revenueChange.toFixed(0)}% respecto a ${
    MONTH_NAMES[metrics.previousPeriod.month - 1]
  }`;
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

  const selectedDay = calendarData.days.find((day) => day.isoDate === selectedDateKey) ?? calendarData.days[0] ?? null;
  const selectedDayItems = selectedDay?.items ?? [];
  const calendarTitle = `${MONTH_NAMES[visibleMonthDate.getMonth()]} ${visibleMonthDate.getFullYear()}`;

  return (
    <div className="page-grid dashboard-grid">
      <div className="stats-grid stats-grid-expanded">
        <StatCard
          label="Total socios/alumnos"
          value={metrics.totalMembers}
          trend="Base actual"
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "all" })}
        />
        <StatCard
          label="Socios activos"
          value={metrics.currentMembers}
          trend="Al dia y operativos"
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "current" })}
        />
        <StatCard
          label="Socios con deuda"
          value={metrics.pendingCount}
          trend="Seguimiento prioritario"
          emphasis={metrics.pendingCount > 0 ? "warning" : "neutral"}
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "debt" })}
        />
        <StatCard
          label="Socios atrasados"
          value={metrics.lateMembers}
          trend="Requieren seguimiento"
          emphasis={metrics.lateMembers > 0 ? "danger" : "neutral"}
          onClick={() => onNavigate({ section: "members", memberId: null, statusFilter: "late" })}
        />
        <StatCard
          label="Ingreso del mes"
          value={formatCurrency(metrics.currentRevenue)}
          trend={revenueChangeLabel}
          accent="orange"
          emphasis={metrics.revenueChange >= 0 ? "success" : "danger"}
          featured
          onClick={() => onNavigate({ section: "payments-history", memberId: null, monthFilter: "current" })}
        />
        <StatCard
          label="Ingreso mes anterior"
          value={formatCurrency(metrics.previousRevenue)}
          trend={MONTH_NAMES[metrics.previousPeriod.month - 1]}
          onClick={() => onNavigate({ section: "payments-history", memberId: null, monthFilter: "previous" })}
        />
      </div>

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
                <strong>Agregar socio</strong>
                <span>Alta directa para ampliar la base de alumnos.</span>
              </button>
              <button
                className="action-tile"
                onClick={() => onNavigate({ section: "register-payment", memberId: null })}
                disabled={!canManageClubScopedData}
              >
                <strong>Registrar pago</strong>
                <span>Carga rapida con actualizacion inmediata del estado.</span>
              </button>
              <button
                className="action-tile"
                onClick={() => onNavigate({ section: "payments-history", memberId: null })}
              >
                <strong>Ver historial</strong>
                <span>Consulta filtrada y exportable para administracion.</span>
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Alerta de morosidad"
            subtitle="Seguimiento rapido de socios con deuda activa."
            actions={
              <button className="primary-button" onClick={() => onNavigate({ section: "members", memberId: null })}>
                Ver lista
              </button>
            }
          >
            <div className="alert-card">
              <div>
                <p className="alert-card-label">Socios con deuda</p>
                <strong>{metrics.pendingCount}</strong>
                <span>Prioriza los atrasados para recuperar ingresos mas rapido.</span>
              </div>
              <div className="alert-card-preview">
                {lateMembersPreview.length > 0 ? (
                  lateMembersPreview.map((member) => <span key={member.id}>{member.fullName}</span>)
                ) : (
                  <span>Sin alertas criticas hoy.</span>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ingresos recientes" subtitle="Montos reales cobrados en los ultimos seis meses.">
            <div className="chart-bars chart-bars-wide">
              {monthlySeries.map((item) => (
                <div key={item.label} className="bar-column">
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max((item.total / maxSeries) * 100, item.total > 0 ? 14 : 4)}%` }}
                    />
                  </div>
                  <strong>{item.label}</strong>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
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
                    <span style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
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
                <i className="status-dot overdue" /> Vencidos
              </span>
              <span className="calendar-legend-item">
                <i className="status-dot upcoming" /> Proximos
              </span>
              <span className="calendar-legend-item">
                <i className="status-dot paid" /> Pagados
              </span>
            </div>

            <div className="calendar-summary-strip">
              <div className="calendar-summary-card">
                <span>Vencidos</span>
                <strong>{calendarData.statusCounts.overdue}</strong>
              </div>
              <div className="calendar-summary-card">
                <span>Proximos</span>
                <strong>{calendarData.statusCounts.upcoming}</strong>
              </div>
              <div className="calendar-summary-card">
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
                          {counts.overdue > 0 ? <i className="status-dot overdue" /> : null}
                          {counts.upcoming > 0 ? <i className="status-dot upcoming" /> : null}
                          {counts.paid > 0 ? <i className="status-dot paid" /> : null}
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
