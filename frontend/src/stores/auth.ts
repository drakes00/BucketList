import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pb, SUPERUSERS_COLLECTION } from '../lib/pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(pb.authStore.isValid)
  const email = ref((pb.authStore.record?.email as string) ?? '')
  const error = ref('')
  const loading = ref(false)

  pb.authStore.onChange(() => {
    isAuthenticated.value = pb.authStore.isValid
    email.value = (pb.authStore.record?.email as string) ?? ''
  })

  async function login(identity: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      await pb.collection(SUPERUSERS_COLLECTION).authWithPassword(identity, password)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    pb.authStore.clear()
  }

  return { isAuthenticated, email, error, loading, login, logout }
})
