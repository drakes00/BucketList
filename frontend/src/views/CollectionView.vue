<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { RecordModel } from 'pocketbase'
import { pb } from '../lib/pocketbase'
import { useSchemaStore } from '../stores/schema'
import ChecklistTable from '../components/ChecklistTable.vue'
import RecordForm from '../components/RecordForm.vue'
import ImportDialog from '../components/ImportDialog.vue'

const route = useRoute()
const schema = useSchemaStore()

const records = ref<RecordModel[]>([])
const loading = ref(true)
const error = ref('')
const editingRecord = ref<RecordModel | undefined>(undefined)
const showForm = ref(false)
const showImport = ref(false)

const collectionName = computed(() => route.params.name as string)
const collection = computed(() => schema.byName(collectionName.value))

async function loadRecords() {
  if (!collection.value) return
  loading.value = true
  error.value = ''
  try {
    records.value = await pb
      .collection(collection.value.name)
      .getFullList(collection.value.hasCreated ? { sort: '-created' } : {})
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load records'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await schema.load()
  await loadRecords()
})
watch(collectionName, loadRecords)

function openCreate() {
  editingRecord.value = undefined
  showImport.value = false
  showForm.value = true
}
function openImport() {
  showForm.value = false
  showImport.value = true
}
function openEdit(record: RecordModel) {
  editingRecord.value = record
  showImport.value = false
  showForm.value = true
}
async function onSaved() {
  showForm.value = false
  await loadRecords()
}
async function onDelete(record: RecordModel) {
  if (!collection.value) return
  if (!confirm(`Delete "${record.id}"? This cannot be undone.`)) return
  await pb.collection(collection.value.name).delete(record.id)
  await loadRecords()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold capitalize">{{ collectionName.replace(/_/g, ' ') }}</h1>
      <div v-if="collection" class="flex gap-2">
        <button
          class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
          @click="openImport"
        >
          Import CSV
        </button>
        <button
          class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          @click="openCreate"
        >
          + New
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="!collection && !schema.loading" class="text-gray-500">
      Unknown collection "{{ collectionName }}". Make sure it has a
      <code>status</code> select field with values <code>todo</code>,
      <code>ongoing</code>, <code>completed</code>.
    </p>

    <div v-if="collection && showForm" class="rounded border border-gray-300 dark:border-gray-600 p-4">
      <h2 class="mb-3 font-medium">{{ editingRecord ? 'Edit item' : 'New item' }}</h2>
      <RecordForm :collection="collection" :record="editingRecord" @saved="onSaved" @cancel="showForm = false" />
    </div>

    <div v-if="collection && showImport" class="rounded border border-gray-300 dark:border-gray-600 p-4">
      <h2 class="mb-3 font-medium">Import CSV</h2>
      <ImportDialog :collection="collection" @imported="loadRecords" @cancel="showImport = false" />
    </div>

    <p v-if="loading" class="text-gray-500">Loading…</p>
    <ChecklistTable
      v-else-if="collection"
      :collection="collection"
      :records="records"
      @edit="openEdit"
      @delete="onDelete"
    />
  </div>
</template>
