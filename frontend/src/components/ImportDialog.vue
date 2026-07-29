<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { pb } from '../lib/pocketbase'
import { DELIMITERS, detectDelimiter, parseCsv, toCsv, type Delimiter } from '../lib/csv'
import { buildImportPlan, importableFields, type ImportPlan, type RowError } from '../lib/import'
import type { AchievementCollection } from '../lib/schema'

const props = defineProps<{ collection: AchievementCollection }>()
const emit = defineEmits<{ imported: []; cancel: [] }>()

/** Parallel creates. Enough to hide latency, low enough to stay polite to PocketBase. */
const CONCURRENCY = 5
const PREVIEW_ROWS = 10

const DELIMITER_LABELS: Record<Delimiter, string> = {
  ',': 'Comma (,)',
  ';': 'Semicolon (;)',
  '\t': 'Tab',
}

const fileName = ref('')
const fileText = ref('')
const delimiter = ref<Delimiter | 'auto'>('auto')
const plan = ref<ImportPlan>()
const parseError = ref('')

const importAnyway = ref(false)
const running = ref(false)
const done = ref(0)
const result = ref<{ created: number; failures: RowError[] }>()

const fields = computed(() => importableFields(props.collection))
const activeDelimiter = computed<Delimiter>(() =>
  delimiter.value === 'auto' ? detectDelimiter(fileText.value) : delimiter.value,
)
const columns = computed(() => plan.value?.records.length ? Object.keys(plan.value.records[0].data) : [])
const canImport = computed(
  () =>
    !!plan.value &&
    !plan.value.headerErrors.length &&
    plan.value.records.length > 0 &&
    (!plan.value.errors.length || importAnyway.value),
)

function buildPlan() {
  parseError.value = ''
  plan.value = undefined
  if (!fileText.value) return
  try {
    plan.value = buildImportPlan(props.collection, parseCsv(fileText.value, activeDelimiter.value))
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Could not read the file'
  }
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  result.value = undefined
  importAnyway.value = false
  if (!file) {
    fileName.value = ''
    fileText.value = ''
    plan.value = undefined
    return
  }
  fileName.value = file.name
  fileText.value = await file.text()
  buildPlan()
}

watch(delimiter, buildPlan)

function downloadTemplate() {
  const csv = toCsv([fields.value.map((f) => f.name)], activeDelimiter.value)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.collection.name}_template.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** PocketBase reports per-field validation errors in response.data; surface those first. */
function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, { message?: string }> } })?.response?.data
  const perField = Object.entries(data ?? {}).map(([key, val]) => `${key}: ${val?.message ?? 'invalid'}`)
  if (perField.length) return perField.join('; ')
  return err instanceof Error ? err.message : 'Create failed'
}

async function runImport() {
  const queue = plan.value?.records ?? []
  if (!queue.length) return

  running.value = true
  done.value = 0
  const failures: RowError[] = []
  let created = 0
  let cursor = 0

  const worker = async () => {
    while (cursor < queue.length) {
      const record = queue[cursor++]
      try {
        await pb.collection(props.collection.name).create(record.data)
        created++
      } catch (err) {
        failures.push({ line: record.line, message: errorMessage(err) })
      }
      done.value++
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  running.value = false
  result.value = { created, failures: failures.sort((a, b) => a.line - b.line) }
  plan.value = undefined
  if (created) emit('imported')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">CSV file</label>
        <input type="file" accept=".csv,text/csv" class="text-sm" @change="onFile" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Delimiter</label>
        <select
          v-model="delimiter"
          class="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-sm"
        >
          <option value="auto">Auto ({{ DELIMITER_LABELS[activeDelimiter] }})</option>
          <option v-for="d in DELIMITERS" :key="d" :value="d">{{ DELIMITER_LABELS[d] }}</option>
        </select>
      </div>
      <button type="button" class="text-sm text-indigo-600 hover:underline" @click="downloadTemplate">
        Download template
      </button>
    </div>

    <p class="text-sm text-gray-500">
      One row per record. Column names must match these fields exactly:
      <code>{{ fields.map((f) => f.name).join(', ') }}</code>
    </p>

    <p v-if="parseError" class="text-sm text-red-600">{{ parseError }}</p>

    <!-- Header mismatch: the file is for another collection or was split wrong. Blocks the import. -->
    <div
      v-if="plan?.headerErrors.length"
      class="rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3"
    >
      <p class="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
        This file does not match "{{ collection.name }}" — nothing will be imported.
      </p>
      <ul class="list-disc pl-5 text-sm text-red-700 dark:text-red-400">
        <li v-for="err in plan.headerErrors" :key="err">{{ err }}</li>
      </ul>
    </div>

    <template v-else-if="plan">
      <p class="text-sm">
        <span class="font-medium">{{ plan.records.length }}</span> row(s) ready to import from
        {{ fileName }}<span v-if="plan.errors.length">, {{ plan.errors.length }} problem(s) found</span>.
      </p>

      <div v-if="plan.errors.length" class="max-h-40 overflow-y-auto rounded border border-amber-300 dark:border-amber-800 p-3">
        <ul class="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-500">
          <li v-for="(err, i) in plan.errors" :key="i">
            Line {{ err.line }}<span v-if="err.column"> · {{ err.column }}</span>: {{ err.message }}
          </li>
        </ul>
      </div>

      <div v-if="plan.records.length" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-300 dark:border-gray-600 text-gray-500">
              <th v-for="col in columns" :key="col" class="py-2 pr-3">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in plan.records.slice(0, PREVIEW_ROWS)"
              :key="record.line"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td v-for="col in columns" :key="col" class="py-2 pr-3">{{ record.data[col] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="plan.records.length > PREVIEW_ROWS" class="pt-2 text-sm text-gray-500">
          … and {{ plan.records.length - PREVIEW_ROWS }} more.
        </p>
      </div>

      <label v-if="plan.errors.length && plan.records.length" class="flex items-center gap-2 text-sm">
        <input v-model="importAnyway" type="checkbox" />
        Import the {{ plan.records.length }} valid row(s) and skip the rest
      </label>
    </template>

    <p v-if="running" class="text-sm text-gray-500">
      Importing… {{ done }} / {{ plan?.records.length ?? done }}
    </p>

    <div v-if="result" class="flex flex-col gap-2">
      <p class="text-sm font-medium">Imported {{ result.created }} record(s).</p>
      <div v-if="result.failures.length" class="max-h-40 overflow-y-auto rounded border border-red-300 dark:border-red-800 p-3">
        <p class="mb-1 text-sm font-medium text-red-700 dark:text-red-400">
          {{ result.failures.length }} row(s) rejected by PocketBase:
        </p>
        <ul class="flex flex-col gap-1 text-sm text-red-700 dark:text-red-400">
          <li v-for="(err, i) in result.failures" :key="i">Line {{ err.line }}: {{ err.message }}</li>
        </ul>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="!canImport || running"
        class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        @click="runImport"
      >
        {{ running ? 'Importing…' : `Import ${plan?.records.length ?? 0} record(s)` }}
      </button>
      <button type="button" class="rounded px-3 py-1.5 text-sm" @click="emit('cancel')">Close</button>
    </div>
  </div>
</template>
