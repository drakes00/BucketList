import PocketBase from 'pocketbase'

export const pb = new PocketBase('/')

export const SUPERUSERS_COLLECTION = '_superusers'

/** PocketBase-managed collections we never want to show as achievement checklists. */
export const SYSTEM_COLLECTION_PREFIX = '_'
