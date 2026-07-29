<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import '../../lib/leaflet-icon-fix'

const lat = defineModel<number | null>('lat', { default: null })
const lon = defineModel<number | null>('lon', { default: null })

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | undefined
let marker: L.Marker | undefined

const DEFAULT_CENTER: [number, number] = [35.681236, 139.767125] // Tokyo, as a sane default

function setPosition(latLng: L.LatLng) {
  lat.value = Math.round(latLng.lat * 1e6) / 1e6
  lon.value = Math.round(latLng.lng * 1e6) / 1e6
  if (!map) return
  if (marker) {
    marker.setLatLng(latLng)
  } else {
    marker = L.marker(latLng).addTo(map)
  }
}

onMounted(() => {
  if (!mapEl.value) return
  const center: [number, number] = lat.value != null && lon.value != null ? [lat.value, lon.value] : DEFAULT_CENTER
  map = L.map(mapEl.value).setView(center, lat.value != null ? 12 : 4)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  if (lat.value != null && lon.value != null) {
    marker = L.marker(center).addTo(map)
  }
  map.on('click', (e: L.LeafletMouseEvent) => setPosition(e.latlng))
})

onBeforeUnmount(() => {
  map?.remove()
})

watch([lat, lon], ([newLat, newLon]) => {
  if (newLat == null || newLon == null || !map) return
  const latLng = L.latLng(newLat, newLon)
  if (marker) marker.setLatLng(latLng)
  else marker = L.marker(latLng).addTo(map)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div ref="mapEl" class="h-64 w-full rounded border border-gray-300 dark:border-gray-600" />
    <div class="flex gap-2 text-sm">
      <label class="flex items-center gap-1">
        Lat
        <input v-model.number="lat" type="number" step="any" class="w-32 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1" />
      </label>
      <label class="flex items-center gap-1">
        Lon
        <input v-model.number="lon" type="number" step="any" class="w-32 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1" />
      </label>
    </div>
  </div>
</template>
