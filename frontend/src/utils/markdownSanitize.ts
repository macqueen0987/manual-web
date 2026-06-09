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
    span: ['className', 'style'],
    mark: ['className'],
    iframe: [
      'src',
      'title',
      'allow',
      'allowFullScreen',
      'frameBorder',
      'width',
      'height',
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'alt',
      'width',
      'height',
      'className',
      'loading',
      'title',
      'style',
    ],
    svg: ['viewBox', 'width', 'height', 'ariaHidden', 'className', 'fill'],
    path: ['d', 'fill'],
  },
}

const ALLOWED_IMG_STYLE =
  /^(?:(?:width|max-width|height|max-height)\s*:\s*(?:\d+(?:\.\d+)?(?:px|%|rem|em|vw|vh)|auto)\s*;?\s*)+$/i

const ALLOWED_INLINE_COLOR_STYLE =
  /^color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|[a-z]{3,20})\s*;?$/i

function rehypeFilterSpanStyles(): (tree: Root) => void {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'span') return
      const style = String(node.properties?.style ?? '').trim()
      if (!style) return
      if (!ALLOWED_INLINE_COLOR_STYLE.test(style)) {
        delete node.properties.style
      }
    })
  }
}

function rehypeFilterImgStyles(): (tree: Root) => void {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const style = String(node.properties?.style ?? '').trim()
      if (!style) return
      if (!ALLOWED_IMG_STYLE.test(style)) {
        delete node.properties.style
      }
    })
  }
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
  rehypeFilterSpanStyles,
  rehypeFilterImgStyles,
  rehypeFilterIframes,
  rehypeHighlight,
]
