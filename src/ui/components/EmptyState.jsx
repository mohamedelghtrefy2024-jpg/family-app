export default function EmptyState({ title, hint, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      <p style={{ marginTop: 0 }}>{hint}</p>
      {actionLabel && (
        <button className="btn btn-primary" onClick={onAction} style={{ marginTop: 10 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
