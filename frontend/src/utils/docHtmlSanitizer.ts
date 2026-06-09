import DOMPurify from 'dompurify'

const ALLOWED_IMG_STYLE =
  /^(?:(?:width|max-width|height|max-height)\s*:\s*(?:\d+(?:\.\d+)?(?:px|%|rem|em|vw|vh)|auto)\s*;?\s*)+$/i

const ALLOWED_SPAN_COLOR_STYLE =
  /^color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|[a-z]{3,20})\s*;?$/i

let sanitizerHookReady = false

function ensureSanitizerHook() {
  if (sanitizerHookReady) return
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName !== 'style') return
    const tag = node.tagName?.toLowerCase()
    if (tag === 'img' && !ALLOWED_IMG_STYLE.test(String(data.attrValue).trim())) {
      data.keepAttr = false
    }
    if (tag === 'span' && !ALLOWED_SPAN_COLOR_STYLE.test(String(data.attrValue).trim())) {
      data.keepAttr = false
    }
  })
  sanitizerHookReady = true
}

/** HTML sanitizer for WYSIWYG editor — mirrors public doc markdown allowlist. */
export function docHtmlSanitizer(html: string): string {
  ensureSanitizerHook()
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['width', 'height', 'class', 'style', 'loading', 'target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
    ADD_TAGS: ['iframe', 'mark', 'details', 'summary'],
  })
}
