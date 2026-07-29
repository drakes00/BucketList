import { defineStore } from 'pinia'
import { pb } from '../lib/pocketbase'
import { toAchievementCollections, type AchievementCollection } from '../lib/schema'

export const useSchemaStore = defineStore('schema', {
  state: () => ({
    collections: [] as AchievementCollection[],
    loading: false,
    error: '' as string,
    loaded: false,
  }),
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        const raw = await pb.collections.getFullList()
        this.collections = toAchievementCollections(raw)
        this.loaded = true
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load collections'
        throw err
      } finally {
        this.loading = false
      }
    },
    byName(name: string): AchievementCollection | undefined {
      return this.collections.find((c) => c.name === name)
    },
  },
})
