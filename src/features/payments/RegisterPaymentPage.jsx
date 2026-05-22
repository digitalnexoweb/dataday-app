import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { PAYMENT_METHOD_OPTIONS } from "../../lib/appSettings";
import { downloadPaymentReceipt } from "../../lib/receipt";
import { MONTH_NAMES } from "../../lib/format";

function buildInitialState(selectedMember, appSettings) {
  const currentYear = new Date().getFullYear();
  const enabledMethod =
    PAYMENT_METHOD_OPTIONS.find((method) => appSettings.paymentMethods?.[method.key])?.label ?? "Efectivo";

  return {
    memberId: selectedMember?.id ?? "",
    month: new Date().getMonth() + 1,
    year: currentYear,
    amount: "",
    paymentMethod: enabledMethod,
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

export function RegisterPaymentPage({
  appData,
  appSettings,
  selectedMember,
  onRegisterPayment,
  canManageClubScopedData,
  isAllClubsView,
}) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState(buildInitialState(selectedMember, appSettings));
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);
  const enabledMethods = PAYMENT_METHOD_OPTIONS.filter((method) => appSettings.paymentMethods?.[method.key]);

  useEffect(() => {
    setForm(buildInitialState(selectedMember, appSettings));
    setLastReceipt(null);
  }, [selectedMember, appSettings]);

  const selected = useMemo(
    () => appData.members.find((member) => String(member.id) === String(form.memberId)),
    [appData.members, form.memberId],
  );

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setIsSaved(false);
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      await onRegisterPayment({
        memberId: Number(form.memberId),
        memberName: selected?.fullName ?? "Socio",
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        notes: form.notes,
      });

      setLastReceipt({
        memberName: selected?.fullName ?? "Socio",
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
      });
      setIsSaved(true);
      setForm(buildInitialState(null, appSettings));
    } catch (error) {
      setSaveError(error.message || "No se pudo guardar el pago. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Registrar pago" subtitle="Formulario simple para registrar cuotas.">
      {isAllClubsView ? (
        <p className="warning-banner">Selecciona un club activo desde el header para registrar pagos.</p>
      ) : null}
      <form className="payment-form" onSubmit={handleSubmit}>
        <label>
          Socio / alumno
          <select
            value={form.memberId}
            onChange={(event) => updateField("memberId", event.target.value)}
            required
            disabled={!canManageClubScopedData}
          >
            <option value="">Seleccionar</option>
            {appData.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mes
          <select value={form.month} onChange={(event) => updateField("month", event.target.value)} required>
            {MONTH_NAMES.map((name, index) => (
              <option key={index + 1} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ano
          <input
            type="number"
            min="2024"
            max={currentYear + 10}
            value={form.year}
            onChange={(event) => updateField("year", event.target.value)}
            required
          />
        </label>

        <label>
          Monto
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Ej. 1800"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            required
          />
        </label>

        <label>
          Forma de pago
          <select
            value={form.paymentMethod}
            onChange={(event) => updateField("paymentMethod", event.target.value)}
            required
          >
            {enabledMethods.map((method) => (
              <option key={method.key}>{method.label}</option>
            ))}
          </select>
        </label>

        <label>
          Fecha de pago
          <input
            type="date"
            value={form.paymentDate}
            onChange={(event) => updateField("paymentDate", event.target.value)}
            required
          />
        </label>

        <label className="full-span">
          Observaciones
          <textarea
            rows="4"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Notas sobre el pago..."
          />
        </label>

        <div className="full-span form-footer">
          {selected ? <p className="helper-text">Categoria actual: {selected.categoryName}</p> : <span />}
          <div className="toolbar">
            {lastReceipt ? (
              <button className="secondary-button" type="button" onClick={() => downloadPaymentReceipt(lastReceipt)}>
                Descargar recibo
              </button>
            ) : null}
            <button className="primary-button" type="submit" disabled={!canManageClubScopedData || saving}>
              {saving ? "Guardando..." : "Guardar pago"}
            </button>
          </div>
        </div>

        {isSaved ? <p className="success-banner">Pago guardado correctamente.</p> : null}
        {saveError ? <p className="error-banner">{saveError}</p> : null}
      </form>
    </SectionCard>
  );
}
