import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { docContentRehypePlugins, docRemarkPlugins } from './markdownSanitize'

function applyPlugins(
  processor: ReturnType<typeof unified>,
  plugins: typeof docRemarkPlugins,
): ReturnType<typeof unified> {
  let next = processor
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      next = next.use(plugin[0], plugin[1])
    } else {
      next = next.use(plugin)
    }
  }
  return next
}

async function renderDocHtml(markdown: string): Promise<string> {
  const processor = applyPlugins(
    unified().use(remarkParse),
    docRemarkPlugins,
  )
    .use(remarkRehype, { allowDangerousHtml: true })
  const withRehype = applyPlugins(processor, docContentRehypePlugins)
  const file = await withRehype.use(rehypeStringify).process(markdown)
  return String(file).trim()
}

describe('doc markdown render (GitHub-like)', () => {
  it('renders GitHub alert blockquote', async () => {
    const html = await renderDocHtml('> [!WARNING]\n> Watch out')
    expect(html).toContain('markdown-alert-warning')
    expect(html).toContain('markdown-alert-title')
    expect(html).toContain('Watch out')
  })

  it('keeps details/summary HTML', async () => {
    const html = await renderDocHtml('<details><summary>More</summary>Hidden</details>')
    expect(html).toContain('<details>')
    expect(html).toContain('<summary>More</summary>')
  })

  it('keeps mark and span classes', async () => {
    const html = await renderDocHtml('<mark>highlight</mark> and <span class="badge">NEW</span>')
    expect(html).toContain('<mark>highlight</mark>')
    expect(html).toContain('class="badge"')
  })

  it('strips script tags', async () => {
    const html = await renderDocHtml('<script>alert(1)</script><p>ok</p>')
    expect(html).not.toContain('script')
    expect(html).toContain('ok')
  })

  it('strips inline style', async () => {
    const html = await renderDocHtml('<span style="color:red">x</span>')
    expect(html).not.toContain('style=')
    expect(html).toContain('x')
  })
})
