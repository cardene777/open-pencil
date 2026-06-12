import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { clearAnonymousId, getAnonymousId } from '@/app/api/client'
import {
  getSession,
  loginWithGoogle,
  logout,
  migrateAnonymous,
  type AuthSession,
  type MigrateAnonymousResponse
} from '@/app/auth/client'
import { isJfetMember, isGuestUser } from '@/app/auth/email'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const loginPending = ref(false)
  const logoutPending = ref(false)
  const migrating = ref(false)
  const lastMigration = ref<MigrateAnonymousResponse | null>(null)
  let initPromise: Promise<void> | null = null

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value?.user.id)
  const userEmail = computed(() => user.value?.email ?? null)
  const isJfetUser = computed(() => isJfetMember(userEmail.value))
  const isGuest = computed(() => !!user.value && isGuestUser(userEmail.value))

  async function maybeMigrateAnonymousState() {
    const anonymousId = getAnonymousId()?.trim()
    if (!session.value || !anonymousId || migrating.value) return null

    migrating.value = true

    try {
      const result = await migrateAnonymous(anonymousId)
      clearAnonymousId()
      lastMigration.value = result
      return result
    } catch (error) {
      console.warn('[auth] failed to migrate anonymous boards', error)
      return null
    } finally {
      migrating.value = false
    }
  }

  async function refreshSession() {
    loading.value = true

    try {
      session.value = await getSession()
      if (session.value) {
        await maybeMigrateAnonymousState()
      }
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  function init() {
    if (!initPromise) {
      initPromise = refreshSession().finally(() => {
        initPromise = null
      })
    }

    return initPromise
  }

  async function signInWithGoogle(callbackURL?: string) {
    loginPending.value = true

    try {
      await loginWithGoogle(callbackURL)
    } finally {
      loginPending.value = false
    }
  }

  async function signOut() {
    logoutPending.value = true

    try {
      await logout()
      session.value = null
      lastMigration.value = null
      initialized.value = true
    } finally {
      logoutPending.value = false
    }
  }

  return {
    session,
    user,
    initialized,
    loading,
    loginPending,
    logoutPending,
    migrating,
    isAuthenticated,
    userEmail,
    isJfetUser,
    isGuest,
    lastMigration,
    init,
    refreshSession,
    signInWithGoogle,
    signOut
  }
})
