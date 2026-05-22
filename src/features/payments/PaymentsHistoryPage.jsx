import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../components/DataTable";
import { SectionCard } from "../../components/SectionCard";
import { PAYMENT_METHOD_OPTIONS } from "../../lib/appSettings";
import { formatCurrency, formatDate, MONTH_NAMES } from "../../lib/format";

const PAGE_SIZE = 50;

function downloadExcelCompatibleCsv(rows) {
  const header = ["Socio", "Mes", "Ano", "Monto", "Forma de pago", "Fecha", "Observaciones"];
  const lines = rows.map((payment) =>
    [
      payment.memberName,
      MONTH_NAMES[payment.month - 1],
      payment.year,
      payment.amount,
      payment.paymentMethod,
      payment.paymentDate,
      payment.notes ?? "",
    ]
      .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
      .join(","),
  );
  const csvContent = `﻿${header.join(",")}\n${lines.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pagos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getRelativeMonthFilter(value) {
  const now = new Date();

  if (value === "current") {
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  if (value === "previous") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { month: previousMonth.getMonth() + 1, year: previousMonth.getFullYear() };
  }

  return null;
}

export function PaymentsHistoryPage({ appData, appSettings, view }) {
  const initialMonthFilter = view?.monthFilter ?? "all";
  const [memberFilter, setMemberFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(initialMonthFilter);
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const enabledMethods = useMemo(
    () => PAYMENT_METHOD_OPTIONS.filter((method) => appSettings.paymentMethods?.[method.key]),
    [appSettings],
  );

  const filteredRows = useMemo(() => {
    const relativeMonthFilter = getRelativeMonthFilter(monthFilter);

    return appData.payments.filter((payment) => {
      const matchesMember = memberFilter === "all" || String(payment.memberId) === memberFilter;
      const matchesMonth =
        monthFilter === "all" ||
        (relativeMonthFilter
          ? payment.month === relativeMonthFilter.month && payment.year === relativeMonthFilter.year
          : String(payment.month) === monthFilter);
      const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;
      const matchesDateFrom = !dateFrom || payment.paymentDate >= dateFrom;
      const matchesDateTo = !dateTo || payment.paymentDate <= dateTo;
      return matchesMember && matchesMonth && matchesMethod && matchesDateFrom && matchesDateTo;
    });
  }, [appData.payments, memberFilter, monthFilter, methodFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  useEffect(() => {
    setMonthFilter(initialMonthFilter);
  }, [initialMonthFilter]);

  useEffect(() => {
    setPage(1);
  }, [memberFilter, monthFilter, methodFilter, dateFrom, dateTo]);

  const totalFiltered = filteredRows.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <SectionCard
      title="Historial completo"
      subtitle="Pagos con filtros por socio, mes, forma de pago y rango de fechas."
      actions={
        <div className="toolbar history-toolbar">
          <select className="filter-select" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
            <option value="all">Todos los socios</option>
            {appData.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </select>
          <select className="filter-select" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Todos los meses</option>
            <option value="current">Mes actual</option>
            <option value="previous">Mes anterior</option>
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select className="filter-select" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option value="all">Todas las formas</option>
            {enabledMethods.map((method) => (
              <option key={method.key} value={method.label}>
                {method.label}
              </option>
            ))}
          </select>
          <input className="filter-select" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className="filter-select" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <button className="secondary-button" type="button" onClick={() => downloadExcelCompatibleCsv(filteredRows)}>
            Exportar Excel
          </button>
        </div>
      }
    >
      <div className="history-summary">
        <div className="members-count-chip">{filteredRows.length} pagos filtrados</div>
        <div className="history-total-card">
          <span>Total filtrado</span>
          <strong>{formatCurrency(totalFiltered)}</strong>
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="crm-panel-pagination" style={{ marginBottom: "0.75rem" }}>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span>
            {page} / {pageCount}
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
      ) : null}

      <DataTable
        columns={[
          { key: "memberName", label: "Socio" },
          { key: "month", label: "Mes", render: (row) => MONTH_NAMES[row.month - 1] },
          { key: "year", label: "Ano" },
          { key: "amount", label: "Monto", render: (row) => formatCurrency(row.amount) },
          { key: "paymentMethod", label: "Forma de pago" },
          { key: "paymentDate", label: "Fecha", render: (row) => formatDate(row.paymentDate) },
        ]}
        rows={paginatedRows}
        emptyMessage="No hay pagos que coincidan con los filtros aplicados."
      />
    </SectionCard>
  );
}
