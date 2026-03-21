import { useEffect, useMemo, useState } from "react";
import { DataTable } from "./DataTable";
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

export function MemberDetailPanel({
  member,
  canManageClubScopedData,
  isAllClubsView,
  onEdit,
  onRegisterPayment,
  onSaveMedicalRecord,
  topSlot = null,
}) {
  const [activeTab, setActiveTab] = useState("summary");
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState(buildMedicalForm(member?.medicalRecord));
  const [medicalStatus, setMedicalStatus] = useState({ type: "idle", message: "" });

  const paymentRows = useMemo(() => member?.payments ?? [], [member]);

  useEffect(() => {
    setActiveTab("summary");
    setIsEditingMedical(false);
    setMedicalForm(buildMedicalForm(member?.medicalRecord));
    setMedicalStatus({ type: "idle", message: "" });
  }, [member?.id]);

  if (!member) {
    return (
      <div className="crm-empty-panel crm-empty-panel-detail">
        <strong>Selecciona un socio para ver el detalle.</strong>
        <p>La ficha completa aparecera aqui con resumen, pagos, deuda y datos personales.</p>
      </div>
    );
  }

  const whatsappUrl = member.phone
    ? `https://wa.me/${member.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${member.fullName}, te escribimos desde DataDay Cuotas.`,
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
          <button className="primary-button" type="button" onClick={onRegisterPayment} disabled={!canManageClubScopedData}>
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
          <div className="crm-summary-grid">
            <div className="crm-summary-card">
              <span>Estado</span>
              <strong>{member.pendingDebt > 0 ? "Con deuda" : "Cuenta al dia"}</strong>
              <p>{member.pendingDebt > 0 ? `${member.pendingMonths.length} meses pendientes.` : "Sin cuotas vencidas."}</p>
            </div>
            <div className="crm-summary-card">
              <span>Ultimo pago registrado</span>
              <strong>{member.lastPaymentLabel}</strong>
              <p>{paymentRows.length ? `${paymentRows.length} pagos historicos cargados.` : "Aun no hay pagos registrados."}</p>
            </div>
            <div className="crm-summary-card">
              <span>Proximo vencimiento</span>
              <strong>{member.nextDueLabel}</strong>
              <p>{member.accountStatus === "current" ? "Cuenta cubierta para el periodo actual." : "Requiere seguimiento comercial."}</p>
            </div>
            <div className="crm-summary-card">
              <span>Canal de contacto</span>
              <strong>{member.phone || member.email || "Sin contacto cargado"}</strong>
              <p>Telefono y email visibles para seguimiento rapido.</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <div className="crm-tab-panel">
          <DataTable
            columns={[
              { key: "month", label: "Mes", render: (row) => MONTH_NAMES[row.month - 1] },
              { key: "year", label: "Ano" },
              { key: "amount", label: "Monto", render: (row) => formatCurrency(row.amount) },
              { key: "paymentMethod", label: "Metodo" },
              { key: "paymentDate", label: "Fecha", render: (row) => formatOptionalDate(row.paymentDate) },
            ]}
            rows={paymentRows}
          />
        </div>
      ) : null}

      {activeTab === "debt" ? (
        <div className="crm-tab-panel">
          <div className="crm-debt-overview">
            <div className="crm-debt-card">
              <span>Meses pendientes</span>
              <strong>{member.pendingMonths.length}</strong>
              <p>{member.pendingMonths.length ? member.pendingMonths.join(", ") : "Sin deuda pendiente."}</p>
            </div>
            <div className="crm-debt-card">
              <span>Monto total</span>
              <strong className={member.pendingDebt > 0 ? "is-danger" : "is-success"}>
                {member.pendingDebt > 0 ? member.pendingDebtLabel : "Sin deuda"}
              </strong>
              <p>Incluye recargo configurado para mora cuando aplica.</p>
            </div>
          </div>
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
    </section>
  );
}
