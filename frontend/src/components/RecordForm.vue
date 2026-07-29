<script setup lang="ts">
import { reactive, ref, watch, computed, type Component } from 'vue'
import type { RecordModel } from 'pocketbase'
import { pb } from '../lib/pocketbase'
import {
  DATE_COMPLETED_FIELD,
  LAT_FIELD,
  LON_FIELD,
  STATUS_FIELD,
  type AchievementCollection,
  type CollectionField,
} from '../lib/schema'
import TextField from './fields/TextField.vue'
import NumberField from './fields/NumberField.vue'
import BoolField from './fields/BoolField.vue'
import DateField from './fields/DateField.vue'
import SelectField from './fields/SelectField.vue'
import FileField from './fields/FileField.vue'
import GeoPointField from './fields/GeoPointField.vue'

const props = defineProps<{
  collection: AchievementCollection
  record?: RecordModel
}>()

const emit = defineEmits<{ saved: [RecordModel]; cancel: [] }>()

const saving = ref(false)
const error = ref('')

const values = reactive<Record<string, unknown>>({})
const fileValues = reactive<Record<string, File | null>>({})

function initValues() {
  for (const key of Object.keys(values)) delete values[key]
  for (const key of Object.keys(fileValues)) delete fileValues[key]
  for (const field of props.collection.fields) {
    if (field.type === 'file') {
      fileValues[field.name] = null
      continue
    }
    const existing = props.record?.[field.name]
    if (field.name === STATUS_FIELD) {
      values[field.name] = existing ?? 'todo'
    } else {
      values[field.name] = existing ?? (field.type === 'number' ? null : '')
    }
  }
}
initValues()
watch(() => props.record, initValues)

// Auto-fill completion date when status flips to "completed".
watch(
  () => values[STATUS_FIELD],
  (status) => {
    if (status === 'completed' && !values[DATE_COMPLETED_FIELD]) {
      values[DATE_COMPLETED_FIELD] = new Date().toISOString().slice(0, 10)
    }
  },
)

const isGeoField = (field: CollectionField) => field.name === LAT_FIELD || field.name === LON_FIELD

const visibleFields = computed(() =>
  props.collection.fields.filter((f) => f.name !== LON_FIELD && !f.hidden),
)

// Fields are rendered dynamically from schema data, so prop types can't be
// statically matched per-component here; the runtime shapes always agree.
function componentFor(field: CollectionField): Component {
  switch (field.type) {
    case 'text':
    case 'editor':
      return TextField
    case 'number':
      return NumberField
    case 'bool':
      return BoolField
    case 'date':
    case 'autodate':
      return DateField
    case 'select':
      return SelectField
    case 'file':
      return FileField
    default:
      return TextField
  }
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const hasFile = Object.values(fileValues).some((f) => f != null)
    let body: FormData | Record<string, unknown>
    if (hasFile) {
      const fd = new FormData()
      for (const [key, val] of Object.entries(values)) {
        if (val != null) fd.append(key, String(val))
      }
      for (const [key, file] of Object.entries(fileValues)) {
        if (file) fd.append(key, file)
      }
      body = fd
    } else {
      body = { ...values }
    }

    const saved = props.record
      ? await pb.collection(props.collection.name).update(props.record.id, body)
      : await pb.collection(props.collection.name).create(body)
    emit('saved', saved)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <template v-for="field in visibleFields" :key="field.id">
      <div v-if="field.name === LAT_FIELD" class="flex flex-col gap-1">
        <label class="text-sm font-medium">Location</label>
        <GeoPointField v-model:lat="(values[LAT_FIELD] as number | null)" v-model:lon="(values[LON_FIELD] as number | null)" />
      </div>
      <div v-else-if="!isGeoField(field)" class="flex flex-col gap-1">
        <label class="text-sm font-medium capitalize">{{ field.name.replace(/_/g, ' ') }}</label>
        <component
          :is="componentFor(field)"
          v-if="field.type !== 'file'"
          :model-value="values[field.name]"
          :field="field"
          @update:model-value="(v: unknown) => (values[field.name] = v)"
        />
        <FileField
          v-else
          v-model="fileValues[field.name]"
          :field="field"
          :collection-name="collection.name"
          :record-id="record?.id"
          :existing-value="record?.[field.name]"
        />
      </div>
    </template>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="flex gap-2">
      <button
        type="submit"
        :disabled="saving"
        class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
      <button type="button" class="rounded px-3 py-1.5 text-sm" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
