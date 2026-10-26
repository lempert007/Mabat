export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-white/8 border border-line px-1.5 font-sans text-[11px] text-fg-3">
      {children}
    </kbd>
  );
}
