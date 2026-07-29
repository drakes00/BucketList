export const DELIMITERS = [',', ';', '\t'] as const
export type Delimiter = (typeof DELIMITERS)[number]

/** Picks the delimiter that appears most often outside quotes on the header line. */
export function detectDelimiter(text: string): Delimiter {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  let best: Delimiter = ','
  let bestCount = 0
  for (const delimiter of DELIMITERS) {
    let count = 0
    let inQuotes = false
    for (let i = 0; i < header.length; i++) {
      if (header[i] === '"') inQuotes = !inQuotes
      else if (header[i] === delimiter && !inQuotes) count++
    }
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

/** One parsed record, with the 1-based file line it started on (for error messages). */
export interface CsvRow {
  cells: string[]
  line: number
}

/**
 * RFC 4180 parser: handles quoted fields containing the delimiter or newlines,
 * `""` as an escaped quote, both CRLF and LF, and a leading BOM.
 * Blank lines are dropped.
 */
export function parseCsv(text: string, delimiter: Delimiter): CsvRow[] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: CsvRow[] = []
  let cells: string[] = []
  let cell = ''
  let inQuotes = false
  let line = 1
  let rowLine = 1

  const endCell = () => {
    cells.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    // A trailing newline, or a blank line between records, is not a record.
    if (cells.length > 1 || cells[0] !== '') rows.push({ cells, line: rowLine })
    cells = []
    rowLine = line
  }

  for (let i = 0; i < src.length; i++) {
    const char = src[i]
    if (char === '\n') line++
    if (inQuotes) {
      if (char !== '"') {
        cell += char
      } else if (src[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = false
      }
      continue
    }
    if (char === '"' && cell === '') inQuotes = true
    else if (char === delimiter) endCell()
    else if (char === '\n') endRow()
    else if (char === '\r') continue
    else cell += char
  }
  if (cell !== '' || cells.length) endRow()

  return rows
}

/** Serializes rows back to CSV, quoting only what needs it. */
export function toCsv(rows: string[][], delimiter: Delimiter = ','): string {
  return rows
    .map((row) =>
      row
        .map((cell) =>
          /["\n\r]/.test(cell) || cell.includes(delimiter) ? `"${cell.replaceAll('"', '""')}"` : cell,
        )
        .join(delimiter),
    )
    .join('\n')
}
