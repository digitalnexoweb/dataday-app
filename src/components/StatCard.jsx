export function StatCard({
  label,
  value,
  trend,
  accent = "blue",
  emphasis = "neutral",
  featured = false,
  onClick = null,
}) {
  function handleKeyDown(event) {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <article
      className={
        onClick
          ? `stat-card accent-${accent} emphasis-${emphasis}${featured ? " is-featured" : ""} is-clickable`
          : `stat-card accent-${accent} emphasis-${emphasis}${featured ? " is-featured" : ""}`
      }
      onClick={onClick ?? undefined}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="stat-card-accent" aria-hidden="true" />
      <p className="stat-card-label">{label}</p>
      <strong className="stat-card-value">{value}</strong>
      <span className="stat-card-trend">{trend}</span>
    </article>
  );
}
