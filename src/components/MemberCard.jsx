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
      <div className="member-card-top">
        {showPlaceholder ? (
          <div className="member-avatar-placeholder" aria-label={member.fullName}>
            {initials || "SN"}
          </div>
        ) : (
          <img
            src={member.photoUrl}
            alt={member.fullName}
            className="member-avatar"
            style={{ width: 64, height: 64 }}
            onError={() => setImageError(true)}
          />
        )}
        <div className="member-card-headline">
          <h3 className="member-card-name">{member.fullName}</h3>
          <p className="member-card-category">{member.categoryName}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <StatusBadge status={member.accountStatus} />
          {(member.creditBalance ?? 0) > 0 ? (
            <span className="member-card-credit-chip">{member.creditBalanceLabel} a favor</span>
          ) : null}
        </div>
      </div>

      <div className="member-finance-grid">
        <div className="member-finance-item">
          <span>Cuota</span>
          <strong>{member.monthlyFeeLabel}</strong>
        </div>
        <div className="member-finance-item">
          <span>Ultimo pago</span>
          <strong>{member.lastPaymentLabel}</strong>
        </div>
        <div className="member-finance-item">
          <span>Vence</span>
          <strong>{member.nextDueLabel}</strong>
        </div>
        <div className="member-finance-item">
          <span>Deuda</span>
          <strong className={member.pendingDebt > 0 ? "debt-highlight" : ""}>
            {member.pendingDebtLabel}
          </strong>
        </div>
      </div>

      <div className="member-card-contact">
        <span className="member-card-contact-item" title={member.email}>
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="1.5" y="3" width="11" height="8" rx="1.5"/>
            <path d="M1.5 4l5.5 4 5.5-4"/>
          </svg>
          {member.email || "Sin email"}
        </span>
        <span className="member-card-contact-item">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 1.5h2l1 3-1.5 1a8 8 0 003.5 3.5l1-1.5 3 1v2A1.5 1.5 0 0110.5 12 9 9 0 012 3.5 1.5 1.5 0 013 1.5z"/>
          </svg>
          {member.phone || "Sin telefono"}
        </span>
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
      </div>
    </article>
  );
}
