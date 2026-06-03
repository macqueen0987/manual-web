import { Search } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  className?: string
}

export default function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = '문서 검색…',
  className = '',
}: SearchFieldProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        placeholder={placeholder}
        className="ui-input w-full min-w-[12rem] py-1.5 pl-3 pr-9 md:min-w-[14rem]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        aria-label={placeholder}
      />
      <button
        type="button"
        onClick={onSubmit}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label="검색"
      >
        <Search size={16} />
      </button>
    </div>
  )
}
