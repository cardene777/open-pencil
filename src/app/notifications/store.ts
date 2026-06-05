import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord
} from '@/app/api/notifications'
import { useAuthStore } from '@/app/auth/store'

const POLL_INTERVAL_MS = 30_000

function sortNotifications(records: NotificationRecord[]) {
  return [...records].sort((left, right) => {
    const leftUnread = left.readAt === null
    const rightUnread = right.readAt === null
    if (leftUnread !== rightUnread) return leftUnread ? -1 : 1
    return right.createdAt - left.createdAt
  })
}

export const useNotificationsStore = defineStore('notifications', () => {
  const auth = useAuthStore()
  const items = ref<NotificationRecord[]>([])
  const initialized = ref(false)
  const loading = ref(false)
  const refreshing = ref(false)
  let activeConsumers = 0
  let intervalHandle: ReturnType<typeof setInterval> | null = null
  let refreshPromise: Promise<void> | null = null

  const unreadCount = computed(() => items.value.filter((notification) => notification.readAt === null).length)
  const latest = computed(() => items.value.slice(0, 5))

  function clearState() {
    items.value = []
    initialized.value = true
    refreshing.value = false
  }

  function startPolling() {
    if (intervalHandle || activeConsumers === 0) return
    intervalHandle = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (!intervalHandle) return
    clearInterval(intervalHandle)
    intervalHandle = null
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      if (!auth.initialized) {
        await auth.init()
      }

      if (!auth.isAuthenticated) {
        clearState()
        stopPolling()
        return
      }

      const firstLoad = !initialized.value
      loading.value = firstLoad
      refreshing.value = !firstLoad

      try {
        items.value = sortNotifications(await listNotifications())
        initialized.value = true
      } finally {
        loading.value = false
        refreshing.value = false
      }
    })().finally(() => {
      refreshPromise = null
    })

    return refreshPromise
  }

  async function mount() {
    activeConsumers += 1
    await refresh()
    if (auth.isAuthenticated) {
      startPolling()
    }
  }

  function unmount() {
    activeConsumers = Math.max(0, activeConsumers - 1)
    if (activeConsumers === 0) {
      stopPolling()
    }
  }

  async function markRead(notificationId: string) {
    const updated = await markNotificationRead(notificationId)
    items.value = sortNotifications(
      items.value.map((notification) =>
        notification.id === updated.id ? updated : notification
      )
    )
    return updated
  }

  async function markAllRead() {
    await markAllNotificationsRead()
    await refresh()
  }

  async function remove(notificationId: string) {
    await deleteNotification(notificationId)
    items.value = items.value.filter((notification) => notification.id !== notificationId)
  }

  return {
    items,
    initialized,
    loading,
    refreshing,
    unreadCount,
    latest,
    mount,
    unmount,
    refresh,
    markRead,
    markAllRead,
    remove
  }
})
