import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { Pluggable } from 'unified'
import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

const ALLOWED_IFRAME_SRC =
  /^https:\/\/(www\.)?(youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/

const docSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe'],
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), 'className'],
    iframe: [
      'src',
      'title',
      'allow',
      'allowFullScreen',
      'frameBorder',
      'width',
      'height',
    ],
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

/** Safe rehype pipeline for public doc markdown (raw HTML → sanitize → embed filter). */
export const docContentRehypePlugins: Pluggable[] = [
  rehypeRaw,
  [rehypeSanitize, docSanitizeSchema],
  rehypeFilterIframes,
  rehypeHighlight,
]
