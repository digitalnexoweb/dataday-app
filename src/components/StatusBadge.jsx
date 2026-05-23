import { getStatusLabel } from "../lib/format";

export function StatusBadge({ status, compact = false }) {
  return <span className={compact ? `status-badge is-${status} is-compact` : `status-badge is-${status}`}>{getStatusLabel(status)}</span>;
}
