export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status}`}>{status}</span>;
}

export function EmptyState({ title, small = false }: { title: string; small?: boolean }) {
  return (
    <div className={`empty ${small ? "small" : ""}`}>
      <strong>{title}</strong>
    </div>
  );
}
