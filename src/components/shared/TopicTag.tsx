export function TopicTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--blue-grey-100)] text-[var(--slate-500)] border border-[var(--blue-grey-300)] font-medium">
      {label}
    </span>
  );
}
