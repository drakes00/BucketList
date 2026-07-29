<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import '../lib/leaflet-icon-fix'
import { pb } from '../lib/pocketbase'
import { LAT_FIELD, LON_FIELD, recordDisplayName } from '../lib/schema'
import { useSchemaStore } from '../stores/schema'

const schema = useSchemaStore()
const mapEl = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const error = ref('')
let map: L.Map | undefined

onMounted(async () => {
  try {
    await schema.load()
    if (!mapEl.value) return
    map = L.map(mapEl.value).setView([20, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const markers: L.LatLng[] = []
    for (const collection of schema.collections.filter((c) => c.hasGeo)) {
      const records = await pb.collection(collection.name).getFullList()
      for (const record of records) {
        const lat = record[LAT_FIELD]
        const lon = record[LON_FIELD]
        if (typeof lat !== 'number' || typeof lon !== 'number') continue
        const latLng = L.latLng(lat, lon)
        markers.push(latLng)
        L.marker(latLng)
          .addTo(map)
          .bindPopup(
            `<strong>${recordDisplayName(collection, record)}</strong><br>${collection.name} &middot; ${record[collection.statusField.name]}`,
          )
      }
    }
    if (markers.length) {
      map.fitBounds(L.latLngBounds(markers), { padding: [30, 30], maxZoom: 12 })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load map'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <div class="flex h-full flex-col gap-2">
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <div ref="mapEl" class="h-[70vh] w-full rounded border border-gray-300 dark:border-gray-600" />
  </div>
</template>
