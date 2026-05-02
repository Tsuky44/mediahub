import Convert from 'ansi-to-html'

const convert = new Convert({
  newline: true,
  escapeXML: true,
  fg: '#e5e7eb',
  bg: '#000000',
})

export function colorizeLog(text: string): string {
  let html = convert.toHtml(text)

  if (!html.includes('style="color')) {
    if (/\b(ERROR|FATAL|ERR|FAIL)\b/i.test(text)) {
      return `<span style="color: #ef4444">${html}</span>`
    }
    if (/\b(WARN|WARNING)\b/i.test(text)) {
      return `<span style="color: #f59e0b">${html}</span>`
    }

    html = html.replace(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g,
      '<span style="color: #6b7280">$1</span>'
    )
    html = html.replace(/\b(INFO)\b/gi, '<span style="color: #10b981; font-weight: bold">$1</span>')
    html = html.replace(/\b(DEBUG)\b/gi, '<span style="color: #3b82f6">$1</span>')
    html = html.replace(/\[([^\]]+)\]/g, '<span style="color: #60a5fa">[$1]</span>')
  }

  return html
}
