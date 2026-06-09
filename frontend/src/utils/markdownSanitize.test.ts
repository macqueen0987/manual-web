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

  it('strips disallowed inline styles', async () => {
    const html = await renderDocHtml('<span style="background:red">x</span>')
    expect(html).not.toContain('style=')
    expect(html).toContain('x')
  })

  it('keeps img width and height HTML attributes', async () => {
    const html = await renderDocHtml(
      '<img src="/uploads/demo.png" alt="Diagram" width="320" height="180" />',
    )
    expect(html).toContain('src="/uploads/demo.png"')
    expect(html).toContain('alt="Diagram"')
    expect(html).toContain('width="320"')
    expect(html).toContain('height="180"')
  })

  it('keeps safe img inline size styles and strips unsafe ones', async () => {
    const allowed = await renderDocHtml(
      '<img src="/a.png" alt="x" style="width: 240px; height: auto" />',
    )
    expect(allowed).toContain('style="width: 240px; height: auto"')

    const blocked = await renderDocHtml(
      '<img src="/a.png" alt="x" style="position:absolute" />',
    )
    expect(blocked).not.toContain('style=')
  })
})
