/// <reference path="../pb_data/types.d.ts" />

/**
 * Guarantees that every achievement checklist has the `lat`/`lon` pair the app's
 * map view looks for, so a collection can't end up geo-less by accident.
 *
 * Runs on update as well as create, because `status` — the field that makes a
 * collection a checklist — is often added well after the collection exists.
 *
 * Each handler body runs in its own isolated runtime, so the shared logic is
 * require()d rather than referenced from this file's top level.
 */

onCollectionCreate((e) => {
  const { ensureGeoFields } = require(`${__hooks}/geo_fields_util.js`)
  const added = ensureGeoFields(e.collection)
  if (added.length) {
    console.log(`[geo_fields] added ${added.join(', ')} to new "${e.collection.name}"`)
  }
  // Mutating the model before e.next() persists it as part of the caller's own
  // save — no second write, so this cannot recurse.
  e.next()
})

onCollectionUpdate((e) => {
  const { ensureGeoFields } = require(`${__hooks}/geo_fields_util.js`)
  const added = ensureGeoFields(e.collection)
  if (added.length) {
    console.log(`[geo_fields] added ${added.join(', ')} to "${e.collection.name}"`)
  }
  e.next()
})
