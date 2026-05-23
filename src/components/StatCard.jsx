export function StatCard({
  label,
  value,
  trend,
  accent = "blue",
  emphasis = "neutral",
  featured = false,
  wide = false,
  trendDir = null,
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

  const cls = [
    "stat-card",
    `accent-${accent}`,
    `emphasis-${emphasis}`,
    featured ? "is-featured" : "",
    wide ? "is-wide" : "",
    onClick ? "is-clickable" : "",
  ].filter(Boolean).join(" ");

  const trendCls = [
    "stat-card-trend",
    trendDir === "up" ? "is-up" : trendDir === "down" ? "is-down" : "",
  ].filter(Boolean).join(" ");

  return (
    <article
      className={cls}
      onClick={onClick ?? undefined}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="stat-card-accent" aria-hidden="true" />
      <p className="stat-card-label">{label}</p>
      <strong className="stat-card-value">{value}</strong>
      <span className={trendCls}>{trend}</span>
    </article>
  );
}
