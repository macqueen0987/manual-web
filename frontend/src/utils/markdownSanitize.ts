import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { remarkAlert } from 'remark-github-blockquote-alert'
import type { Pluggable } from 'unified'
import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

const ALLOWED_IFRAME_SRC =
  /^https:\/\/(www\.)?(youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/

/** GitHub-style mixed HTML + GFM; follows hast-util-sanitize defaultSchema with doc embeds/alerts. */
export const docSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe', 'mark', 'svg', 'path'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'dir'],
    iframe: [
      'src',
      'title',
      'allow',
      'allowFullScreen',
      'frameBorder',
      'width',
      'height',
    ],
    svg: ['viewBox', 'width', 'height', 'ariaHidden', 'className', 'fill'],
    path: ['d', 'fill'],
  },
}

function rehypeFilterIframes(): (tree: Root) => void {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'iframe') return
      const src = String(node.properties?.src ?? '')
      if (!ALLOWED_IFRAME_SRC.test(src)) {
        node.tagName = 'p'
        node.properties = {}
        node.children = []
      }
    })
  }
}

/** Remark plugins for public doc markdown (GFM + GitHub alerts). */
export const docRemarkPlugins: Pluggable[] = [remarkGfm, remarkAlert]

/** Safe rehype pipeline for public doc markdown (raw HTML → sanitize → embed filter). */
export const docContentRehypePlugins: Pluggable[] = [
  rehypeRaw,
  [rehypeSanitize, docSanitizeSchema],
  rehypeFilterIframes,
  rehypeHighlight,
]
