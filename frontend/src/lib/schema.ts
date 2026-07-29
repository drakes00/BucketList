import type { CollectionModel } from 'pocketbase'
import { SYSTEM_COLLECTION_PREFIX } from './pocketbase'

export const STATUS_VALUES = ['todo', 'ongoing', 'completed'] as const
export type StatusValue = (typeof STATUS_VALUES)[number]

export const STATUS_FIELD = 'status'
export const DATE_COMPLETED_FIELD = 'date_completed'
export const LAT_FIELD = 'lat'
export const LON_FIELD = 'lon'
export const CREATED_FIELD = 'created'
export const NAME_FIELD_CANDIDATES = ['name', 'title']

export interface CollectionField {
  id: string
  name: string
  type: string
  system: boolean
  hidden: boolean
  presentable: boolean
  required?: boolean
  values?: string[]
  maxSelect?: number
  [key: string]: unknown
}

export interface AchievementCollection {
  id: string
  name: string
  fields: CollectionField[]
  statusField: CollectionField
  hasGeo: boolean
  hasCreated: boolean
  nameField?: string
}

function findStatusField(fields: CollectionField[]): CollectionField | undefined {
  const field = fields.find((f) => f.name === STATUS_FIELD && f.type === 'select')
  if (!field) return undefined
  const values = field.values ?? []
  const hasAllStatuses = STATUS_VALUES.every((v) => values.includes(v))
  return hasAllStatuses ? field : undefined
}

/**
 * PocketBase number columns are NOT NULL with a 0 default, so a record that was
 * never given coordinates reads back as 0/0 — a real location in the Gulf of
 * Guinea. Treat that exact pair as "no coordinates" instead of pinning it.
 */
export function toCoords(lat: unknown, lon: unknown): [number, number] | null {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  if (lat === 0 && lon === 0) return null
  return [lat, lon]
}

export function hasGeoPair(fields: CollectionField[]): boolean {
  const hasLat = fields.some((f) => f.name === LAT_FIELD && f.type === 'number')
  const hasLon = fields.some((f) => f.name === LON_FIELD && f.type === 'number')
  return hasLat && hasLon
}

function findNameField(fields: CollectionField[]): string | undefined {
  for (const candidate of NAME_FIELD_CANDIDATES) {
    if (fields.some((f) => f.name === candidate && (f.type === 'text' || f.type === 'editor'))) {
      return candidate
    }
  }
  return undefined
}

/** Turns a raw PocketBase collection list into the subset we treat as achievement checklists. */
export function toAchievementCollections(collections: CollectionModel[]): AchievementCollection[] {
  const result: AchievementCollection[] = []
  for (const col of collections) {
    if (col.system || col.name.startsWith(SYSTEM_COLLECTION_PREFIX)) continue
    const fields = (col.fields ?? []) as CollectionField[]
    const statusField = findStatusField(fields)
    if (!statusField) continue
    result.push({
      id: col.id,
      name: col.name,
      fields: fields.filter((f) => !f.system),
      statusField,
      hasGeo: hasGeoPair(fields),
      hasCreated: fields.some((f) => f.name === CREATED_FIELD && f.type === 'autodate'),
      nameField: findNameField(fields),
    })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function recordDisplayName(collection: AchievementCollection, record: Record<string, unknown>): string {
  if (collection.nameField && typeof record[collection.nameField] === 'string' && record[collection.nameField]) {
    return record[collection.nameField] as string
  }
  return record.id as string
}
