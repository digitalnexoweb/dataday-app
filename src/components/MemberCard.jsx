import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";

export function MemberCard({ member, onOpen, onRegisterPayment, canRegisterPayment = true }) {
  const [imageError, setImageError] = useState(false);
  const initials = useMemo(() => {
    return member.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [member.fullName]);

  const showPlaceholder = !member.photoUrl || imageError;

  return (
    <article className="member-card">
      <div className="member-card-avatar-shell">
        {showPlaceholder ? (
          <div className="member-avatar member-avatar-placeholder" aria-label={member.fullName}>
            {initials || "SN"}
          </div>
        ) : (
          <img
            src={member.photoUrl}
            alt={member.fullName}
            className="member-avatar"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div className="member-card-content">
        <div className="member-card-header">
          <div>
            <h3 className="member-card-name">{member.fullName}</h3>
            <p className="member-card-category">{member.categoryName}</p>
          </div>
          <StatusBadge status={member.accountStatus} />
        </div>

        <div className="member-meta member-contact-list">
          <span>{member.email || "Sin email"}</span>
          <span>{member.phone || "Sin telefono"}</span>
        </div>

        <div className="member-finance-grid">
          <div className="member-finance-item">
            <span>Ultimo pago</span>
            <strong>{member.lastPaymentLabel}</strong>
          </div>
          <div className="member-finance-item">
            <span>Vence</span>
            <strong>{member.nextDueLabel}</strong>
          </div>
          <div className="member-finance-item">
            <span>Cuota</span>
            <strong>{member.monthlyFeeLabel}</strong>
          </div>
          <div className="member-finance-item">
            <span>Deuda</span>
            <strong className={`member-debt-value ${member.pendingDebt > 0 ? "debt-highlight" : ""}`}>
              {member.pendingDebtLabel}
            </strong>
          </div>
        </div>
      </div>

      <div className="member-card-actions">
        <button className="secondary-button member-card-button" onClick={() => onOpen(member.id)}>
          Ver ficha
        </button>
        <button
          className="primary-button member-card-button"
          onClick={() => onRegisterPayment(member.id)}
          disabled={!canRegisterPayment}
        >
          Registrar pago
        </button>
        <a
          className={
            member.pendingDebt > 0
              ? "secondary-button member-card-button member-card-link"
              : "secondary-button member-card-button member-card-link is-disabled"
          }
          href={member.pendingDebt > 0 ? member.reminderUrl : undefined}
          target={member.pendingDebt > 0 ? "_blank" : undefined}
          rel={member.pendingDebt > 0 ? "noreferrer" : undefined}
          aria-disabled={member.pendingDebt <= 0}
          onClick={(event) => {
            if (member.pendingDebt <= 0) {
              event.preventDefault();
            }
          }}
        >
          Enviar recordatorio
        </a>
      </div>
    </article>
  );
}
