<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { useHead } from '@unhead/vue'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle
} from 'reka-ui'

import { useI18n } from '@inkly/vue'

import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import ShareModal from '@/components/ShareModal.vue'
import {
  createBoardEditorLocation,
  fetchBoardDocumentVersions,
  listInvitations,
  restoreBoardDocumentVersion,
  revokeInvitation,
  type BoardDocumentVersion,
  type BoardInvitationsResponse
} from '@/app/api/client'
import { toast } from '@/app/shell/ui'
import { useDialogUI } from '@/components/ui/dialog'

const { boardSettings: boardSettingsT } = useI18n()

const route = useRoute()
const router = useRouter()
const { copy, copied } = useClipboard({ copiedDuring: 1500 })

const boardId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const payload = ref<BoardInvitationsResponse | null>(null)
const loading = ref(false)
const shareOpen = ref(false)
const errorMessage = ref('')
const revokeOpen = ref(false)
const revokeTarget = ref<BoardInvitationsResponse['invitations'][number] | null>(null)
const cls = useDialogUI({
  // overlay は default の bg-black/50 だと revoke 確認モーダル背景に招待リンクの
  // token 文字列が透けて読めてしまうため、 不透明度を上げ blur で隠す。
  overlay: 'bg-black/80 backdrop-blur-sm',
  content: 'w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl'
})

useHead({
  title: computed(() =>
    payload.value
      ? boardSettingsT.value.headTitleWithName({ name: payload.value.board.name })
      : boardSettingsT.value.headTitleDefault
  )
})

async function loadBoardSettings() {
  if (!boardId.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    payload.value = await listInvitations(boardId.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : boardSettingsT.value.toastLoadFail
    errorMessage.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}

async function revoke(invitationId: string) {
  if (!payload.value) return
  try {
    await revokeInvitation(payload.value.board.id, invitationId)
    await loadBoardSettings()
    toast.info(boardSettingsT.value.toastInvitationRevoked)
  } catch (error) {
    const message = error instanceof Error ? error.message : boardSettingsT.value.toastRevokeFail
    toast.error(message)
  }
}

function requestRevoke(invitation: BoardInvitationsResponse['invitations'][number]) {
  revokeTarget.value = invitation
  revokeOpen.value = true
}

async function confirmRevoke() {
  const invitation = revokeTarget.value
  revokeOpen.value = false
  revokeTarget.value = null
  if (!invitation) return
  await revoke(invitation.id)
}

function invitationUrl(token: string | null) {
  return token ? `${window.location.origin}/invite/${token}` : boardSettingsT.value.linkUnavailable
}

function copyInvitationUrl(token: string | null) {
  if (!token) return
  void copy(invitationUrl(token))
  toast.info(boardSettingsT.value.toastLinkCopied)
}

function onInvitationCreated() {
  void loadBoardSettings()
}

const versions = ref<BoardDocumentVersion[]>([])
const versionsLoading = ref(false)
const versionsError = ref('')
const restoreOpen = ref(false)
const restoreTarget = ref<BoardDocumentVersion | null>(null)

async function loadVersions() {
  if (!boardId.value) return
  versionsLoading.value = true
  versionsError.value = ''
  try {
    versions.value = await fetchBoardDocumentVersions(boardId.value)
  } catch (error) {
    versionsError.value = error instanceof Error ? error.message : 'Failed to load versions'
  } finally {
    versionsLoading.value = false
  }
}

function requestRestore(version: BoardDocumentVersion) {
  restoreTarget.value = version
  restoreOpen.value = true
}

async function confirmRestore() {
  const version = restoreTarget.value
  restoreOpen.value = false
  restoreTarget.value = null
  if (!version || !boardId.value) return
  try {
    await restoreBoardDocumentVersion(boardId.value, version.id)
    await loadVersions()
    toast.info('Restored snapshot from history')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore version'
    toast.error(message)
  }
}

function formatVersionTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function formatVersionSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function openBoard() {
  if (!payload.value) return
  void router.push(createBoardEditorLocation(payload.value.board))
}

onMounted(() => {
  void loadBoardSettings()
  void loadVersions()
})
</script>

<template>
  <main
    data-test-id="board-settings-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,190,92,0.14),transparent_28%),linear-gradient(180deg,var(--color-canvas),#0c1119)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section
        class="rounded-[28px] border border-white/8 bg-panel/85 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <button
              type="button"
              class="cursor-pointer rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="router.push('/boards')"
            >
              {{ boardSettingsT.backToBoards }}
            </button>
            <h1 class="text-3xl font-semibold text-surface">
              {{ payload?.board.name ?? boardSettingsT.headingFallback }}
            </h1>
            <p class="text-sm text-muted">
              {{ boardSettingsT.subtitle }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <LocaleSwitcher test-id="board-settings-locale-switcher" />
            <button
              type="button"
              class="cursor-pointer rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-surface transition-colors hover:bg-hover"
              @click="openBoard"
            >
              {{ boardSettingsT.openBoard }}
            </button>
            <button
              type="button"
              data-test-id="board-settings-share-button"
              class="cursor-pointer rounded-xl bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
              @click="shareOpen = true"
            >
              {{ boardSettingsT.newInvite }}
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="loading"
        class="rounded-2xl border border-border bg-panel/70 p-6 text-sm text-muted"
      >
        {{ boardSettingsT.loading }}
      </section>

      <section
        v-else-if="errorMessage"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100"
      >
        {{ errorMessage }}
      </section>

      <template v-else-if="payload">
        <section class="rounded-[24px] border border-border bg-panel/75 p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-surface">
              {{ boardSettingsT.invitationLinksHeading }}
            </h2>
            <button
              type="button"
              class="cursor-pointer rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="loadBoardSettings"
            >
              {{ boardSettingsT.refresh }}
            </button>
          </div>

          <ul data-test-id="board-invitation-list" class="mt-4 space-y-3">
            <li
              v-for="invitation in payload.invitations"
              :key="invitation.id"
              class="rounded-2xl border border-border bg-canvas/70 p-4"
            >
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="text-sm font-medium text-surface">
                    {{
                      invitation.role === 'editor'
                        ? boardSettingsT.editorInvite
                        : boardSettingsT.viewerInvite
                    }}
                    <span
                      v-if="invitation.sentToEmail"
                      data-test-id="invitation-recipient-email"
                      class="ml-2 inline-flex items-center rounded-full border border-border bg-canvas/60 px-2 py-0.5 text-[10px] font-normal text-muted"
                    >
                      {{ invitation.sentToEmail }}
                    </span>
                  </p>
                  <p class="break-all text-xs text-muted">
                    {{ invitationUrl(invitation.token) }}
                  </p>
                  <p class="text-[11px] text-muted">
                    {{
                      invitation.revoked
                        ? boardSettingsT.statusRevoked
                        : boardSettingsT.statusActive
                    }}{{ boardSettingsT.statusSeparator }}{{ boardSettingsT.expiresPrefix }}
                    {{ new Date(invitation.expiresAt).toLocaleString() }}
                  </p>
                </div>

                <div class="flex shrink-0 flex-row items-center gap-2">
                  <button
                    type="button"
                    data-test-id="board-copy-invitation"
                    class="cursor-pointer whitespace-nowrap rounded-md border border-border bg-panel px-3 py-1.5 text-[11px] text-surface transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!invitation.token"
                    @click="copyInvitationUrl(invitation.token)"
                  >
                    {{ copied ? boardSettingsT.copied : boardSettingsT.copy }}
                  </button>
                  <button
                    type="button"
                    data-test-id="board-revoke-invitation"
                    class="cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="invitation.revoked"
                    @click="requestRevoke(invitation)"
                  >
                    {{ boardSettingsT.revoke }}
                  </button>
                </div>
              </div>
            </li>

            <li
              v-if="payload.invitations.length === 0"
              class="rounded-2xl border border-dashed border-border bg-canvas/50 p-5 text-sm text-muted"
            >
              {{ boardSettingsT.emptyInvitations }}
            </li>
          </ul>
        </section>

        <section class="rounded-[24px] border border-border bg-panel/75 p-5">
          <h2 class="text-lg font-semibold text-surface">
            {{ boardSettingsT.collaboratorsHeading }}
          </h2>
          <ul data-test-id="board-collaborator-list" class="mt-4 space-y-3">
            <li
              v-for="collaborator in payload.board.collaborators"
              :key="
                collaborator.invitationId ??
                collaborator.userId ??
                collaborator.anonymousId ??
                `c-${collaborator.addedAt}`
              "
              class="flex items-center justify-between rounded-2xl border border-border bg-canvas/70 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-surface">
                  {{
                    collaborator.displayName ??
                    collaborator.email ??
                    collaborator.userId ??
                    collaborator.anonymousId ??
                    '—'
                  }}
                </p>
                <p
                  v-if="collaborator.email && collaborator.email !== collaborator.displayName"
                  class="truncate text-[11px] text-muted"
                >
                  {{ collaborator.email }}
                </p>
                <p class="text-[11px] text-muted">
                  {{ boardSettingsT.addedPrefix }}
                  {{ new Date(collaborator.addedAt).toLocaleString() }}
                </p>
              </div>
              <span
                class="rounded-full border border-white/10 bg-panel px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                {{ collaborator.role }}
              </span>
            </li>
          </ul>
        </section>

        <section
          data-test-id="board-document-history"
          class="rounded-[28px] border border-white/8 bg-panel/85 p-6 shadow-2xl backdrop-blur-xl"
        >
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-surface">Document history</h2>
              <p class="mt-1 text-xs text-muted">
                hub が自動で snapshot を 50 世代保持します。 owner のみ復元できます。
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-surface transition-colors hover:bg-hover"
              @click="loadVersions"
            >
              Reload
            </button>
          </header>

          <p v-if="versionsLoading" class="text-xs text-muted">Loading versions…</p>
          <p v-else-if="versionsError" class="text-xs text-red-400">{{ versionsError }}</p>
          <p v-else-if="versions.length === 0" class="text-xs text-muted">
            まだ snapshot がありません。 hub が定期的に snapshot を作成します。
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="version in versions"
              :key="version.id"
              data-test-id="board-document-version-item"
              class="flex items-center justify-between rounded-2xl border border-border bg-canvas/70 px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium text-surface">
                  {{ formatVersionTime(version.createdAt) }}
                </p>
                <p class="text-[11px] text-muted">
                  {{ formatVersionSize(version.size) }} · id {{ version.id.slice(0, 8) }}
                  <span v-if="version.label"> · {{ version.label }}</span>
                </p>
              </div>
              <button
                type="button"
                data-test-id="board-document-version-restore"
                class="cursor-pointer rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-surface transition-colors hover:bg-hover"
                @click="requestRestore(version)"
              >
                Restore
              </button>
            </li>
          </ul>
        </section>
      </template>
    </div>

    <ShareModal
      v-model:open="shareOpen"
      :board-id="payload?.board.id ?? boardId"
      :board-name="payload?.board.name ?? boardSettingsT.shareModalBoardFallback"
      :board-collaborators="payload?.board.collaborators"
      @created="onInvitationCreated"
    />

    <AlertDialogRoot :open="revokeOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay :class="cls.overlay" @click="revokeOpen = false" />
        <AlertDialogContent
          data-test-id="board-revoke-dialog"
          :class="cls.content"
          @escape-key-down="revokeOpen = false"
        >
          <AlertDialogTitle :class="cls.title">{{
            boardSettingsT.revokeDialogTitle
          }}</AlertDialogTitle>
          <AlertDialogDescription :class="cls.description">
            {{ boardSettingsT.revokeDialogDescription }}
          </AlertDialogDescription>

          <div class="mt-4 rounded-xl border border-border bg-canvas/70 p-3 text-xs text-muted">
            {{
              revokeTarget?.token
                ? invitationUrl(revokeTarget.token)
                : boardSettingsT.linkUnavailable
            }}
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <AlertDialogCancel
              data-test-id="board-revoke-cancel"
              class="rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="revokeOpen = false"
            >
              {{ boardSettingsT.revokeDialogCancel }}
            </AlertDialogCancel>
            <AlertDialogAction
              data-test-id="board-revoke-confirm"
              class="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500/90"
              @click="confirmRevoke"
            >
              {{ boardSettingsT.revokeDialogConfirm }}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <AlertDialogRoot :open="restoreOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay :class="cls.overlay" @click="restoreOpen = false" />
        <AlertDialogContent
          data-test-id="board-restore-dialog"
          :class="cls.content"
          @escape-key-down="restoreOpen = false"
        >
          <AlertDialogTitle :class="cls.title">Restore from snapshot</AlertDialogTitle>
          <AlertDialogDescription :class="cls.description">
            この snapshot で board を上書きします。 これ以後の編集 (append-only update vector) は
            破棄されます。 owner のみ実行できます。
          </AlertDialogDescription>

          <div class="mt-4 rounded-xl border border-border bg-canvas/70 p-3 text-xs text-muted">
            <span v-if="restoreTarget">
              {{ formatVersionTime(restoreTarget.createdAt) }} ·
              {{ formatVersionSize(restoreTarget.size) }}
            </span>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <AlertDialogCancel
              class="rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="restoreOpen = false"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-test-id="board-restore-confirm"
              class="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500/90"
              @click="confirmRestore"
            >
              Restore
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </main>
</template>
