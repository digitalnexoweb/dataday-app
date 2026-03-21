export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="crm-tabs" role="tablist" aria-label="Secciones del socio">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? "crm-tab is-active" : "crm-tab"}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
