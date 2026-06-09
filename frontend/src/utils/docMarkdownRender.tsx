import type { CSSProperties, ReactNode } from 'react'
import type { Components } from 'react-markdown'
import { headingToId } from './markdown'
import {
  docContentRehypePlugins,
  docRemarkPlugins,
} from './markdownSanitize'

export const DOC_MARKDOWN_PREVIEW_CLASS = 'doc-prose wmde-markdown max-w-none'

function mdHeading(level: 1 | 2 | 3, className: string) {
  return ({ children }: { children?: ReactNode }) => {
    const id = headingToId(String(children))
    if (level === 1) return <h1 id={id} className={className}>{children}</h1>
    if (level === 2) return <h2 id={id} className={className}>{children}</h2>
    return <h3 id={id} className={className}>{children}</h3>
  }
}

function mdAnchor() {
  return ({ href, children }: { href?: string; children?: ReactNode }) => {
    if (href && /\.mp4(\?|#|$)/i.test(href)) {
      return (
        <video controls className="my-4 w-full max-w-3xl rounded-lg border border-stone-200" src={href}>
          <track kind="captions" />
        </video>
      )
    }
    return (
      <a href={href} className="ui-link" target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
}

function mdPre({ children }: { children?: ReactNode }) {
  return <pre className="doc-code-block">{children}</pre>
}

function mdCode({ className, children }: { className?: string; children?: ReactNode }) {
  return <code className={className}>{children}</code>
}

function mdImg({
  src,
  alt,
  width,
  height,
  style,
  className,
}: {
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  style?: CSSProperties
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      style={style}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}

/** Shared react-markdown component map — reader + MD editor preview. */
export const docMarkdownComponents: Components = {
  h1: mdHeading(1, 'scroll-mt-20'),
  h2: mdHeading(2, 'scroll-mt-20'),
  h3: mdHeading(3, 'scroll-mt-20'),
  a: mdAnchor(),
  img: mdImg,
  pre: mdPre,
  code: mdCode,
  div: ({ className, children }: { className?: string; children?: ReactNode }) => {
    if (className === 'video-embed') {
      return <div className="video-embed my-4">{children}</div>
    }
    return <div className={className}>{children}</div>
  },
}

/** @uiw/react-md-editor live-preview options aligned with public doc reader. */
export function getDocMarkdownPreviewOptions() {
  return {
    className: DOC_MARKDOWN_PREVIEW_CLASS,
    remarkPlugins: docRemarkPlugins,
    rehypePlugins: docContentRehypePlugins,
    components: docMarkdownComponents,
  }
}
