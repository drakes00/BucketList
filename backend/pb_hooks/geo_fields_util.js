/// <reference path="../pb_data/types.d.ts" />

/**
 * Shared helper for geo_fields.pb.js.
 *
 * This lives in its own module because PocketBase executes each hook handler in a
 * fresh, isolated goja runtime — a handler cannot close over anything defined at
 * the top level of the hook file, so shared code has to be require()d from inside.
 */

const STATUS_FIELD = 'status'
const STATUS_VALUES = ['todo', 'ongoing', 'completed']
const GEO_FIELDS = ['lat', 'lon']

/** Mirrors the checklist detection in frontend/src/lib/schema.ts. */
function isChecklist(collection) {
  if (collection.system || collection.type !== 'base') return false
  if (collection.name.indexOf('_') === 0) return false

  const status = collection.fields.getByName(STATUS_FIELD)
  if (!status || status.type() !== 'select') return false

  const values = status.values || []
  return STATUS_VALUES.every((value) => values.indexOf(value) !== -1)
}

/** Adds any missing lat/lon number fields. Returns the names it added. */
function ensureGeoFields(collection) {
  if (!isChecklist(collection)) return []

  const missing = GEO_FIELDS.filter((name) => !collection.fields.getByName(name))
  if (!missing.length) return []

  collection.fields.addMarshaledJSON(
    JSON.stringify(missing.map((name) => ({ type: 'number', name: name }))),
  )
  return missing
}

module.exports = { ensureGeoFields: ensureGeoFields, isChecklist: isChecklist }
