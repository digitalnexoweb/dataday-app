import { DataTable } from "../../components/DataTable";
import { SectionCard } from "../../components/SectionCard";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate, getChargeablePeriods, MONTH_NAMES } from "../../lib/format";

export function MemberDetailPage({ appData, selectedMember, onNavigate, canManageClubScopedData, isAllClubsView }) {
  if (!selectedMember) {
    return (
      <SectionCard title="Ficha individual" subtitle="Selecciona un socio para ver su detalle.">
        <p>No hay un socio seleccionado.</p>
      </SectionCard>
    );
  }

  const memberPayments = appData.payments.filter((payment) => payment.memberId === selectedMember.id);
  const paidKeys = new Set(memberPayments.map((payment) => `${payment.month}-${payment.year}`));
  const pendingFees = getChargeablePeriods(selectedMember).filter(
    (item) => !paidKeys.has(`${item.month}-${item.year}`),
  );

  return (
    <div className="page-grid">
      <SectionCard
        title="Datos del socio"
        subtitle="Ficha completa con informacion personal y administrativa."
        actions={
          <div className="toolbar">
            <button
              className="secondary-button"
              onClick={() => onNavigate({ section: "member-form", memberId: selectedMember.id })}
              disabled={!canManageClubScopedData}
            >
              Editar datos
            </button>
            <button
              className="primary-button"
              onClick={() => onNavigate({ section: "register-payment", memberId: selectedMember.id })}
              disabled={!canManageClubScopedData}
            >
              Registrar pago
            </button>
          </div>
        }
      >
        {isAllClubsView ? (
          <p className="helper-text">Selecciona un club activo en el header para editar o registrar pagos.</p>
        ) : null}
        <div className="detail-hero">
          <img src={selectedMember.photoUrl} alt={selectedMember.fullName} className="detail-avatar" />
          <div className="detail-content">
            <div className="detail-heading">
              <div>
                <h2>{selectedMember.fullName}</h2>
                <p>{selectedMember.categoryName}</p>
              </div>
              <StatusBadge status={selectedMember.accountStatus} />
            </div>
            <div className="detail-grid">
              <div>
                <span>Fecha de nacimiento</span>
                <strong>{formatDate(selectedMember.birthDate)}</strong>
              </div>
              <div>
                <span>Direccion</span>
                <strong>{selectedMember.address}</strong>
              </div>
              <div>
                <span>Telefono</span>
                <strong>{selectedMember.phone}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{selectedMember.email}</strong>
              </div>
              <div>
                <span>Inicio de inscripcion</span>
                <strong>{formatDate(selectedMember.enrollmentDate)}</strong>
              </div>
              <div>
                <span>Observaciones</span>
                <strong>{selectedMember.notes}</strong>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Historial de cuotas pagas" subtitle="Pagos registrados del socio.">
        <DataTable
          columns={[
            { key: "month", label: "Mes", render: (row) => MONTH_NAMES[row.month - 1] },
            { key: "year", label: "Ano" },
            { key: "amount", label: "Monto", render: (row) => formatCurrency(row.amount) },
            { key: "paymentMethod", label: "Forma de pago" },
            { key: "paymentDate", label: "Fecha de pago", render: (row) => formatDate(row.paymentDate) },
          ]}
          rows={memberPayments}
        />
      </SectionCard>

      <SectionCard title="Cuotas pendientes" subtitle="Meses exigibles no cubiertos desde la inscripcion.">
        <div className="pending-fees">
          {pendingFees.map((item) => (
            <div key={`${item.month}-${item.year}`} className="pending-fee-chip">
              {MONTH_NAMES[item.month - 1]} {item.year}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
