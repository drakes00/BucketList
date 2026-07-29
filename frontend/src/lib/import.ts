import type { CsvRow } from './csv'
import type { AchievementCollection, CollectionField } from './schema'

/** Field types we can never populate from a CSV cell. */
const UNIMPORTABLE_TYPES: Record<string, string> = {
  file: 'file fields must be uploaded by editing the record',
  autodate: 'this field is set automatically by PocketBase',
}

export interface RowError {
  line: number
  column?: string
  message: string
}

export interface PlannedRecord {
  line: number
  data: Record<string, unknown>
}

export interface ImportPlan {
  /** Non-empty means the file does not match the collection — the import is refused outright. */
  headerErrors: string[]
  records: PlannedRecord[]
  errors: RowError[]
}

/** The fields a CSV may supply values for, in schema order. */
export function importableFields(collection: AchievementCollection): CollectionField[] {
  return collection.fields.filter((f) => !f.hidden && !(f.type in UNIMPORTABLE_TYPES))
}

function coerce(field: CollectionField, raw: string): { value: unknown } | { error: string } {
  const text = raw.trim()

  switch (field.type) {
    case 'number': {
      const value = Number(text)
      if (!Number.isFinite(value)) return { error: `"${raw}" is not a number` }
      return { value }
    }
    case 'bool': {
      const lower = text.toLowerCase()
      if (['true', '1', 'yes'].includes(lower)) return { value: true }
      if (['false', '0', 'no'].includes(lower)) return { value: false }
      return { error: `"${raw}" is not a boolean (use true/false, 1/0 or yes/no)` }
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}([ T].*)?$/.test(text) || Number.isNaN(Date.parse(text))) {
        return { error: `"${raw}" is not a date (use YYYY-MM-DD or an ISO timestamp)` }
      }
      return { value: text }
    }
    case 'select': {
      const allowed = field.values ?? []
      const picked = (field.maxSelect ?? 1) > 1 ? text.split('|').map((v) => v.trim()) : [text]
      const bad = picked.find((v) => !allowed.includes(v))
      if (bad !== undefined) {
        return { error: `"${bad}" is not allowed here (expected one of: ${allowed.join(', ')})` }
      }
      return { value: (field.maxSelect ?? 1) > 1 ? picked : text }
    }
    default:
      return { value: raw }
  }
}

function validateHeader(
  collection: AchievementCollection,
  headers: string[],
): { errors: string[]; columns: (CollectionField | undefined)[] } {
  const errors: string[] = []
  const columns: (CollectionField | undefined)[] = []
  const seen = new Set<string>()

  headers.forEach((header, index) => {
    if (!header) {
      errors.push(`Column ${index + 1} has no name.`)
      columns.push(undefined)
      return
    }
    if (seen.has(header)) {
      errors.push(`Column "${header}" appears more than once.`)
      columns.push(undefined)
      return
    }
    seen.add(header)

    const field = collection.fields.find((f) => f.name === header)
    if (!field) {
      errors.push(`Column "${header}" does not match any field on "${collection.name}".`)
      columns.push(undefined)
      return
    }
    const unimportable = UNIMPORTABLE_TYPES[field.type]
    if (unimportable) {
      errors.push(`Column "${header}" cannot be imported — ${unimportable}. Remove it.`)
      columns.push(undefined)
      return
    }
    columns.push(field)
  })

  for (const field of importableFields(collection)) {
    if (field.required && !seen.has(field.name)) {
      errors.push(`Required field "${field.name}" has no column.`)
    }
  }

  return { errors, columns }
}

/**
 * Checks a parsed CSV against a collection's real schema and builds the record
 * payloads. Purely local — nothing is written until the caller acts on the plan.
 */
export function buildImportPlan(collection: AchievementCollection, rows: CsvRow[]): ImportPlan {
  const [header, ...dataRows] = rows
  if (!header) return { headerErrors: ['The file is empty.'], records: [], errors: [] }

  const { errors: headerErrors, columns } = validateHeader(
    collection,
    header.cells.map((cell) => cell.trim()),
  )
  if (headerErrors.length) return { headerErrors, records: [], errors: [] }

  const records: PlannedRecord[] = []
  const errors: RowError[] = []

  for (const row of dataRows) {
    const data: Record<string, unknown> = {}
    let rowFailed = false

    columns.forEach((field, index) => {
      if (!field) return
      const raw = row.cells[index] ?? ''
      if (raw.trim() === '') {
        // Leave it out so PocketBase applies its own default.
        if (field.required) {
          errors.push({ line: row.line, column: field.name, message: 'required value is empty' })
          rowFailed = true
        }
        return
      }
      const result = coerce(field, raw)
      if ('error' in result) {
        errors.push({ line: row.line, column: field.name, message: result.error })
        rowFailed = true
        return
      }
      data[field.name] = result.value
    })

    if (row.cells.length > columns.length) {
      errors.push({
        line: row.line,
        message: `has ${row.cells.length} values but the header declares ${columns.length}`,
      })
      rowFailed = true
    }

    if (!rowFailed) records.push({ line: row.line, data })
  }

  return { headerErrors: [], records, errors }
}
