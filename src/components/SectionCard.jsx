export function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={className ? `section-card ${className}` : "section-card"}>
      <div className="section-card-header">
        <div className="section-card-heading">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
