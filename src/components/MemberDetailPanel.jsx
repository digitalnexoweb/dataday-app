import { Fragment, useEffect, useMemo, useState } from "react";
import { PAYMENT_METHOD_OPTIONS } from "../lib/appSettings";
import { StatusBadge } from "./StatusBadge";
import { Tabs } from "./Tabs";
import { formatCurrency, formatDate, MONTH_NAMES } from "../lib/format";

const DETAIL_TABS = [
  { id: "summary", label: "Resumen" },
  { id: "payments", label: "Pagos" },
  { id: "debt", label: "Deuda" },
  { id: "personal", label: "Datos personales" },
  { id: "health", label: "Salud" },
];

function formatOptionalDate(value) {
  return value ? formatDate(value) : "Sin registro";
}

function buildMedicalForm(record) {
  return {
    restrictions: record?.restrictions ?? "",
    conditions: record?.conditions ?? "",
    allergies: record?.allergies ?? "",
    currentMedication: record?.currentMedication ?? "",
    medicalHistory: record?.medicalHistory ?? "",
    injuries: record?.injuries ?? "",
    emergencyContact: record?.emergencyContact ?? "",
    emergencyPhone: record?.emergencyPhone ?? "",
    medicalNotes: record?.medicalNotes ?? "",
    hasPhysicalClearance: Boolean(record?.hasPhysicalClearance ?? false),
    physicalClearanceDueDate: record?.physicalClearanceDueDate ?? "",
  };
}

function EditPaymentModal({ payment, appSettings, onSave, onClose }) {
  const [form, setForm] = useState({
    amount: String(payment.amount ?? ""),
    paymentMethod: payment.paymentMethod ?? "",
    paymentDate: payment.paymentDate ?? "",
    notes: payment.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const enabledMethods = PAYMENT_METHOD_OPTIONS.filter((m) => appSettings?.paymentMethods?.[m.key]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(payment.id, {
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        notes: form.notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el cambio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="payment-modal-overlay"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h4>Editar pago — {MONTH_NAMES[(payment.month ?? 1) - 1]} {payment.year}</h4>
          <button className="secondary-button" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <form className="payment-modal-form" onSubmit={handleSubmit}>
          <label>
            Monto
            <input
              type="number"
              min="0"
              step="1"
              value={form.amount}
              onChange={(event) => setForm((f) => ({ ...f, amount: event.target.value }))}
              required
            />
          </label>
          <label>
            Forma de pago
            <select
              value={form.paymentMethod}
              onChange={(event) => setForm((f) => ({ ...f, paymentMethod: event.target.value }))}
            >
              {enabledMethods.map((m) => (
                <option key={m.key}>{m.label}</option>
              ))}
            </select>
          </label>
          <label>
            Fecha de pago
            <input
              type="date"
              value={form.paymentDate}
              onChange={(event) => setForm((f) => ({ ...f, paymentDate: event.target.value }))}
              required
            />
          </label>
          <label>
            Notas
            <textarea
              rows="2"
              value={form.notes}
              onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
            />
          </label>
          {error ? <p className="error-banner">{error}</p> : null}
          <div className="payment-modal-footer">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MemberDetailPanel({
  member,
  appSettings = null,
  canManageClubScopedData,
  isAllClubsView,
  onEdit,
  onRegisterPayment,
  onSaveMedicalRecord,
  onToggleMemberActive,
  onEditPayment,
  onDeletePayment,
  topSlot = null,
}) {
  const [activeTab, setActiveTab] = useState("summary");
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState(buildMedicalForm(member?.medicalRecord));
  const [medicalStatus, setMedicalStatus] = useState({ type: "idle", message: "" });
  const [toggling, setToggling] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const paymentRows = useMemo(() => member?.payments ?? [], [member]);

  useEffect(() => {
    setActiveTab("summary");
    setIsEditingMedical(false);
    setMedicalForm(buildMedicalForm(member?.medicalRecord));
    setMedicalStatus({ type: "idle", message: "" });
    setEditingPayment(null);
    setDeletingPaymentId(null);
    setDeleteError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]); // intentionally only reset when member changes, not on every medicalRecord update

  if (!member) {
    return (
      <div className="crm-empty-panel crm-empty-panel-detail">
        <strong>Selecciona un socio para ver el detalle.</strong>
        <p>La ficha completa aparecera aqui con resumen, pagos, deuda y datos personales.</p>
      </div>
    );
  }

  async function handleToggleActive() {
    if (!onToggleMemberActive) return;
    setToggling(true);
    try {
      await onToggleMemberActive(member.id, !member.active);
    } finally {
      setToggling(false);
    }
  }

  async function handleDeletePayment(paymentId) {
    setDeleteSaving(true);
    setDeleteError("");
    try {
      await onDeletePayment(paymentId);
      setDeletingPaymentId(null);
    } catch (error) {
      setDeleteError(error.message || "No se pudo eliminar el pago.");
    } finally {
      setDeleteSaving(false);
    }
  }

  const clubName = appSettings?.clubName?.trim() || "DataDay Cuotas";
  const whatsappUrl = member.phone
    ? `https://wa.me/${member.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${member.fullName}, te escribimos desde ${clubName}.`,
      )}`
    : null;
  const emailUrl = member.email ? `mailto:${member.email}` : null;
  const medicalRecord = member.medicalRecord;
  const canEditMedicalRecord = canManageClubScopedData || Boolean(member.clubId);

  function updateMedicalField(key, value) {
    setMedicalForm((current) => ({ ...current, [key]: value }));
    setMedicalStatus({ type: "idle", message: "" });
  }

  async function handleMedicalSubmit(event) {
    event.preventDefault();
    try {
      await onSaveMedicalRecord({
        memberId: member.id,
        clubId: member.clubId,
        ...medicalForm,
      });
      setMedicalStatus({ type: "success", message: "Ficha medica guardada correctamente." });
      setIsEditingMedical(false);
    } catch (error) {
      setMedicalStatus({
        type: "error",
        message: error.message || "No se pudo guardar la ficha medica.",
      });
    }
  }

  return (
    <section className="crm-detail-panel">
      {topSlot}
      <div className="crm-detail-hero">
        <div className="crm-detail-heading-block">
          <div className="crm-detail-avatar">
            <img src={member.photoUrl} alt={member.fullName} className="crm-detail-avatar-image" />
          </div>
          <div className="crm-detail-heading">
            <div>
              <p className="crm-detail-overline">Ficha del socio</p>
              <h3>{member.fullName}</h3>
              <span>{member.categoryName}</span>
            </div>
            <StatusBadge status={member.accountStatus} />
          </div>
        </div>

        <div className="crm-detail-actions">
          {whatsappUrl ? (
            <a className="secondary-button crm-action-link" href={whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {emailUrl ? (
            <a className="secondary-button crm-action-link" href={emailUrl}>
              Email
            </a>
          ) : null}
          <button className="secondary-button" type="button" onClick={onEdit} disabled={!canManageClubScopedData}>
            Editar datos
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={handleToggleActive}
            disabled={!canManageClubScopedData || toggling}
          >
            {member.active ? "Archivar socio" : "Reactivar socio"}
          </button>
          <button className="primary-button" type="button" onClick={onRegisterPayment} disabled={!canManageClubScopedData || !member.active}>
            Registrar pago
          </button>
        </div>
      </div>

      <div className="crm-contact-strip">
        <div className="crm-contact-chip">
          <span>Telefono</span>
          <strong>{member.phone || "Sin telefono"}</strong>
        </div>
        <div className="crm-contact-chip">
          <span>Email</span>
          <strong>{member.email || "Sin email"}</strong>
        </div>
        <div className="crm-contact-chip">
          <span>Inscripcion</span>
          <strong>{formatOptionalDate(member.enrollmentDate)}</strong>
        </div>
        <div className="crm-contact-chip">
          <span>Categoria</span>
          <strong>{member.categoryName}</strong>
        </div>
      </div>

      {!member.active ? (
        <p className="warning-banner">Este socio esta archivado y no figura en el listado activo. Reactiva para habilitarlo nuevamente.</p>
      ) : null}
      {isAllClubsView ? (
        <p className="warning-banner">Selecciona un club activo desde el header para editar socios o registrar pagos.</p>
      ) : null}

      <div className="crm-detail-kpis">
        <div className="crm-kpi-card">
          <span>Deuda actual</span>
          <strong className={member.pendingDebt > 0 ? "is-danger" : "is-success"}>
            {member.pendingDebt > 0 ? member.pendingDebtLabel : "Sin deuda"}
          </strong>
        </div>
        <div className="crm-kpi-card">
          <span>Ultimo pago</span>
          <strong>{member.lastPaymentLabel}</strong>
        </div>
        <div className="crm-kpi-card">
          <span>Proximo vencimiento</span>
          <strong>{member.nextDueLabel}</strong>
        </div>
        <div className="crm-kpi-card">
          <span>Cuota mensual</span>
          <strong>{member.monthlyFeeLabel}</strong>
        </div>
      </div>

      <Tabs tabs={DETAIL_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "summary" ? (
        <div className="crm-tab-panel">
          {(member.creditBalance ?? 0) > 0 ? (
            <div className="crm-summary-credit-note">
              <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" /><path d="M5 7l1.5 1.5L9.5 5.5" />
              </svg>
              <span>Saldo a favor:</span>
              <strong>{member.creditBalanceLabel}</strong>
            </div>
          ) : null}
          <div className="crm-summary-grid">
            <div className="crm-summary-card">
              <span>Estado de cuenta</span>
              <strong>{member.pendingDebt > 0 ? "Con deuda" : "Al dia"}</strong>
              <p>
                {member.pendingMonths.length > 0
                  ? `${member.pendingMonths.length} ${member.pendingMonths.length === 1 ? "cuota pendiente" : "cuotas pendientes"}.`
                  : "Sin cuotas vencidas."}
              </p>
            </div>
            <div className="crm-summary-card">
              <span>Ultimo pago</span>
              <strong>{member.lastPaymentLabel}</strong>
              <p>
                {paymentRows.length
                  ? `${paymentRows.length} ${paymentRows.length === 1 ? "pago registrado" : "pagos registrados"}.`
                  : "Aun no hay pagos registrados."}
              </p>
            </div>
            <div className="crm-summary-card">
              <span>Proximo vencimiento</span>
              <strong>{member.nextDueLabel}</strong>
              <p>{member.accountStatus === "current" ? "Cubierto para el periodo actual." : "Requiere seguimiento."}</p>
            </div>
            <div className="crm-summary-card">
              <span>Cuota mensual</span>
              <strong>{member.monthlyFeeLabel}</strong>
              <p>{member.categoryName}</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <div className="crm-tab-panel">
          {paymentRows.length === 0 ? (
            <p className="auth-helper-text">Sin pagos registrados para este socio.</p>
          ) : (
            <>
              <table className="crm-payments-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Año</th>
                    <th>Monto</th>
                    <th>Metodo</th>
                    <th>Fecha</th>
                    {canManageClubScopedData ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row) => (
                    <Fragment key={row.id}>
                      <tr>
                        <td>{MONTH_NAMES[(row.month ?? 1) - 1]}</td>
                        <td>{row.year}</td>
                        <td>{formatCurrency(row.amount)}</td>
                        <td>{row.paymentMethod ?? "—"}</td>
                        <td>{formatOptionalDate(row.paymentDate)}</td>
                        {canManageClubScopedData ? (
                          <td>
                            <div className="td-actions">
                              <button
                                className="payment-action-btn"
                                type="button"
                                title="Editar pago"
                                onClick={() => setEditingPayment(row)}
                              >
                                <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M9.5 2.5l2 2L4.5 11.5l-3 .5.5-3L9.5 2.5z" />
                                </svg>
                              </button>
                              <button
                                className="payment-action-btn is-danger"
                                type="button"
                                title="Eliminar pago"
                                onClick={() => setDeletingPaymentId(deletingPaymentId === row.id ? null : row.id)}
                              >
                                <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M2 4h10M5 4V2.5h4V4M5.5 6v4M8.5 6v4M3 4l1 7.5h6L11 4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {deletingPaymentId === row.id ? (
                        <tr className="crm-delete-confirm-row">
                          <td colSpan={canManageClubScopedData ? 6 : 5}>
                            <div className="crm-delete-confirm-inner">
                              <p>
                                Eliminar el pago de {MONTH_NAMES[(row.month ?? 1) - 1]} {row.year}? Esta accion no se puede deshacer.
                              </p>
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => setDeletingPaymentId(null)}
                              >
                                Cancelar
                              </button>
                              <button
                                className="primary-button"
                                type="button"
                                style={{ background: "var(--bad)", borderColor: "var(--bad)" }}
                                onClick={() => handleDeletePayment(row.id)}
                                disabled={deleteSaving}
                              >
                                {deleteSaving ? "Eliminando..." : "Confirmar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {deleteError ? <p className="error-banner" style={{ marginTop: 8 }}>{deleteError}</p> : null}
            </>
          )}
        </div>
      ) : null}

      {activeTab === "debt" ? (
        <div className="crm-tab-panel">
          {member.pendingMonths.length === 0 ? (
            <div className="crm-debt-empty">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l2.5 2.5L16 9.5" />
              </svg>
              <strong>Sin deuda pendiente</strong>
              <p>Este socio esta al dia con sus cuotas.</p>
              {(member.creditBalance ?? 0) > 0 ? (
                <p className="crm-credit-coverage-note" style={{ borderRadius: 6 }}>
                  Saldo a favor disponible: {member.creditBalanceLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="crm-debt-list">
                {(member.pendingPeriods ?? []).map((period) => (
                  <div key={`${period.month}-${period.year}`} className="crm-debt-row">
                    <span className="crm-debt-row-label">{MONTH_NAMES[period.month - 1]} {period.year}</span>
                    <span className="crm-debt-row-amount">{formatCurrency(member.monthlyFee)}</span>
                  </div>
                ))}
              </div>
              <div className="crm-debt-total-row">
                <span>Total adeudado</span>
                <strong>{member.pendingDebtLabel}</strong>
              </div>
              {(member.creditBalance ?? 0) > 0 ? (
                <p className="crm-credit-coverage-note">
                  Este socio tiene {member.creditBalanceLabel} de saldo a favor que se aplicara automaticamente en el proximo pago.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {activeTab === "personal" ? (
        <div className="crm-tab-panel">
          <div className="crm-personal-grid">
            <div className="crm-personal-item">
              <span>Nombre completo</span>
              <strong>{member.fullName}</strong>
            </div>
            <div className="crm-personal-item">
              <span>Categoria</span>
              <strong>{member.categoryName}</strong>
            </div>
            <div className="crm-personal-item">
              <span>Fecha de nacimiento</span>
              <strong>{formatOptionalDate(member.birthDate)}</strong>
            </div>
            <div className="crm-personal-item">
              <span>Fecha de inscripcion</span>
              <strong>{formatOptionalDate(member.enrollmentDate)}</strong>
            </div>
            <div className="crm-personal-item">
              <span>Telefono</span>
              <strong>{member.phone || "Sin telefono"}</strong>
            </div>
            <div className="crm-personal-item">
              <span>Email</span>
              <strong>{member.email || "Sin email"}</strong>
            </div>
            <div className="crm-personal-item crm-personal-item-wide">
              <span>Direccion</span>
              <strong>{member.address || "Sin direccion"}</strong>
            </div>
            <div className="crm-personal-item crm-personal-item-wide">
              <span>Observaciones</span>
              <strong>{member.notes || "Sin observaciones"}</strong>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "health" ? (
        <div className="crm-tab-panel">
          <div className="crm-health-header">
            <div>
              <span>Ficha medica</span>
              <strong>Salud y seguridad del alumno</strong>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setIsEditingMedical((current) => !current);
                setMedicalForm(buildMedicalForm(member.medicalRecord));
                setMedicalStatus({ type: "idle", message: "" });
              }}
              disabled={!canEditMedicalRecord}
            >
              {isEditingMedical ? "Cancelar edicion" : "Editar ficha medica"}
            </button>
          </div>

          {!medicalRecord && !isEditingMedical ? (
            <div className="crm-health-empty">
              <strong>No hay informacion medica registrada</strong>
              <p>Carga restricciones, alergias, contacto de emergencia y apto fisico para este alumno.</p>
            </div>
          ) : null}

          {medicalRecord && !isEditingMedical ? (
            <div className="crm-health-grid">
              <div className="crm-health-card">
                <span>Restricciones medicas</span>
                <strong>{medicalRecord.restrictions || "Sin restricciones cargadas"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Enfermedades</span>
                <strong>{medicalRecord.conditions || "Sin enfermedades registradas"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Alergias</span>
                <strong>{medicalRecord.allergies || "Sin alergias registradas"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Medicación actual</span>
                <strong>{medicalRecord.currentMedication || "Sin medicacion actual"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Antecedentes medicos</span>
                <strong>{medicalRecord.medicalHistory || "Sin antecedentes cargados"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Lesiones</span>
                <strong>{medicalRecord.injuries || "Sin lesiones registradas"}</strong>
              </div>
              <div className="crm-health-card">
                <span>Contacto de emergencia</span>
                <strong>{medicalRecord.emergencyContact || "Sin contacto cargado"}</strong>
                <p>{medicalRecord.emergencyPhone || "Sin telefono de emergencia"}</p>
              </div>
              <div className="crm-health-card">
                <span>Apto fisico</span>
                <strong>{medicalRecord.hasPhysicalClearance ? "Apto vigente" : "Sin apto cargado"}</strong>
                <p>{medicalRecord.physicalClearanceDueDate ? `Vence: ${formatOptionalDate(medicalRecord.physicalClearanceDueDate)}` : "Sin vencimiento cargado"}</p>
              </div>
              <div className="crm-health-card crm-health-card-wide">
                <span>Observaciones medicas</span>
                <strong>{medicalRecord.medicalNotes || "Sin observaciones medicas"}</strong>
              </div>
            </div>
          ) : null}

          {isEditingMedical ? (
            <form className="crm-medical-form" onSubmit={handleMedicalSubmit}>
              <label>
                Restricciones medicas
                <textarea rows="3" value={medicalForm.restrictions} onChange={(event) => updateMedicalField("restrictions", event.target.value)} />
              </label>
              <label>
                Enfermedades
                <textarea rows="3" value={medicalForm.conditions} onChange={(event) => updateMedicalField("conditions", event.target.value)} />
              </label>
              <label>
                Alergias
                <textarea rows="3" value={medicalForm.allergies} onChange={(event) => updateMedicalField("allergies", event.target.value)} />
              </label>
              <label>
                Medicacion actual
                <textarea rows="3" value={medicalForm.currentMedication} onChange={(event) => updateMedicalField("currentMedication", event.target.value)} />
              </label>
              <label>
                Antecedentes medicos
                <textarea rows="3" value={medicalForm.medicalHistory} onChange={(event) => updateMedicalField("medicalHistory", event.target.value)} />
              </label>
              <label>
                Lesiones
                <textarea rows="3" value={medicalForm.injuries} onChange={(event) => updateMedicalField("injuries", event.target.value)} />
              </label>
              <label>
                Contacto de emergencia
                <input value={medicalForm.emergencyContact} onChange={(event) => updateMedicalField("emergencyContact", event.target.value)} />
              </label>
              <label>
                Telefono de emergencia
                <input value={medicalForm.emergencyPhone} onChange={(event) => updateMedicalField("emergencyPhone", event.target.value)} />
              </label>
              <label>
                Vencimiento apto fisico
                <input
                  type="date"
                  value={medicalForm.physicalClearanceDueDate}
                  onChange={(event) => updateMedicalField("physicalClearanceDueDate", event.target.value)}
                />
              </label>
              <label className="crm-medical-checkbox">
                <span>Apto fisico</span>
                <input
                  type="checkbox"
                  checked={medicalForm.hasPhysicalClearance}
                  onChange={(event) => updateMedicalField("hasPhysicalClearance", event.target.checked)}
                />
              </label>
              <label className="full-span">
                Observaciones medicas
                <textarea rows="4" value={medicalForm.medicalNotes} onChange={(event) => updateMedicalField("medicalNotes", event.target.value)} />
              </label>

              <div className="full-span form-footer">
                <span className="helper-text">Guarda antecedentes, alergias, lesiones y datos de emergencia del alumno.</span>
                <button className="primary-button" type="submit" disabled={!canEditMedicalRecord}>
                  Guardar ficha medica
                </button>
              </div>

              {medicalStatus.type === "success" ? <p className="success-banner">{medicalStatus.message}</p> : null}
              {medicalStatus.type === "error" ? <p className="error-banner">{medicalStatus.message}</p> : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {editingPayment ? (
        <EditPaymentModal
          payment={editingPayment}
          appSettings={appSettings}
          onSave={onEditPayment}
          onClose={() => setEditingPayment(null)}
        />
      ) : null}
    </section>
  );
}
