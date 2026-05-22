import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { authApi } from "../../lib/authApi";
import { formatDate } from "../../lib/format";

const STATUS_LABELS = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function AdminRequestsPage({ authState }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState({ loading: true, message: "", error: "" });
  const [activationLinks, setActivationLinks] = useState({});
  const [confirm, setConfirm] = useState({ requestId: null, action: null });

  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await authApi.listAccessRequests();
        setRequests(data);
        setStatus({ loading: false, message: "", error: "" });
      } catch (error) {
        setStatus({ loading: false, message: "", error: error.message });
      }
    }

    loadRequests();
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  function requestConfirm(requestId, action) {
    setConfirm({ requestId, action });
  }

  function cancelConfirm() {
    setConfirm({ requestId: null, action: null });
  }

  async function handleReview(requestId, action) {
    setConfirm({ requestId: null, action: null });
    try {
      const result = await authApi.reviewAccessRequest(requestId, action, authState?.profile ?? null);
      if (result.activationUrl) {
        setActivationLinks((current) => ({ ...current, [requestId]: result.activationUrl }));
      }
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, status: result.status, club_id: result.clubId ?? request.club_id }
            : request,
        ),
      );
      setStatus({
        loading: false,
        message:
          action === "approve"
            ? result.emailSent
              ? "Solicitud aprobada. El usuario ya puede entrar y tambien recibio un enlace por si necesita cambiar la contrasena."
              : "Solicitud aprobada. El usuario ya puede entrar; si necesita cambiar la contrasena, usa el enlace mostrado."
            : "Solicitud rechazada.",
        error: "",
      });
    } catch (error) {
      setStatus({ loading: false, message: "", error: error.message });
    }
  }

  async function handleGenerateActivationLink(requestId) {
    try {
      const result = await authApi.reviewAccessRequest(
        requestId,
        "generate-activation-link",
        authState?.profile ?? null,
      );
      setActivationLinks((current) => ({ ...current, [requestId]: result.activationUrl }));
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.activationUrl);
        setStatus({
          loading: false,
          message: "Enlace de activacion copiado al portapapeles.",
          error: "",
        });
        return;
      }

      setStatus({
        loading: false,
        message: "Enlace de activacion generado. Copialo desde la tarjeta.",
        error: "",
      });
    } catch (error) {
      setStatus({ loading: false, message: "", error: error.message });
    }
  }

  if (!authApi.isSuperAdmin(authState?.profile)) {
    return (
      <SectionCard title="Panel admin" subtitle="Acceso restringido.">
        <p>No tienes permisos para ver solicitudes.</p>
      </SectionCard>
    );
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="Solicitudes de acceso"
        subtitle="Panel exclusivo para DigitalNexo. Revisa y habilita nuevos clubes."
      >
        <div className="history-summary">
          <div className="members-count-chip">{pendingRequests.length} pendientes</div>
          {status.message ? <p className="success-banner">{status.message}</p> : null}
          {status.error ? <p className="error-banner">{status.error}</p> : null}
        </div>

        {confirm.requestId ? (
          <div className="warning-banner" style={{ marginBottom: "1rem" }}>
            <strong>
              {confirm.action === "approve" ? "Aprobar" : "Rechazar"} esta solicitud. Esta accion no se puede deshacer.
            </strong>
            <div className="toolbar" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
              <button className="primary-button" type="button" onClick={() => handleReview(confirm.requestId, confirm.action)}>
                Confirmar
              </button>
              <button className="secondary-button" type="button" onClick={cancelConfirm}>
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-requests-list">
          {requests.map((request) => (
            <article key={request.id} className="admin-request-card">
              <div className="admin-request-main">
                <div className="member-card-header">
                  <div>
                    <strong>{request.full_name}</strong>
                    <p>{request.club_name}</p>
                  </div>
                  <span className={`status-badge ${request.status === "approved" ? "current" : request.status === "rejected" ? "late" : "pending"}`}>
                    {STATUS_LABELS[request.status] ?? request.status}
                  </span>
                </div>
                <div className="member-contact-list">
                  <span>{request.email}</span>
                  <span>{request.phone || "Sin telefono"}</span>
                </div>
                <div className="member-finance-grid">
                  <div className="member-finance-item">
                    <span>Solicitud</span>
                    <strong>{formatDate(request.created_at.slice(0, 10))}</strong>
                  </div>
                  <div className="member-finance-item full-span">
                    <span>Mensaje</span>
                    <strong>{request.message || "Sin mensaje adicional"}</strong>
                  </div>
                </div>
              </div>

              <div className="member-card-actions">
                <button
                  className="primary-button member-card-button"
                  type="button"
                  disabled={request.status !== "pending" || Boolean(confirm.requestId)}
                  onClick={() => requestConfirm(request.id, "approve")}
                >
                  Aprobar
                </button>
                <button
                  className="secondary-button member-card-button"
                  type="button"
                  disabled={request.status !== "pending" || Boolean(confirm.requestId)}
                  onClick={() => requestConfirm(request.id, "reject")}
                >
                  Rechazar
                </button>
                <button
                  className="secondary-button member-card-button"
                  type="button"
                  disabled={request.status !== "approved"}
                  onClick={() => handleGenerateActivationLink(request.id)}
                >
                  Copiar activacion
                </button>
              </div>
              {activationLinks[request.id] ? (
                <div className="admin-request-link-block">
                  <span>Enlace de activacion</span>
                  <strong>{activationLinks[request.id]}</strong>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
