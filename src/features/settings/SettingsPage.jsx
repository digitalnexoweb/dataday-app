import { useEffect, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { PAYMENT_METHOD_OPTIONS } from "../../lib/appSettings";
import { supabaseEnabled } from "../../lib/supabase";

export function SettingsPage({ appSettings, onUpdateSettings }) {
  const [form, setForm] = useState(appSettings);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(appSettings);
    setUploadError("");
    setSaveError("");
  }, [appSettings]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSaveError("");
  }

  function handleLogoFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Selecciona una imagen valida en formato JPG, PNG, WEBP, SVG o similar.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("clubLogo", String(reader.result || ""));
      setUploadError("");
      event.target.value = "";
    };
    reader.onerror = () => {
      setUploadError("No pudimos leer la imagen. Intenta nuevamente con otro archivo.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    updateField("clubLogo", "");
    setUploadError("");
  }

  function updatePaymentMethod(key, checked) {
    setForm((current) => ({
      ...current,
      paymentMethods: {
        ...current.paymentMethods,
        [key]: checked,
      },
    }));
    setSaved(false);
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      await onUpdateSettings({
        ...form,
        defaultMonthlyFee: Number(form.defaultMonthlyFee || 0),
        dueDay: Number(form.dueDay || 10),
        lateFeePercent: Number(form.lateFeePercent || 0),
      });
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || "No pudimos guardar la configuracion del club.");
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <SectionCard title="Configuracion general" subtitle="Parametros visibles para operar y vender la solucion como SaaS.">
        <div className="settings-grid">
          <article className="setting-box">
            <strong>Fuente de datos</strong>
            <p>{supabaseEnabled ? "Supabase activa" : "Mocks locales activos"}</p>
          </article>
          <article className="setting-box">
            <strong>Club configurado</strong>
            <p>{form.clubName || "Sin nombre definido"}</p>
          </article>
          <article className="setting-box">
            <strong>Vencimiento mensual</strong>
            <p>Dia {form.dueDay} de cada mes</p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Configuracion del club" subtitle="Personaliza datos institucionales visibles para administracion.">
        <form className="member-form" onSubmit={handleSubmit}>
          <label>
            Nombre del club
            <input value={form.clubName} onChange={(event) => updateField("clubName", event.target.value)} />
          </label>
          <label>
            Logo del club
            <input value={form.clubLogo} onChange={(event) => updateField("clubLogo", event.target.value)} />
          </label>
          <div className="full-span settings-logo-field">
            <div className="settings-logo-header">
              <strong>Subir logo</strong>
              <p>Admite JPG, PNG, WEBP, SVG y otros formatos de imagen compatibles con el navegador.</p>
            </div>
            <div className="settings-logo-uploader">
              <div className="settings-logo-preview-shell" aria-label="Vista previa del logo">
                {form.clubLogo ? (
                  <img src={form.clubLogo} alt={`Logo de ${form.clubName || "tu club"}`} className="settings-logo-preview" />
                ) : (
                  <span className="settings-logo-placeholder">
                    {(form.clubName || "Club")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((word) => word[0]?.toUpperCase() ?? "")
                      .join("") || "CL"}
                  </span>
                )}
              </div>
              <div className="settings-logo-actions">
                <label className="secondary-button settings-logo-picker">
                  <span>Elegir imagen</span>
                  <input type="file" accept="image/*" onChange={handleLogoFileChange} disabled={saving} />
                </label>
                {form.clubLogo ? (
                  <button className="secondary-button" type="button" onClick={handleRemoveLogo} disabled={saving}>
                    Quitar logo
                  </button>
                ) : null}
                <p className="helper-text">
                  {supabaseEnabled
                    ? "Al guardar, el logo y nombre del club se comparten con todos los usuarios de esta institucion."
                    : "Tambien puedes pegar una URL en el campo de arriba si prefieres usar una imagen online."}
                </p>
              </div>
            </div>
          </div>
          <label>
            Telefono
            <input value={form.clubPhone} onChange={(event) => updateField("clubPhone", event.target.value)} />
          </label>
          <label>
            Direccion
            <input value={form.clubAddress} onChange={(event) => updateField("clubAddress", event.target.value)} />
          </label>

          <label>
            Cuota por defecto
            <input
              type="number"
              min="0"
              value={form.defaultMonthlyFee}
              onChange={(event) => updateField("defaultMonthlyFee", event.target.value)}
            />
          </label>
          <label>
            Dia de vencimiento mensual
            <input
              type="number"
              min="1"
              max="28"
              value={form.dueDay}
              onChange={(event) => updateField("dueDay", event.target.value)}
            />
          </label>
          <label>
            Recargo por atraso (%)
            <input
              type="number"
              min="0"
              max="100"
              value={form.lateFeePercent}
              onChange={(event) => updateField("lateFeePercent", event.target.value)}
            />
          </label>

          <div className="full-span settings-methods">
            <strong>Formas de pago habilitadas</strong>
            <div className="settings-methods-grid">
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <label key={method.key} className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(form.paymentMethods?.[method.key])}
                    onChange={(event) => updatePaymentMethod(method.key, event.target.checked)}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="full-span form-footer">
            <p className="helper-text">
              {supabaseEnabled
                ? "El nombre y logo del club se guardan en Supabase para toda la institucion. El resto sigue siendo local por navegador."
                : "Los cambios se guardan en el navegador actual y no afectan Supabase."}
            </p>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar configuracion"}
            </button>
          </div>

          {uploadError ? <p className="error-banner">{uploadError}</p> : null}
          {saveError ? <p className="error-banner">{saveError}</p> : null}
          {saved ? <p className="success-banner">Configuracion guardada correctamente.</p> : null}
        </form>
      </SectionCard>
    </div>
  );
}
