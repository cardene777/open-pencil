<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useI18n } from '@inkly/vue'

import { useAuthStore } from '@/app/auth/store'
import { useNotificationsStore } from '@/app/notifications/store'
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationTarget,
  getNotificationTitle
} from '@/app/notifications/format'
import { initials, toast } from '@/app/shell/ui'
import {
  createBoardEditorLocation,
  deleteBoard,
  listBoards,
  type Board
} from '@/app/api/client'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import LoginBanner from '@/components/LoginBanner.vue'

import { triggerCsvDownload, type CsvCell } from '@/app/shell/csv-export'

const { admin, locale, notificationsFormat: notificationsFormatT } = useI18n()

useHead({ title: () => admin.value.title })

type TabKey = 'overview' | 'boards' | 'activity'
type BoardSortKey = 'updated' | 'created' | 'name' | 'collaborators'

const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const boards = ref<Board[]>([])
const loading = ref(false)
const tab = ref<TabKey>('overview')
const searchQuery = ref('')
const boardSort = ref<BoardSortKey>('updated')
const boardSortDirection = ref<'asc' | 'desc'>('desc')
const deletingBoardId = ref<string | null>(null)
const activitySearch = ref('')
const activityTypeFilter = ref<'all' | 'invitation' | 'mention'>('all')
const activityRangeFilter = ref<'all' | '24h' | '7d' | '30d'>('all')

const authDisplayName = computed(() => auth.user?.name?.trim() || auth.user?.email || 'Inkly User')
const authInitials = computed(() => initials(authDisplayName.value))
const showLoginBanner = computed(() => auth.initialized && !auth.isAuthenticated)

const filteredBoards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = boards.value.filter((board) => {
    if (!query) return true
    return board.name.toLowerCase().includes(query) || board.id.includes(query)
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    let aValue: number | string
    let bValue: number | string
    switch (boardSort.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'created':
        aValue = a.createdAt
        bValue = b.createdAt
        break
      case 'collaborators':
        aValue = a.collaborators.length
        bValue = b.collaborators.length
        break
      case 'updated':
      default:
        aValue = a.updatedAt
        bValue = b.updatedAt
    }

    if (aValue < bValue) return boardSortDirection.value === 'asc' ? -1 : 1
    if (aValue > bValue) return boardSortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  return sorted
})

function toggleSort(key: BoardSortKey) {
  if (boardSort.value === key) {
    boardSortDirection.value = boardSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    boardSort.value = key
    boardSortDirection.value = key === 'name' ? 'asc' : 'desc'
  }
}

const activityBase = computed(() => notifications.items.slice(0, 50))

function activityRangeMs(range: 'all' | '24h' | '7d' | '30d'): number {
  switch (range) {
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
    default:
      return Number.POSITIVE_INFINITY
  }
}

const activityItems = computed(() => {
  const query = activitySearch.value.trim().toLowerCase()
  const rangeMs = activityRangeMs(activityRangeFilter.value)
  const threshold = Date.now() - rangeMs

  return activityBase.value.filter((record) => {
    if (activityTypeFilter.value !== 'all' && record.type !== activityTypeFilter.value) return false
    if (Number.isFinite(rangeMs) && record.createdAt < threshold) return false
    if (!query) return true
    const title = getNotificationTitle(record, notificationsFormatT.value).toLowerCase()
    const body = getNotificationBody(record, notificationsFormatT.value).toLowerCase()
    return title.includes(query) || body.includes(query)
  })
})

const totalBoards = computed(() => boards.value.length)
const totalCollaborators = computed(() => {
  const ids = new Set<string>()
  for (const board of boards.value) {
    for (const collab of board.collaborators) {
      const id = collab.userId ?? collab.anonymousId
      if (id) ids.add(id)
    }
  }
  return ids.size
})

async function loadAdminView() {
  loading.value = true
  try {
    boards.value = await listBoards().catch(() => [] as Board[])
  } finally {
    loading.value = false
  }
}

function openActivity(notificationId: string) {
  const record = notifications.items.find((item) => item.id === notificationId)
  if (!record) return
  void router.push(getNotificationTarget(record))
}

function notifyExportSuccess(
  count: number,
  singular: (input: { count: number }) => string,
  plural: (input: { count: number }) => string
) {
  const message = count === 1 ? singular({ count }) : plural({ count })
  toast.info(message)
}

function exportActivityCsv() {
  const a = admin.value.activityTab
  const header: CsvCell[] = [
    a.csvHeaderId,
    a.csvHeaderType,
    a.csvHeaderTitle,
    a.csvHeaderBody,
    a.csvHeaderCreatedAt,
    a.csvHeaderReadAt
  ]
  const rows: CsvCell[][] = activityItems.value.map((record) => [
    record.id,
    record.type,
    getNotificationTitle(record, notificationsFormatT.value) || a.csvUnknown,
    getNotificationBody(record, notificationsFormatT.value) || a.csvUnknown,
    new Date(record.createdAt).toISOString(),
    record.readAt === null ? a.csvUnknown : new Date(record.readAt).toISOString()
  ])

  const count = triggerCsvDownload({
    header,
    rows,
    filename: `inkly-activity-${locale.value}-${Date.now()}.csv`
  })
  notifyExportSuccess(count, a.exportToastSingular, a.exportToastPlural)
}

function exportBoardsCsv() {
  const b = admin.value.boardsTab
  const header: CsvCell[] = [
    b.csvHeaderId,
    b.colName,
    b.colCollaborators,
    b.colCreated,
    b.colUpdated
  ]
  const rows: CsvCell[][] = filteredBoards.value.map((board) => [
    board.id,
    board.name,
    String(board.collaborators.length),
    new Date(board.createdAt).toISOString(),
    new Date(board.updatedAt).toISOString()
  ])

  const count = triggerCsvDownload({
    header,
    rows,
    filename: `inkly-boards-${locale.value}-${Date.now()}.csv`
  })
  notifyExportSuccess(count, b.exportToastSingular, b.exportToastPlural)
}

async function handleDeleteBoard(board: Board) {
  if (deletingBoardId.value) return
  const confirmed = window.confirm(admin.value.boardsTab.deletePromptSingular({ name: board.name }))
  if (!confirmed) return

  deletingBoardId.value = board.id
  try {
    await deleteBoard(board.id)
    boards.value = boards.value.filter((candidate) => candidate.id !== board.id)
    toast.info(admin.value.boardsTab.deleteSuccess)
  } catch (error) {
    const message = error instanceof Error ? error.message : admin.value.boardsTab.deleteFail
    toast.error(message)
  } finally {
    deletingBoardId.value = null
  }
}

function openBoard(board: Board) {
  void router.push(createBoardEditorLocation(board))
}

async function startGoogleLogin() {
  try {
    await auth.signInWithGoogle(window.location.toString())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google login'
    toast.error(message)
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

onMounted(async () => {
  await auth.init()
  await notifications.mount()
  await loadAdminView()
})
</script>

<template>
  <main
    data-test-id="admin-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(239,98,98,0.12),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0d1017)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-[#ef6262]">{{ admin.badge }}</p>
          <span class="text-muted">|</span>
          <h1 class="text-2xl font-semibold text-surface">{{ admin.title }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <LocaleSwitcher test-id="admin-locale-switcher" />
          <RouterLink
            to="/dashboard"
            data-test-id="admin-dashboard-link"
            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-canvas/55 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover"
          >
            <icon-lucide-layout-dashboard class="size-4" />
            <span>{{ admin.navLinks.dashboard }}</span>
          </RouterLink>

          <RouterLink
            v-if="auth.isAuthenticated"
            to="/account"
            data-test-id="admin-account-link"
            class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-canvas/55 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover"
          >
            <img
              v-if="auth.user?.image"
              :src="auth.user.image"
              :alt="`${authDisplayName} avatar`"
              data-test-id="admin-account-avatar-image"
              class="size-8 rounded-full object-cover"
            />
            <span
              v-else
              data-test-id="admin-account-avatar-fallback"
              class="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(239,98,98,0.8),rgba(139,52,52,0.85))] text-[11px] font-semibold text-white"
            >
              {{ authInitials }}
            </span>
            <span>{{ admin.navLinks.account }}</span>
          </RouterLink>
        </div>
      </header>

      <LoginBanner v-if="showLoginBanner" @login="startGoogleLogin" />

      <section
        data-test-id="admin-tabs"
        class="flex w-fit gap-2 rounded-full border border-white/8 bg-panel/80 p-1.5 shadow-lg"
      >
        <button
          type="button"
          data-test-id="admin-tab-overview"
          :class="[
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            tab === 'overview' ? 'bg-[#ef6262]/85 text-white shadow' : 'text-muted hover:text-surface'
          ]"
          @click="tab = 'overview'"
        >
          {{ admin.tabs.overview }}
        </button>
        <button
          type="button"
          data-test-id="admin-tab-boards"
          :class="[
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            tab === 'boards' ? 'bg-[#ef6262]/85 text-white shadow' : 'text-muted hover:text-surface'
          ]"
          @click="tab = 'boards'"
        >
          {{ admin.tabs.boards }}
        </button>
        <button
          type="button"
          data-test-id="admin-tab-activity"
          :class="[
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            tab === 'activity' ? 'bg-[#ef6262]/85 text-white shadow' : 'text-muted hover:text-surface'
          ]"
          @click="tab = 'activity'"
        >
          {{ admin.tabs.activity }}
        </button>
      </section>

      <section
        v-if="tab === 'overview'"
        data-test-id="admin-overview"
        class="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div
          data-test-id="admin-stat-total"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{{ admin.overview.totalBoards }}</p>
          <p class="text-2xl font-semibold text-surface">{{ totalBoards }}</p>
        </div>
        <div
          data-test-id="admin-stat-personal"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{{ admin.overview.personal }}</p>
          <p class="text-2xl font-semibold text-surface">{{ totalBoards }}</p>
        </div>
        <div
          data-test-id="admin-stat-collaborators"
          class="flex flex-col gap-1 rounded-2xl border border-white/8 bg-panel/80 p-4 shadow-lg"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{{ admin.overview.collaborators }}</p>
          <p class="text-2xl font-semibold text-surface">{{ totalCollaborators }}</p>
        </div>
      </section>

      <section
        v-else-if="tab === 'boards'"
        data-test-id="admin-boards"
        class="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-surface">{{ admin.boardsTab.heading }}</h2>
            <p class="text-sm text-muted">{{ admin.boardsTab.shownCount({ shown: filteredBoards.length, total: totalBoards }) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-test-id="admin-boards-export"
              :disabled="filteredBoards.length === 0"
              class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-canvas/60 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              @click="exportBoardsCsv"
            >
              <icon-lucide-download class="size-4" />
              <span>{{ admin.boardsTab.exportCsv }}</span>
            </button>
            <label class="sr-only" for="admin-boards-search-input">{{ admin.boardsTab.searchAria }}</label>
            <input
              id="admin-boards-search-input"
              v-model="searchQuery"
              type="text"
              data-test-id="admin-boards-search"
              :placeholder="admin.boardsTab.searchPlaceholder"
              class="w-64 rounded-lg border border-border bg-input px-3 py-2 text-sm text-surface outline-none focus:border-accent"
            />
          </div>
        </div>

        <div
          v-if="loading"
          class="rounded-2xl border border-border bg-canvas/50 p-6 text-sm text-muted"
        >
          {{ admin.boardsTab.loading }}
        </div>

        <div
          v-else-if="filteredBoards.length === 0"
          class="rounded-2xl border border-dashed border-border bg-canvas/45 p-6 text-center text-sm text-muted"
        >
          {{ admin.boardsTab.empty }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-white/8 text-left text-sm">
            <thead>
              <tr class="text-[11px] uppercase tracking-[0.16em] text-muted">
                <th scope="col" class="px-3 py-2">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('name')">
                    <span>{{ admin.boardsTab.colName }}</span>
                    <icon-lucide-arrow-up-down class="size-3.5" />
                  </button>
                </th>
                <th scope="col" class="px-3 py-2">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('collaborators')">
                    <span>{{ admin.boardsTab.colCollaborators }}</span>
                    <icon-lucide-arrow-up-down class="size-3.5" />
                  </button>
                </th>
                <th scope="col" class="px-3 py-2">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('created')">
                    <span>{{ admin.boardsTab.colCreated }}</span>
                    <icon-lucide-arrow-up-down class="size-3.5" />
                  </button>
                </th>
                <th scope="col" class="px-3 py-2">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('updated')">
                    <span>{{ admin.boardsTab.colUpdated }}</span>
                    <icon-lucide-arrow-up-down class="size-3.5" />
                  </button>
                </th>
                <th scope="col" class="px-3 py-2 text-right">{{ admin.boardsTab.actions }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/6">
              <tr
                v-for="board in filteredBoards"
                :key="board.id"
                :data-test-id="`admin-board-row-${board.id}`"
                class="align-top text-surface"
              >
                <td class="px-3 py-3">
                  <button
                    type="button"
                    class="font-medium transition-colors hover:text-accent"
                    @click="openBoard(board)"
                  >
                    {{ board.name }}
                  </button>
                  <p class="mt-1 text-xs text-muted">{{ board.id }}</p>
                </td>
                <td class="px-3 py-3 text-muted">{{ board.collaborators.length }}</td>
                <td class="px-3 py-3 text-muted">{{ formatDate(board.createdAt) }}</td>
                <td class="px-3 py-3 text-muted">{{ formatDate(board.updatedAt) }}</td>
                <td class="px-3 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="rounded-md border border-white/10 bg-canvas/60 px-3 py-1.5 text-xs text-surface transition-colors hover:bg-hover"
                      @click="openBoard(board)"
                    >
                      {{ admin.boardsTab.open }}
                    </button>
                    <button
                      type="button"
                      :disabled="deletingBoardId === board.id"
                      class="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-100 transition-colors hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="handleDeleteBoard(board)"
                    >
                      {{ deletingBoardId === board.id ? admin.boardsTab.deleting : admin.boardsTab.delete }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-else
        data-test-id="admin-activity"
        class="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-surface">{{ admin.activityTab.heading }}</h2>
            <p class="text-sm text-muted">{{ admin.activityTab.shownCount({ shown: activityItems.length, total: activityBase.length }) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-test-id="admin-activity-export"
              :disabled="activityItems.length === 0"
              class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-canvas/60 px-3 py-2 text-sm text-surface transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              @click="exportActivityCsv"
            >
              <icon-lucide-download class="size-4" />
              <span>{{ admin.activityTab.exportCsv }}</span>
            </button>
            <input
              v-model="activitySearch"
              type="text"
              data-test-id="admin-activity-search"
              :placeholder="admin.activityTab.searchPlaceholder"
              class="w-64 rounded-lg border border-border bg-input px-3 py-2 text-sm text-surface outline-none focus:border-accent"
            />
            <select
              v-model="activityTypeFilter"
              data-test-id="admin-activity-type-filter"
              class="rounded-lg border border-border bg-input px-3 py-2 text-sm text-surface outline-none focus:border-accent"
            >
              <option value="all">{{ admin.activityTab.typeAll }}</option>
              <option value="invitation">{{ admin.activityTab.typeInvitation }}</option>
              <option value="mention">{{ admin.activityTab.typeMention }}</option>
            </select>
            <select
              v-model="activityRangeFilter"
              data-test-id="admin-activity-range-filter"
              class="rounded-lg border border-border bg-input px-3 py-2 text-sm text-surface outline-none focus:border-accent"
            >
              <option value="all">{{ admin.activityTab.rangeAll }}</option>
              <option value="24h">{{ admin.activityTab.range24h }}</option>
              <option value="7d">{{ admin.activityTab.range7d }}</option>
              <option value="30d">{{ admin.activityTab.range30d }}</option>
            </select>
          </div>
        </div>

        <div
          v-if="activityItems.length === 0"
          class="rounded-2xl border border-dashed border-border bg-canvas/45 p-6 text-center text-sm text-muted"
        >
          {{ admin.activityTab.empty }}
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="record in activityItems"
            :key="record.id"
          >
            <button
              type="button"
              class="w-full rounded-2xl border border-white/8 bg-canvas/45 p-4 text-left transition-colors hover:bg-hover"
              @click="openActivity(record.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium text-surface">
                  {{ getNotificationTitle(record, notificationsFormatT) }}
                </p>
                <span class="text-[11px] uppercase tracking-[0.16em] text-muted">{{ record.type }}</span>
              </div>
              <p class="mt-1 text-xs text-muted">
                {{ getNotificationBody(record, notificationsFormatT) }}
              </p>
              <p class="mt-2 text-[11px] text-muted/80">
                {{ formatNotificationTime(record) }}
              </p>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>
