<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const classes = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'ongoing':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
})
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="classes">{{ status }}</span>
</template>
