/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("summits_climbed")

  // The lat/lon pair frontend/src/lib/schema.ts detects as geo, enabling the
  // click-to-pin map in the edit form and markers on /map.
  collection.fields.addMarshaledJSON(JSON.stringify([
    { "type": "number", "name": "lat" },
    { "type": "number", "name": "lon" }
  ]))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("summits_climbed")

  collection.fields.removeByName("lat")
  collection.fields.removeByName("lon")

  return app.save(collection)
})
