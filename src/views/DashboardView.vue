<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useI18n } from '@inkly/vue'

import { useAuthStore } from '@/app/auth/store'
import { isBoardOwner } from '@/app/boards/ownership'
import { readPinnedBoardIds, togglePinnedBoard } from '@/app/boards/pinned'
import { readBoardPreview } from '@/app/boards/preview'
import { useNotificationsStore } from '@/app/notifications/store'
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationTarget,
  getNotificationTitle
} from '@/app/notifications/format'
import { initials, toast } from '@/app/shell/ui'
import {
  createBoard,
  createBoardEditorLocation,
  getAnonymousId,
  listBoards,
  type Board
} from '@/app/api/client'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import LoginBanner from '@/components/LoginBanner.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import GuestDashboardView from '@/views/GuestDashboardView.vue'

const { dashboard, notificationsFormat: notificationsFormatT, common: commonT } = useI18n()

useHead({ title: () => dashboard.value.title })

const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const boards = ref<Board[]>([])
const loading = ref(false)
const creating = ref(false)
const previews = ref<Record<string, string>>({})
const pinnedIds = ref<Set<string>>(new Set())

const authDisplayName = computed(() => auth.user?.name?.trim() || auth.user?.email || 'Inkly User')
const authInitials = computed(() => initials(authDisplayName.value))
const showLoginBanner = computed(() => auth.initialized && !auth.isAuthenticated)
const showAccountLink = computed(() => auth.isAuthenticated)
const isOwner = computed(() => (board: Board) =>
  isBoardOwner(board, {
    userId: auth.user?.id ?? null,
    anonymousId: getAnonymousId()
  })
)

const recentBoards = computed(() => [...boards.value].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6))
const pinnedBoards = computed(() => boards.value.filter((board) => pinnedIds.value.has(board.id)))
const totalBoards = computed(() => boards.value.length)
const totalUnread = computed(() => notifications.unreadCount)
const latestNotifications = computed(() => notifications.latest)

function syncPreviews(nextBoards: Board[]) {
  previews.value = Object.fromEntries(
    nextBoards
      .map((board) => [board.id, readBoardPreview(board.id)])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

async function loadDashboardView() {
  loading.value = true
  try {
    boards.value = await listBoards().catch((error) => {
      console.warn('[dashboard]', 'listBoards failed', error)
      return [] as Board[]
    })
    syncPreviews(boards.value)
  } finally {
    loading.value = false
  }
}

async function createQuickBoard() {
  if (creating.value) return
  creating.value = true
  try {
    const board = await createBoard({ name: 'Untitled board' })
    boards.value = [board, ...boards.value]
    void router.push(createBoardEditorLocation(board))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create board'
    toast.error(message)
  } finally {
    creating.value = false
  }
}

async function startGoogleLogin() {
  try {
    await auth.signInWithGoogle(window.location.toString())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google login'
    toast.error(message)
  }
}

function openBoard(board: Board) {
  void router.push(createBoardEditorLocation(board))
}

function handleTogglePin(boardId: string, event: Event) {
  event.stopPropagation()
  const nowPinned = togglePinnedBoard(boardId)
  const next = new Set(pinnedIds.value)
  if (nowPinned) next.add(boardId)
  else next.delete(boardId)
  pinnedIds.value = next
}

function isPinned(boardId: string) {
  return pinnedIds.value.has(boardId)
}

function openNotification(notificationId: string) {
  const notification = notifications.items.find((candidate) => candidate.id === notificationId)
  if (!notification) return
  void router.push(getNotificationTarget(notification))
}

function formatRelativeUpdate(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString()
}

const BOARD_POLL_INTERVAL_MS = 30_000
let boardPollTimer: ReturnType<typeof setInterval> | null = null
let stopNotificationsWatch: (() => void) | null = null

function refreshBoardsSilently() {
  void listBoards()
    .then((next) => {
      boards.value = next
      syncPreviews(next)
    })
    .catch((error) => {
      console.warn('[dashboard]', 'background listBoards failed', error)
    })
}

function startBoardPolling() {
  if (boardPollTimer) return
  boardPollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    refreshBoardsSilently()
  }, BOARD_POLL_INTERVAL_MS)
}

function stopBoardPolling() {
  if (!boardPollTimer) return
  clearInterval(boardPollTimer)
  boardPollTimer = null
}

function onVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') {
    refreshBoardsSilently()
  }
}

onMounted(async () => {
  await auth.init()
  await notifications.mount()
  pinnedIds.value = new Set(readPinnedBoardIds())
  await loadDashboardView()

  // 招待 / 共有変更が来ると notifications WS で push される。 通知数が動いたら
  // board リストを refetch して dashboard をリアルタイム同期する。
  stopNotificationsWatch = watch(
    () => notifications.items.length,
    () => refreshBoardsSilently()
  )

  startBoardPolling()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onUnmounted(() => {
  stopBoardPolling()
  stopNotificationsWatch?.()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<template>
  <GuestDashboardView v-if="auth.isGuest" />
  <main
    v-else
    data-test-id="dashboard-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(89,140,255,0.16),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0d1017)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">{{ dashboard.brand }}</p>
          <span class="text-muted">|</span>
          <h1 class="text-2xl font-semibold text-surface">{{ dashboard.title }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <LocaleSwitcher test-id="dashboard-locale-switcher" />
          <NotificationBell v-if="showAccountLink" />

          <RouterLink
            to="/"
            data-test-id="dashboard-home-link"
            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-canvas/55 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover"
          >
            <icon-lucide-home class="size-4" />
            <span>{{ commonT.home }}</span>
          </RouterLink>

          <RouterLink
            to="/boards"
            data-test-id="dashboard-boards-link"
            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-canvas/55 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover"
          >
            <icon-lucide-layout-grid class="size-4" />
            <span>{{ dashboard.navLinks.boards }}</span>
          </RouterLink>

          <RouterLink
            v-if="showAccountLink"
            to="/account"
            data-test-id="dashboard-account-link"
            class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-canvas/55 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover"
          >
            <img
              v-if="auth.user?.image"
              :src="auth.user.image"
              :alt="`${authDisplayName} avatar`"
              data-test-id="dashboard-account-avatar-image"
              class="size-8 rounded-full object-cover"
            />
            <span
              v-else
              data-test-id="dashboard-account-avatar-fallback"
              class="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(103,149,255,0.85),rgba(78,95,172,0.85))] text-[11px] font-semibold text-white"
            >
              {{ authInitials }}
            </span>
            <span>{{ dashboard.navLinks.account }}</span>
          </RouterLink>
        </div>
      </header>

      <LoginBanner v-if="showLoginBanner" @login="startGoogleLogin" />

      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          data-test-id="dashboard-metric-total-boards"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{{ dashboard.metrics.personalBoards }}</p>
          <p class="text-2xl font-semibold text-surface">{{ totalBoards }}</p>
        </div>
        <div
          data-test-id="dashboard-metric-pinned"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Pinned</p>
          <p class="text-2xl font-semibold text-surface">{{ pinnedBoards.length }}</p>
        </div>
        <div
          data-test-id="dashboard-metric-unread"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{{ dashboard.metrics.unread }}</p>
          <p class="text-2xl font-semibold text-surface">{{ totalUnread }}</p>
        </div>
      </section>

      <section
        data-test-id="dashboard-quick-actions"
        class="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-surface">{{ dashboard.quickActions.heading }}</h2>
            <p class="text-sm text-muted">{{ dashboard.quickActions.subtitle }}</p>
          </div>
          <button
            type="button"
            data-test-id="dashboard-create-board"
            class="cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="creating"
            @click="createQuickBoard"
          >
            <span v-if="creating">{{ dashboard.quickActions.creating }}</span>
            <span v-else>{{ dashboard.quickActions.newBoard }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RouterLink
            to="/boards"
            data-test-id="dashboard-link-boards"
            class="flex flex-col gap-1 rounded-xl border border-white/8 bg-canvas/55 p-4 text-sm text-surface transition-colors hover:bg-hover"
          >
            <icon-lucide-layout-grid class="size-5 text-accent" />
            <span class="font-medium">{{ dashboard.quickActions.allBoards }}</span>
            <span class="text-xs text-muted">{{ dashboard.quickActions.allBoardsHint }}</span>
          </RouterLink>

          <RouterLink
            to="/notifications"
            data-test-id="dashboard-link-notifications"
            class="flex flex-col gap-1 rounded-xl border border-white/8 bg-canvas/55 p-4 text-sm text-surface transition-colors hover:bg-hover"
          >
            <icon-lucide-bell class="size-5 text-accent" />
            <span class="font-medium">{{ dashboard.quickActions.notifications }}</span>
            <span class="text-xs text-muted">{{ typeof dashboard.quickActions.notificationsHint === 'function' ? dashboard.quickActions.notificationsHint({ count: totalUnread }) : '' }}</span>
          </RouterLink>
        </div>
      </section>

      <section
        class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"
      >
        <article class="rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-surface">{{ dashboard.recent.heading }}</h2>
              <p class="text-sm text-muted">{{ dashboard.recent.subtitle }}</p>
            </div>
            <RouterLink
              to="/boards"
              class="text-sm text-accent transition-colors hover:text-accent/80"
            >
              {{ dashboard.recent.viewAll }}
            </RouterLink>
          </div>

          <div v-if="loading" class="rounded-2xl border border-border bg-canvas/45 p-5 text-sm text-muted">
            {{ dashboard.recent.loading }}
          </div>

          <ul v-else-if="recentBoards.length > 0" class="space-y-3">
            <li
              v-for="board in recentBoards"
              :key="board.id"
              data-test-id="dashboard-board"
            >
              <button
                type="button"
                :data-test-id="`dashboard-board-${board.id}`"
                class="flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-canvas/45 p-4 text-left transition-colors hover:bg-hover"
                @click="openBoard(board)"
              >
                <img
                  v-if="previews[board.id]"
                  :src="previews[board.id]"
                  :alt="board.name"
                  class="h-16 w-24 rounded-xl border border-white/8 object-cover"
                />
                <div
                  v-else
                  class="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-white/10 bg-canvas text-[10px] uppercase tracking-[0.18em] text-muted"
                >
                  Preview
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-medium text-surface">{{ board.name }}</p>
                    <span
                      v-if="!isOwner(board)"
                      :data-test-id="`dashboard-invited-badge-${board.id}`"
                      class="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-accent"
                    >
                      {{ dashboard.invitedBadge }}
                    </span>
                    <button
                      type="button"
                      :data-test-id="`dashboard-pin-${board.id}`"
                      class="rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-surface"
                      @click="handleTogglePin(board.id, $event)"
                    >
                      <icon-lucide-pin :class="['size-3.5', isPinned(board.id) ? 'text-accent' : '']" />
                    </button>
                  </div>
                  <p class="mt-1 text-xs text-muted">
                    {{ formatRelativeUpdate(board.updatedAt) }}
                  </p>
                </div>
              </button>
            </li>
          </ul>

          <div
            v-else
            class="rounded-2xl border border-dashed border-border bg-canvas/35 p-6 text-center text-sm text-muted"
          >
            {{ dashboard.recent.empty }}
          </div>
        </article>

        <article class="rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-surface">{{ dashboard.activityFeed.heading }}</h2>
              <p class="text-sm text-muted">{{ dashboard.activityFeed.subtitle }}</p>
            </div>
            <RouterLink
              to="/notifications"
              class="text-sm text-accent transition-colors hover:text-accent/80"
            >
              {{ dashboard.activityFeed.viewAll }}
            </RouterLink>
          </div>

          <ul v-if="latestNotifications.length > 0" class="space-y-3">
            <li
              v-for="notification in latestNotifications"
              :key="notification.id"
            >
              <button
                type="button"
                class="w-full rounded-2xl border border-white/8 bg-canvas/45 p-4 text-left transition-colors hover:bg-hover"
                @click="openNotification(notification.id)"
              >
                <p class="text-sm font-medium text-surface">
                  {{ getNotificationTitle(notification, notificationsFormatT) }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  {{ getNotificationBody(notification, notificationsFormatT) }}
                </p>
                <p class="mt-2 text-[11px] text-muted/80">
                  {{ formatNotificationTime(notification) }}
                </p>
              </button>
            </li>
          </ul>

          <div
            v-else
            class="rounded-2xl border border-dashed border-border bg-canvas/35 p-6 text-center text-sm text-muted"
          >
            {{ dashboard.activityFeed.empty }}
          </div>
        </article>
      </section>
    </div>
  </main>
</template>
