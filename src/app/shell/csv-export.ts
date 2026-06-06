export type CsvCell = string | number

export interface BuildCsvInput {
  header: CsvCell[]
  rows: CsvCell[][]
}

/**
 * Escape a single CSV field according to RFC 4180. Wraps in double quotes when
 * the value contains a comma, double quote, or newline, and doubles internal
 * double quotes.
 */
export function escapeCsvField(value: CsvCell): string {
  const text = String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Build a complete CSV string from a header row and data rows. Every cell is
 * escaped via {@link escapeCsvField}. Rows are joined with `\n`; callers that
 * need `\r\n` should post-process the result.
 */
export function buildCsv({ header, rows }: BuildCsvInput): string {
  return [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\n')
}

export interface TriggerCsvDownloadInput extends BuildCsvInput {
  filename: string
}

/**
 * Build a CSV blob from the given header/rows and trigger a browser download
 * by clicking an in-memory `<a>` element. Returns the number of data rows
 * written so callers can show a per-locale "exported N records" toast.
 *
 * A no-op when run outside a DOM environment (returns 0).
 */
export function triggerCsvDownload({ header, rows, filename }: TriggerCsvDownloadInput): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }

  const csv = buildCsv({ header, rows })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return rows.length
}
