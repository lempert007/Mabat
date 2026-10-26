export function ProgressBar({ value, indeterminate }: { value?: number; indeterminate?: boolean }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
      {indeterminate ? (
        <div className="h-full w-full shimmer rounded-full" />
      ) : (
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out-soft"
          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
        />
      )}
    </div>
  );
}
