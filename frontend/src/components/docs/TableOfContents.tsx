import { type RefObject } from 'react'
import { translate, type Locale } from '../../i18n'
import { headingTextFromMarkdown, headingToId } from '../../utils/markdown'

export interface TocItem {
  level: number
  text: string
  id: string
}

export function extractHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = []
  for (const line of markdown.split('\n')) {
    const match = /^(#{1,3})\s+/.exec(line.trim())
    if (!match) continue
    const text = headingTextFromMarkdown(line)
    if (!text) continue
    items.push({ level: match[1].length, text, id: headingToId(text) })
  }
  return items
}

interface TableOfContentsProps {
  content: string
  locale: Locale
  scrollContainerRef?: RefObject<HTMLElement | null>
}

const TOC_SCROLL_OFFSET_PX = 80
/** UiPath docs–style compact rail: ~40% of viewport, internal scroll when long. */
const TOC_MAX_HEIGHT = 'max-h-[40dvh]'

function scrollToHeading(id: string, scrollContainer: HTMLElement | null | undefined) {
  const target = document.getElementById(id)
  if (!target) return
  if (scrollContainer) {
    const top =
      target.getBoundingClientRect().top -
      scrollContainer.getBoundingClientRect().top +
      scrollContainer.scrollTop -
      TOC_SCROLL_OFFSET_PX
    scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Right rail "On this page" — UiPath docs pattern. */
export default function TableOfContents({
  content,
  locale,
  scrollContainerRef,
}: TableOfContentsProps) {
  const headings = extractHeadings(content)
  if (headings.length === 0) return null

  return (
    <nav
      className="sticky top-6 hidden w-52 shrink-0 self-start xl:block xl:w-56"
      aria-label={translate(locale, 'docs.onThisPage')}
    >
      <div
        className={`${TOC_MAX_HEIGHT} overflow-y-auto overscroll-contain py-2 pr-1`}
      >
        <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-faint">
          {translate(locale, 'docs.onThisPage')}
        </p>
        <ul className="space-y-0.5 border-l border-stone-200 text-[0.8125rem] leading-snug">
          {headings.map((h) => (
            <li key={`${h.id}-${h.text}`}>
              <a
                href={`#${h.id}`}
                style={{ paddingLeft: `${(h.level - 1) * 0.5 + 0.65}rem` }}
                className="block border-l-2 border-transparent py-0.5 text-ink-muted transition-colors hover:border-accent hover:text-accent"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToHeading(h.id, scrollContainerRef?.current ?? null)
                }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
