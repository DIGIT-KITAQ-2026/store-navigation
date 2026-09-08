interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="animate-fade-in-up flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface px-6 py-10 text-center"
    >
      <p className="text-base font-medium text-on-surface-variant">{message}</p>
    </div>
  );
}
