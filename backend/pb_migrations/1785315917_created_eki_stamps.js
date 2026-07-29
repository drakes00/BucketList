/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": true
      },
      {
        "name": "station_kanji",
        "type": "text"
      },
      {
        "name": "line_name",
        "type": "text"
      },
      {
        "name": "operator",
        "type": "text"
      },
      {
        "name": "station_code",
        "type": "text"
      },
      {
        "name": "line_color",
        "type": "text"
      },
      {
        "name": "is_interchange",
        "type": "bool"
      },
      {
        "name": "lat",
        "type": "number"
      },
      {
        "name": "lon",
        "type": "number"
      },
      {
        "name": "status",
        "type": "select",
        "required": true,
        "maxSelect": 1,
        "values": ["todo", "ongoing", "completed"]
      },
      {
        "name": "date_completed",
        "type": "date"
      },
      {
        "name": "stamp_photo",
        "type": "file",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp", "image/heic"]
      },
      {
        "name": "created",
        "type": "autodate",
        "onCreate": true,
        "onUpdate": false
      },
      {
        "name": "updated",
        "type": "autodate",
        "onCreate": true,
        "onUpdate": true
      }
    ],
    // (line_name, station_code) is unique across the whole source dataset, so this
    // doubles as a duplicate guard: the CSV importer only ever creates, and a second
    // run of the same file fails every row here instead of silently doubling the data.
    "indexes": [
      "CREATE UNIQUE INDEX `idx_eki_stamps_line_code` ON `eki_stamps` (`line_name`, `station_code`)"
    ],
    "listRule": null,
    "name": "eki_stamps",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("eki_stamps");

  return app.delete(collection);
})
