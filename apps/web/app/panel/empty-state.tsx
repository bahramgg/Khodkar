export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-16 text-center text-sm text-ink-muted">
        {message}
      </div>
    </section>
  );
}
