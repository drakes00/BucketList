import { createRouter, createWebHistory } from 'vue-router'
import { pb } from '../lib/pocketbase'
import DashboardView from '../views/DashboardView.vue'
import CollectionView from '../views/CollectionView.vue'
import MapView from '../views/MapView.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/c/:name', name: 'collection', component: CollectionView, meta: { requiresAuth: true } },
    { path: '/map', name: 'map', component: MapView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !pb.authStore.isValid) {
    return { name: 'login' }
  }
  if (to.name === 'login' && pb.authStore.isValid) {
    return { name: 'dashboard' }
  }
})

export default router
