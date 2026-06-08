import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { clearAnonymousId, getAnonymousId } from '@/app/api/client'
import {
  getSession,
  loginWithGoogle,
  logout,
  migrateAnonymous,
  requestPasswordReset,
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
  type AuthSession,
  type MigrateAnonymousResponse
} from '@/app/auth/client'

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
  const providerId = computed(() => session.value?.user.providerId ?? null)
  const isAuthenticated = computed(() => !!session.value?.user.id)
  const isExternalUser = computed(
    () => providerId.value !== null && providerId.value !== 'google'
  )

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

  async function signInWithPassword(input: {
    email: string
    password: string
    callbackURL?: string
  }) {
    loginPending.value = true

    try {
      await signInWithEmail(input)
      await refreshSession()
    } finally {
      loginPending.value = false
    }
  }

  async function signUpWithPassword(input: {
    email: string
    invitationToken: string
    name: string
    password: string
    callbackURL?: string
  }) {
    loginPending.value = true

    try {
      await signUpWithEmail(input)
      await refreshSession()
    } finally {
      loginPending.value = false
    }
  }

  function sendPasswordReset(input: { email: string; redirectTo: string }) {
    return requestPasswordReset(input)
  }

  function submitPasswordReset(input: { newPassword: string; token: string }) {
    return resetPassword(input)
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
    providerId,
    initialized,
    loading,
    loginPending,
    logoutPending,
    migrating,
    isAuthenticated,
    isExternalUser,
    lastMigration,
    init,
    refreshSession,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    submitPasswordReset,
    signOut
  }
})
