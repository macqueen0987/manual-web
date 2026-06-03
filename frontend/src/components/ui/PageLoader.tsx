export default function PageLoader({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-accent"
        aria-hidden
      />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  )
}
