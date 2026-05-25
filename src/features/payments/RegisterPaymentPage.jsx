import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { PAYMENT_METHOD_OPTIONS } from "../../lib/appSettings";
import { formatCurrency, MONTH_NAMES } from "../../lib/format";
import { computePaymentPlan } from "../../lib/memberUtils";
import { downloadPaymentReceipt } from "../../lib/receipt";

function buildInitialState(selectedMember, appSettings) {
  const enabledMethod =
    PAYMENT_METHOD_OPTIONS.find((method) => appSettings.paymentMethods?.[method.key])?.label ?? "Efectivo";
  return {
    memberId: selectedMember?.id ?? "",
    amount: "",
    paymentMethod: enabledMethod,
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function buildPeriodsLabel(plan) {
  if (!plan || plan.periodsToRegister.length === 0) return "Sin periodo";
  if (plan.isPartialPayment) {
    const period = plan.periodsToRegister[0];
    return period ? `Abono parcial — ${MONTH_NAMES[period.month - 1]} ${period.year}` : "Abono parcial";
  }
  const first = plan.periodsToRegister[0];
  const last = plan.periodsToRegister[plan.periodsToRegister.length - 1];
  if (plan.periodsToRegister.length === 1) {
    return `${MONTH_NAMES[first.month - 1]} ${first.year}`;
  }
  if (first.year === last.year) {
    return `${MONTH_NAMES[first.month - 1]} – ${MONTH_NAMES[last.month - 1]} ${last.year}`;
  }
  return `${MONTH_NAMES[first.month - 1]} ${first.year} – ${MONTH_NAMES[last.month - 1]} ${last.year}`;
}

export function RegisterPaymentPage({
  appData,
  appSettings,
  selectedMember,
  onRegisterPayment,
  canManageClubScopedData,
  isAllClubsView,
}) {
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
    () => appData.members.find((member) => String(member.id) === String(form.memberId)) ?? null,
    [appData.members, form.memberId],
  );

  const paymentPlan = useMemo(() => {
    if (!selected || !Number(form.amount)) return null;
    return computePaymentPlan({
      member: selected,
      allPayments: appData.payments,
      allCredits: appData.credits ?? [],
      allCategories: appData.categories,
      appSettings,
      newAmount: Number(form.amount),
    });
  }, [selected, form.amount, appData.payments, appData.credits, appData.categories, appSettings]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setIsSaved(false);
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!paymentPlan && Number(form.amount) > 0 && selected) return;
    setSaving(true);
    setSaveError("");

    try {
      const plan = paymentPlan ?? {
        monthlyFee: 0,
        periodsToRegister: [],
        creditRemainder: 0,
        isPartialPayment: false,
        existingCredit: 0,
      };

      await onRegisterPayment({
        memberId: Number(form.memberId),
        memberName: selected?.fullName ?? "Socio",
        totalAmount: Number(form.amount),
        monthlyFee: plan.monthlyFee,
        periods: plan.periodsToRegister,
        creditRemainder: plan.creditRemainder,
        isPartialPayment: plan.isPartialPayment,
        existingCredit: plan.existingCredit,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        notes: form.notes,
      });

      setLastReceipt({
        memberName: selected?.fullName ?? "Socio",
        periodsLabel: buildPeriodsLabel(plan),
        amount: Number(form.amount),
        creditRemainder: plan.creditRemainder,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        month: plan.periodsToRegister[0]?.month ?? new Date().getMonth() + 1,
        year: plan.periodsToRegister[0]?.year ?? new Date().getFullYear(),
      });
      setIsSaved(true);
      setForm(buildInitialState(null, appSettings));
    } catch (error) {
      setSaveError(error.message || "No se pudo guardar el pago. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !saving && canManageClubScopedData && form.memberId && Number(form.amount) > 0;

  return (
    <SectionCard
      title="Registrar pago"
      subtitle="El sistema distribuye el monto entre los meses pendientes y los siguientes."
    >
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
            {appData.members
              .filter((m) => m.active !== false)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
          </select>
        </label>

        {selected && (
          <div className="member-account-card full-span">
            <div className="member-account-stat">
              <span>Cuota mensual</span>
              <strong>{paymentPlan ? formatCurrency(paymentPlan.monthlyFee) : "—"}</strong>
            </div>
            <div className="member-account-stat">
              <span>Cuotas pendientes</span>
              <strong>{paymentPlan?.pendingCount ?? "—"}</strong>
            </div>
            <div className="member-account-stat">
              <span>Total adeudado</span>
              <strong>
                {paymentPlan ? (paymentPlan.pendingTotal > 0 ? formatCurrency(paymentPlan.pendingTotal) : "Sin deuda") : "—"}
              </strong>
            </div>
            {(paymentPlan?.existingCredit ?? 0) > 0 && (
              <div className="member-account-stat is-credit">
                <span>Saldo a favor</span>
                <strong>{formatCurrency(paymentPlan.existingCredit)}</strong>
              </div>
            )}
          </div>
        )}

        <label>
          Monto recibido
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Ej. 3000"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            required
          />
        </label>

        {selected && Number(form.amount) > 0 && paymentPlan && (
          <div className="payment-plan-card full-span">
            {paymentPlan.isPartialPayment ? (
              <div className="payment-plan-partial">
                <span aria-hidden="true">
                  <svg viewBox="0 0 14 14" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 1.5L13 12H1L7 1.5z" /><path d="M7 6v2.5" /><circle cx="7" cy="10.2" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <div>
                  <strong>Abono parcial</strong>
                  <p>
                    El monto ({formatCurrency(Number(form.amount))}) no cubre la cuota completa ({formatCurrency(paymentPlan.monthlyFee)}).
                    {paymentPlan.periodsToRegister[0]
                      ? ` Se registrara como abono sobre ${MONTH_NAMES[paymentPlan.periodsToRegister[0].month - 1]} ${paymentPlan.periodsToRegister[0].year}.`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="payment-plan-header">
                  <span>
                    Se cubrirán{" "}
                    <strong>{paymentPlan.monthsCovered} {paymentPlan.monthsCovered === 1 ? "mes" : "meses"}</strong>
                    {paymentPlan.existingCredit > 0 && (
                      <span className="payment-plan-credit-used">
                        {" "}(incluye {formatCurrency(paymentPlan.existingCredit)} de saldo previo)
                      </span>
                    )}
                  </span>
                  {paymentPlan.creditRemainder > 0 && (
                    <span className="payment-plan-credit">
                      Saldo a favor: {formatCurrency(paymentPlan.creditRemainder)}
                    </span>
                  )}
                </div>
                <div className="payment-plan-list">
                  {paymentPlan.periodsToRegister.map((period, i) => {
                    const isPending = i < paymentPlan.pendingCount;
                    return (
                      <div
                        key={`${period.month}-${period.year}`}
                        className={`payment-plan-row ${isPending ? "is-pending" : "is-future"}`}
                      >
                        <span>{MONTH_NAMES[period.month - 1]} {period.year}</span>
                        <span className="payment-plan-row-tag">{isPending ? "pendiente" : "futuro"}</span>
                        <span className="payment-plan-row-amount">{formatCurrency(paymentPlan.monthlyFee)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

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
            rows="3"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Notas sobre el pago..."
          />
        </label>

        <div className="full-span form-footer">
          {selected ? (
            <p className="helper-text">Categoria: {selected.categoryName}</p>
          ) : (
            <span />
          )}
          <div className="toolbar">
            {lastReceipt ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => downloadPaymentReceipt(lastReceipt, appSettings)}
              >
                Descargar recibo
              </button>
            ) : null}
            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {saving ? "Guardando..." : "Guardar pago"}
            </button>
          </div>
        </div>

        {isSaved ? <p className="success-banner full-span">Pago guardado correctamente.</p> : null}
        {saveError ? <p className="error-banner full-span">{saveError}</p> : null}
      </form>
    </SectionCard>
  );
}
