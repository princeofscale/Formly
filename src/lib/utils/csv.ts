export function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}
