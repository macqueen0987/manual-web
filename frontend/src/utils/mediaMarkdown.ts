const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i

export function youtubeVideoId(url: string): string | null {
  const m = url.trim().match(YOUTUBE_RE)
  return m?.[1] ?? null
}

export function vimeoVideoId(url: string): string | null {
  const m = url.trim().match(VIMEO_RE)
  return m?.[1] ?? null
}

export function markdownForUpload(
  url: string,
  filename: string,
  kind: 'image' | 'video' | 'file',
): string {
  const name = filename.replace(/[[\]]/g, '')
  if (kind === 'image') {
    return `\n![${name}](${url})\n`
  }
  if (kind === 'video') {
    return `\n[${name}](${url})\n`
  }
  return `\n[${name}](${url})\n`
}

export function markdownForVideoEmbed(url: string): string | null {
  const yt = youtubeVideoId(url)
  if (yt) {
    return `\n<div class="video-embed"><iframe src="https://www.youtube.com/embed/${yt}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n`
  }
  const vimeo = vimeoVideoId(url)
  if (vimeo) {
    return `\n<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vimeo}" title="Vimeo video" frameborder="0" allowfullscreen></iframe></div>\n`
  }
  return null
}

export function uploadKindFromFilename(filename: string): 'image' | 'video' | 'file' {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : ''
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image'
  if (ext === '.mp4') return 'video'
  return 'file'
}
