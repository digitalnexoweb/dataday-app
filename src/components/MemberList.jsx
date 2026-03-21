import { MemberListItem } from "./MemberListItem";

function MemberListSkeleton() {
  return (
    <div className="member-list">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="member-list-skeleton">
          <div className="member-list-skeleton-avatar" />
          <div className="member-list-skeleton-lines">
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemberList({ members, selectedMemberId, onSelect, loading = false }) {
  if (loading) {
    return <MemberListSkeleton />;
  }

  if (!members.length) {
    return (
      <div className="crm-empty-panel crm-empty-panel-dark">
        <strong>No hay socios para mostrar.</strong>
        <p>Cuando agregues socios, apareceran aqui en un listado rapido y minimalista.</p>
      </div>
    );
  }

  return (
    <div className="member-list">
      {members.map((member) => (
        <MemberListItem
          key={member.id}
          member={member}
          isSelected={member.id === selectedMemberId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
