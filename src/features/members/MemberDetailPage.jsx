import { useMemo } from "react";
import { MemberDetailPanel } from "../../components/MemberDetailPanel";
import { buildDataIndexes, buildMemberSummary } from "../../lib/memberUtils";

export function MemberDetailPage({
  view,
  appData,
  appSettings,
  onNavigate,
  canManageClubScopedData,
  isAllClubsView,
  onSaveMedicalRecord,
  onToggleMemberActive,
  onEditPayment,
  onDeletePayment,
}) {
  const dataIndexes = useMemo(
    () => buildDataIndexes(appData.payments, appData.categories, appData.medicalRecords, appData.credits ?? []),
    [appData.payments, appData.categories, appData.medicalRecords],
  );

  const member = useMemo(() => {
    const raw = appData.members.find((m) => m.id === view.memberId) ?? null;
    if (!raw) return null;
    return buildMemberSummary(raw, dataIndexes, appSettings);
  }, [appData.members, dataIndexes, appSettings, view.memberId]);

  return (
    <div className="member-detail-page">
      <div className="member-detail-page-header">
        <button
          className="secondary-button member-detail-back"
          type="button"
          onClick={() => onNavigate({ section: "members", memberId: null })}
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="12"
            height="12"
            aria-hidden="true"
          >
            <path d="M7.5 2.5l-4 3.5 4 3.5" />
          </svg>
          Volver a socios
        </button>
      </div>
      <MemberDetailPanel
        member={member}
        appSettings={appSettings}
        canManageClubScopedData={canManageClubScopedData}
        isAllClubsView={isAllClubsView}
        onEdit={() => member && onNavigate({ section: "member-form", memberId: member.id })}
        onRegisterPayment={() => member && onNavigate({ section: "register-payment", memberId: member.id })}
        onSaveMedicalRecord={onSaveMedicalRecord}
        onToggleMemberActive={onToggleMemberActive}
        onEditPayment={onEditPayment}
        onDeletePayment={onDeletePayment}
      />
    </div>
  );
}
