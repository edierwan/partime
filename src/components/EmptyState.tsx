export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 text-ink-500">
      <div className="text-base font-medium text-ink-700">{title}</div>
      {hint && <div className="text-sm mt-1">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
