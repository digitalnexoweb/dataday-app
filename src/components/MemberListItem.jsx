import { useMemo, useState } from "react";
export function MemberListItem({ member, isSelected, onSelect }) {
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
    <button
      className={isSelected ? "member-list-item is-selected" : "member-list-item"}
      type="button"
      onClick={() => onSelect(member.id)}
    >
      <div className="member-list-item-avatar-shell">
        {showPlaceholder ? (
          <div className="member-list-item-avatar member-avatar-placeholder">{initials || "SN"}</div>
        ) : (
          <img
            src={member.photoUrl}
            alt={member.fullName}
            className="member-list-item-avatar"
            onError={() => setImageError(true)}
          />
        )}
        {member.pendingDebt > 0 ? <span className="member-list-item-debt-dot" aria-hidden="true" /> : null}
      </div>

      <div className="member-list-item-main">
        <div className="member-list-item-header">
          <strong>{member.fullName}</strong>
          <span
            className={
              member.accountStatus === "current"
                ? "member-list-item-status-dot is-current"
                : member.accountStatus === "pending"
                  ? "member-list-item-status-dot is-pending"
                  : "member-list-item-status-dot is-late"
            }
            aria-hidden="true"
          />
        </div>
        <p>{member.categoryName}</p>
      </div>
    </button>
  );
}
