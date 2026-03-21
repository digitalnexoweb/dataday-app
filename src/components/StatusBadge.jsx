import { getStatusLabel } from "../lib/format";

export function StatusBadge({ status, compact = false }) {
  return <span className={compact ? `status-badge ${status} is-compact` : `status-badge ${status}`}>{getStatusLabel(status)}</span>;
}
