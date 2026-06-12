<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useI18n } from '@inkly/vue'

import { useAuthStore } from '@/app/auth/store'
import { guestAvatarColor } from '@/app/auth/email'
import {
  createBoardEditorLocation,
  listBoards,
  type Board,
  type BoardCollaborator
} from '@/app/api/client'
import { initials } from '@/app/shell/ui'
import { formatTemplate } from '@/app/shell/i18n-format'
import { readBoardPreview } from '@/app/boards/preview'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import NotificationBell from '@/components/NotificationBell.vue'

const { guestDashboard: t, common: commonT } = useI18n()

useHead({ title: () => String(t.value.headTitle) })

function tpl(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const router = useRouter()
const auth = useAuthStore()

const boards = ref<Board[]>([])
const loading = ref(false)
const accountMenuOpen = ref(false)

const userId = computed(() => auth.user?.id ?? null)
const userEmail = computed(() => auth.userEmail)
const userName = computed(() => auth.user?.name ?? userEmail.value ?? '')
const userInitial = computed(() => initials(userName.value))
const userAvatarColor = computed(() => guestAvatarColor(userEmail.value))

// guest にとっての「招待された board」 = creator が自分ではなく、 自分が
// collaborator として userId で紐付いている board のみを抽出する。
const invitedBoards = computed(() =>
  boards.value
    .filter((board) => {
      const id = userId.value
      if (!id) return false
      // 自分が creator の board は guest 文脈では「招待された」 ではないので除外
      if (board.creatorUserId === id) return false
      // 自分が collaborator として参加している board のみ
      return board.collaborators.some((c) => c.userId === id)
    })
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
)

const inviterByBoard = computed(() => {
  const result = new Map<string, BoardCollaborator | null>()
  const myId = userId.value
  for (const board of invitedBoards.value) {
    // 自分以外の owner role 持ち collaborator か、 self を除く最初の collaborator
    const owner = board.collaborators.find(
      (c) => c.role === 'owner' && c.userId !== myId
    )
    result.set(board.id, owner ?? null)
  }
  return result
})

const inviterCount = computed(() => {
  const ids = new Set<string>()
  for (const board of invitedBoards.value) {
    const inviter = inviterByBoard.value.get(board.id)
    const id = inviter?.userId ?? inviter?.anonymousId
    if (id) ids.add(id)
  }
  return ids.size
})

const welcomeSubtitle = computed(() =>
  formatTemplate(tpl(t.value.welcomeSubtitle), {
    boards: invitedBoards.value.length,
    inviters: inviterCount.value
  })
)

const welcomeTitle = computed(() =>
  formatTemplate(tpl(t.value.welcomeTitle), { name: userName.value })
)

const previews = ref<Record<string, string>>({})

function syncPreviews(list: Board[]) {
  previews.value = Object.fromEntries(
    list
      .map((board) => [board.id, readBoardPreview(board.id)])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

async function loadBoards() {
  loading.value = true
  try {
    const list = await listBoards().catch((error) => {
      console.warn('[guest-dashboard]', 'listBoards failed', error)
      return [] as Board[]
    })
    boards.value = list
    syncPreviews(list)
  } finally {
    loading.value = false
  }
}

function openBoard(board: Board) {
  router.push(createBoardEditorLocation(board))
}

function roleBadgeClass(role: string) {
  switch (role) {
    case 'editor':
      return 'bg-[#3A2D52] text-[#C8BDF5]'
    case 'viewer':
      return 'bg-[#1E3A40] text-[#7AC0CE]'
    default:
      return 'bg-[#3A2F1E] text-[#E6BC7C]'
  }
}

function myCollaboratorRole(board: Board) {
  const id = userId.value
  if (!id) return 'viewer'
  const my = board.collaborators.find((c) => c.userId === id)
  return my?.role ?? 'viewer'
}

function roleLabel(role: string) {
  const map = t.value.roleLabel as unknown as Record<string, string>
  return map[role] ?? role
}

async function handleSignOut() {
  await auth.signOut()
  accountMenuOpen.value = false
  router.replace('/')
}

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value
}

function closeAccountMenu() {
  accountMenuOpen.value = false
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.init()
  }
  await loadBoards()
})

function formatLastEdited(board: Board) {
  const diffMs = Date.now() - board.updatedAt
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return tpl(t.value.relativeJustNow)
  if (minutes < 60) return formatTemplate(tpl(t.value.relativeMinutes), { value: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return formatTemplate(tpl(t.value.relativeHours), { value: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return formatTemplate(tpl(t.value.relativeDays), { value: days })
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(board.updatedAt)
}

function previewFor(board: Board) {
  return previews.value[board.id] ?? null
}

function inviterInitial(collaborator: BoardCollaborator | null) {
  if (!collaborator) return '?'
  const ref = collaborator.userId ?? collaborator.anonymousId ?? ''
  return ref.slice(0, 1).toUpperCase() || '?'
}

function inviterDisplayName(collaborator: BoardCollaborator | null) {
  if (!collaborator) return tpl(t.value.inviterUnknown)
  return collaborator.userId ?? collaborator.anonymousId ?? tpl(t.value.inviterUnknown)
}

function formatFromInviter(name: string) {
  return formatTemplate(tpl(t.value.fromInviter), { name })
}
</script>

<template>
  <main
    data-test-id="guest-dashboard-view"
    class="relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,160,90,0.08),transparent_35%),var(--color-canvas)] text-surface"
  >
    <header class="border-b border-border bg-panel/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-[1440px] items-center px-8">
        <div class="flex items-center gap-2.5">
          <span class="h-[22px] w-[22px] rounded-md bg-accent" aria-hidden="true" />
          <span class="text-lg font-semibold tracking-tight">Inkly</span>
        </div>

        <div class="flex flex-1" aria-hidden="true" />

        <div class="flex items-center gap-3">
          <NotificationBell />
          <LocaleSwitcher />
          <div class="relative">
            <button
              type="button"
              data-test-id="guest-account-chip"
              class="flex h-9 items-center gap-2 rounded-full border border-border bg-canvas/60 pl-1.5 pr-3.5 transition-colors hover:border-white/20"
              :aria-label="tpl(t.accountAriaLabel)"
              :aria-expanded="accountMenuOpen"
              @click="toggleAccountMenu"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                :style="{ backgroundColor: userAvatarColor }"
                aria-hidden="true"
              >
                {{ userInitial }}
              </span>
              <span class="flex flex-col items-start leading-tight">
                <span class="text-[12px] font-semibold text-surface">{{ userName }}</span>
                <span class="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{{ t.guestBadge }}</span>
              </span>
            </button>
            <div
              v-if="accountMenuOpen"
              data-test-id="guest-account-menu"
              class="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-border bg-panel/95 p-2 shadow-xl"
            >
              <p class="px-3 py-2 text-[11px] text-muted">{{ userEmail }}</p>
              <button
                type="button"
                data-test-id="guest-signout-button"
                class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-surface transition-colors hover:bg-canvas/70"
                @click="handleSignOut"
              >
                {{ t.signOut }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section class="mx-auto max-w-[1280px] px-8 pt-14 text-center">
      <h1 class="text-[30px] font-semibold tracking-tight">
        {{ welcomeTitle }}
      </h1>
      <p class="mt-3 text-sm text-muted">{{ welcomeSubtitle }}</p>
    </section>

    <section class="mx-auto mt-12 max-w-[1280px] px-8 pb-20" @click="closeAccountMenu">
      <div class="flex flex-col items-center gap-2">
        <h2 class="text-base font-semibold text-surface tracking-tight">{{ t.boardsHeading }}</h2>
        <p class="text-[11px] uppercase tracking-[0.32em] text-muted">{{ t.boardsSubheading }}</p>
      </div>

      <div
        v-if="loading && invitedBoards.length === 0"
        data-test-id="guest-dashboard-loading"
        class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="h-[320px] animate-pulse rounded-2xl border border-border bg-panel/60"
        />
      </div>

      <div
        v-else-if="invitedBoards.length === 0"
        data-test-id="guest-dashboard-empty"
        class="mt-12 mx-auto max-w-md rounded-3xl border border-border bg-panel/80 p-10 text-center"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-canvas/80">
          <span class="text-2xl text-muted" aria-hidden="true">🔑</span>
        </div>
        <h3 class="mt-6 text-lg font-semibold text-surface">{{ t.emptyTitle }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted">{{ t.emptyDescription }}</p>
        <button
          type="button"
          data-test-id="guest-dashboard-empty-signout"
          class="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-surface transition-colors hover:bg-canvas/60"
          @click="handleSignOut"
        >
          {{ t.signOut }}
        </button>
      </div>

      <div
        v-else
        data-test-id="guest-dashboard-grid"
        class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="board in invitedBoards"
          :key="board.id"
          type="button"
          :data-test-id="`guest-board-card-${board.id}`"
          class="flex flex-col overflow-hidden rounded-2xl border border-border bg-panel/85 p-3 text-left transition-transform hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          @click="openBoard(board)"
        >
          <div class="relative h-48 overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(132,119,248,0.25),transparent_50%),linear-gradient(160deg,#262A35,#1B1D26)]">
            <img
              v-if="previewFor(board)"
              :src="previewFor(board) || ''"
              :alt="board.name"
              class="h-full w-full object-cover"
            />
            <span
              class="absolute right-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
              :class="roleBadgeClass(myCollaboratorRole(board))"
            >
              {{ roleLabel(myCollaboratorRole(board)) }}
            </span>
          </div>

          <div class="mt-4 flex flex-1 flex-col gap-3 px-2 pb-2">
            <h3 class="text-base font-semibold text-surface tracking-tight">
              {{ board.name || t.untitledBoard }}
            </h3>

            <div class="flex items-center gap-2">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                :style="{ backgroundColor: guestAvatarColor(inviterDisplayName(inviterByBoard.get(board.id) ?? null)) }"
                aria-hidden="true"
              >
                {{ inviterInitial(inviterByBoard.get(board.id) ?? null) }}
              </span>
              <span class="text-[12px] text-muted">
                {{ formatFromInviter(inviterDisplayName(inviterByBoard.get(board.id) ?? null)) }}
              </span>
            </div>

            <div class="mt-auto flex items-center justify-between">
              <span class="text-[11px] text-muted">{{ formatLastEdited(board) }}</span>
              <span class="text-[11px] font-medium text-accent">{{ tpl(commonT.openBoard) || 'Open →' }}</span>
            </div>
          </div>
        </button>
      </div>
    </section>
  </main>
</template>
