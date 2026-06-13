<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { onClickOutside, useClipboard, useDebounceFn } from '@vueuse/core'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'

import { useI18n } from '@inkly/vue'

import { isJfetMember, isValidEmail } from '@/app/auth/email'
import { normalizeShareEmail, partitionShareChips, parseShareEmailChips } from '@/app/boards/share'
import {
  inviteUser,
  listInvitations,
  searchInternalUsers,
  shareBoard,
  type BoardCollaborator,
  type InternalUserSummary,
  type InvitationRole
} from '@/app/api/client'
import { toast } from '@/app/shell/ui'
import { useDialogUI } from '@/components/ui/dialog'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  created: []
}>()

const { boardId, boardName = '', boardCollaborators } = defineProps<{
  boardId: string | null
  boardName?: string
  boardCollaborators?: BoardCollaborator[]
}>()

const { shareModal: shareModalT } = useI18n()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')
const chipText = ref('')
const suggestResults = ref<InternalUserSummary[]>([])
const suggestLoading = ref(false)
const suggestOpen = ref(false)
const suggestRoot = ref<HTMLElement | null>(null)
const suggestRequestVersion = ref(0)
const fallbackCollaborators = ref<BoardCollaborator[] | null>(null)
const role = ref<InvitationRole>('editor')
const loading = ref(false)
const invitationUrl = ref('')
const errorMessage = ref('')
const { copy, copied } = useClipboard({ copiedDuring: 1500 })
const cls = useDialogUI({
  content: 'w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl'
})

const resolvedBoardName = computed(() => boardName || shareModalT.value.boardNameFallback)
const dialogDescriptionText = computed(() =>
  shareModalT.value.dialogDescription({ boardName: resolvedBoardName.value })
)

const chips = computed(() => parseShareEmailChips(chipText.value))
const selectedEmails = computed(() => new Set(chips.value.map((chip) => chip.value)))
const buckets = computed(() => partitionShareChips({ chips: chips.value }))
const invalidCount = computed(() => buckets.value.invalid.length)
const externalCount = computed(() => buckets.value.external.length)

const effectiveBoardCollaborators = computed(
  () => boardCollaborators ?? fallbackCollaborators.value ?? []
)
const excludedCollaboratorUserIds = computed(
  () =>
    new Set(
      effectiveBoardCollaborators.value
        .map((collaborator) => collaborator.userId)
        .filter((userId): userId is string => typeof userId === 'string' && userId.length > 0)
    )
)
const filteredSuggestResults = computed(() =>
  suggestResults.value.filter(
    (user) =>
      !selectedEmails.value.has(user.email) &&
      !excludedCollaboratorUserIds.value.has(user.id)
  )
)
const showSuggestDropdown = computed(
  () =>
    suggestOpen.value &&
    Boolean(boardId) &&
    (suggestLoading.value || filteredSuggestResults.value.length > 0)
)
const canSubmit = computed(() => {
  if (!boardId || loading.value) return false
  if (chips.value.length === 0) return false
  if (invalidCount.value > 0) return false
  return buckets.value.internal.length > 0 || buckets.value.external.length > 0
})

function resetForm() {
  inputValue.value = ''
  chipText.value = ''
  suggestResults.value = []
  suggestLoading.value = false
  suggestOpen.value = false
  suggestRequestVersion.value += 1
  fallbackCollaborators.value = null
  role.value = 'editor'
  invitationUrl.value = ''
  errorMessage.value = ''
  loading.value = false
}

watch(open, (value) => {
  if (!value) resetForm()
})

watch([open, () => boardId, () => boardCollaborators], async ([isOpen, currentBoardId]) => {
  if (!isOpen || !currentBoardId || boardCollaborators) return

  try {
    const response = await listInvitations(currentBoardId)
    if (!open.value || boardId !== currentBoardId || boardCollaborators) return
    fallbackCollaborators.value = response.board.collaborators
  } catch {
    if (!open.value || boardId !== currentBoardId || boardCollaborators) return
    fallbackCollaborators.value = []
  }
})

const runSuggestSearch = useDebounceFn(async (query: string, version: number) => {
  try {
    const response = await searchInternalUsers(query)
    if (version !== suggestRequestVersion.value) return
    suggestResults.value = response.users
  } catch {
    if (version !== suggestRequestVersion.value) return
    suggestResults.value = []
  } finally {
    if (version === suggestRequestVersion.value) {
      suggestLoading.value = false
    }
  }
}, 200)

function triggerSuggestFetch(query: string) {
  if (!boardId) {
    suggestResults.value = []
    suggestLoading.value = false
    return
  }
  suggestRequestVersion.value += 1
  const version = suggestRequestVersion.value
  suggestLoading.value = true
  suggestOpen.value = true
  void runSuggestSearch(query, version)
}

watch(inputValue, (value) => {
  triggerSuggestFetch(value.trim())
})

watch([open, () => boardId], ([isOpen, currentBoardId]) => {
  if (!isOpen || !currentBoardId) return
  // Modal を開いた瞬間に sign-up 済み jfet user の上位 N 名を空 query で prefetch。
  // chip 入力 field を focus すれば即 dropdown が見える状態にする。
  triggerSuggestFetch('')
})

onClickOutside(suggestRoot, () => {
  suggestOpen.value = false
})

function setChipValues(values: string[]) {
  chipText.value = values.join('\n')
}

function appendChipFromValue(value: string) {
  const normalized = normalizeShareEmail(value)
  if (!normalized) return false

  const next = chips.value.map((chip) => chip.value)
  if (next.includes(normalized)) return false
  next.push(normalized)
  setChipValues(next)
  return true
}

function flushTypedToChip() {
  const raw = inputValue.value
  if (!raw.trim()) {
    inputValue.value = ''
    return false
  }

  const added = appendChipFromValue(raw)
  if (added) {
    inputValue.value = ''
    suggestResults.value = []
    suggestLoading.value = false
    suggestOpen.value = false
    suggestRequestVersion.value += 1
  }
  return added
}

function appendChipFromSuggestion(user: InternalUserSummary) {
  const added = appendChipFromValue(user.email)
  if (added) {
    inputValue.value = ''
    suggestResults.value = []
    suggestLoading.value = false
    suggestOpen.value = false
    suggestRequestVersion.value += 1
  }
  void nextTick(() => {
    inputRef.value?.focus()
  })
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    flushTypedToChip()
    return
  }

  if (event.key === ' ') {
    if (!inputValue.value.trim()) return
    event.preventDefault()
    flushTypedToChip()
    return
  }

  if (event.key === 'Backspace' && inputValue.value === '' && chips.value.length > 0) {
    event.preventDefault()
    setChipValues(chips.value.slice(0, -1).map((chip) => chip.value))
  }
}

function onInputBlur() {
  flushTypedToChip()
}

function removeChip(index: number) {
  setChipValues(chips.value.filter((_, chipIndex) => chipIndex !== index).map((chip) => chip.value))
}

function reportShareResponse(response: Awaited<ReturnType<typeof shareBoard>>) {
  if (response.added.length > 0) {
    toast.info(shareModalT.value.toastShareAdded({ count: response.added.length }))
  }
  if (response.pending.length > 0) {
    toast.info(shareModalT.value.toastSharePending({ count: response.pending.length }))
  }
  if (response.rejected.length > 0) {
    toast.warning(shareModalT.value.toastShareRejected({ count: response.rejected.length }))
  }
}

async function onSubmit() {
  flushTypedToChip()
  if (!boardId || !canSubmit.value) return

  loading.value = true
  errorMessage.value = ''
  invitationUrl.value = ''

  let hasSuccess = false
  let firstError = ''

  try {
    if (buckets.value.internal.length > 0) {
      try {
        const response = await shareBoard(boardId, {
          emails: buckets.value.internal,
          role: role.value
        })
        hasSuccess = true
        reportShareResponse(response)
      } catch (error) {
        const message = error instanceof Error ? error.message : shareModalT.value.toastShareFail
        firstError ||= message
        toast.error(message)
      }
    }

    if (buckets.value.external.length > 0) {
      try {
        const externalEmail = buckets.value.external[0] ?? ''
        const invitation = await inviteUser({ email: externalEmail, boardId, role: role.value })
        invitationUrl.value = new URL(invitation.url, window.location.origin).toString()
        hasSuccess = true
        toast.info(shareModalT.value.toastInvitationCreated)
      } catch (error) {
        const message = error instanceof Error ? error.message : shareModalT.value.toastCreateFail
        firstError ||= message
        toast.error(message)
      }
    }

    if (hasSuccess) {
      emit('created')
      setChipValues([])
      inputValue.value = ''
    }

    errorMessage.value = hasSuccess ? '' : firstError
  } finally {
    loading.value = false
  }
}

function copyInvitationUrl() {
  if (!invitationUrl.value) return
  void copy(invitationUrl.value)
  toast.info(shareModalT.value.toastLinkCopied)
}

const canShare = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
)

async function shareInvitationUrl() {
  if (!invitationUrl.value || !canShare.value) return
  try {
    await navigator.share({
      title: shareModalT.value.shareTitle({ boardName: resolvedBoardName.value }),
      text: shareModalT.value.shareTitle({ boardName: resolvedBoardName.value }),
      url: invitationUrl.value
    })
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      toast.error(error.message)
    }
  }
}

function chipKind(value: string): 'internal' | 'external' | 'invalid' {
  if (!isValidEmail(value)) return 'invalid'
  if (isJfetMember(value)) return 'internal'
  return 'external'
}

const chipStyles: Record<'internal' | 'external' | 'invalid', string> = {
  internal: 'border-accent/40 bg-accent/15 text-surface',
  external: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50',
  invalid: 'border-red-500/40 bg-red-500/15 text-red-100'
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay :class="cls.overlay" />
      <DialogContent data-test-id="share-modal" :class="cls.content">
        <DialogTitle :class="cls.title">{{ shareModalT.dialogTitle }}</DialogTitle>
        <DialogDescription :class="cls.description">
          {{ dialogDescriptionText }}
        </DialogDescription>

        <div class="mt-4 space-y-4">
          <div
            v-if="!boardId"
            class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"
          >
            {{ shareModalT.boardMissingNotice }}
          </div>

          <div ref="suggestRoot" class="space-y-1.5">
            <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {{ shareModalT.recipientsLabel }}
            </span>

            <div
              data-test-id="share-recipients-field"
              class="relative flex min-h-[3rem] flex-wrap items-center gap-2 rounded-xl border border-border bg-input px-2 py-2 transition-colors focus-within:border-accent"
              @click="inputRef?.focus()"
            >
              <div
                v-for="(chip, index) in chips"
                :key="chip.value"
                :data-test-id="`share-recipient-chip-${index}`"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                  chipStyles[chipKind(chip.value)]
                ]"
              >
                <span>{{ chip.value }}</span>
                <button
                  type="button"
                  class="cursor-pointer rounded-full text-[10px] opacity-70 transition-opacity hover:opacity-100"
                  :aria-label="`${shareModalT.internalChipRemove} ${chip.value}`"
                  :disabled="loading"
                  @click.stop="removeChip(index)"
                >
                  ×
                </button>
              </div>

              <input
                ref="inputRef"
                v-model="inputValue"
                data-test-id="share-recipients-input"
                type="text"
                autocomplete="off"
                class="min-w-[10rem] flex-1 bg-transparent text-sm text-surface outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
                :placeholder="chips.length === 0 ? shareModalT.recipientsPlaceholder : ''"
                :disabled="loading || !boardId"
                @keydown="onInputKeydown"
                @blur="onInputBlur"
                @focus="suggestOpen = true"
              />

              <div
                v-if="showSuggestDropdown"
                class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-panel shadow-2xl"
              >
                <div v-if="suggestLoading" class="px-3 py-2 text-xs text-muted">
                  {{ shareModalT.internalSuggestLoading }}
                </div>
                <div
                  v-else-if="filteredSuggestResults.length === 0"
                  class="px-3 py-2 text-xs text-muted"
                >
                  {{ shareModalT.internalSuggestEmpty }}
                </div>
                <button
                  v-for="user in filteredSuggestResults"
                  :key="user.id"
                  type="button"
                  :data-test-id="`share-recipient-suggest-${user.id}`"
                  class="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-hover"
                  @mousedown.prevent
                  @click="appendChipFromSuggestion(user)"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm text-surface">{{ user.name }}</p>
                    <p class="truncate text-xs text-muted">{{ user.email }}</p>
                  </div>
                </button>
              </div>
            </div>

            <p class="text-xs text-muted">{{ shareModalT.recipientsHint }}</p>
          </div>

          <div
            v-if="invalidCount > 0"
            data-test-id="share-recipients-invalid"
            class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
          >
            {{ shareModalT.recipientsInvalidNotice({ count: invalidCount }) }}
          </div>

          <div
            v-if="externalCount > 0"
            data-test-id="share-recipients-external"
            class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100"
          >
            {{ shareModalT.recipientsExternalNotice({ count: externalCount }) }}
          </div>

          <label class="block space-y-1.5">
            <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{
              shareModalT.roleLabel
            }}</span>
            <select
              v-model="role"
              data-test-id="share-role-select"
              class="w-full rounded border border-border bg-input px-2 py-1.5 text-xs text-surface outline-none focus:border-accent"
              :disabled="loading || !boardId"
              :aria-label="shareModalT.roleLabel"
            >
              <option value="editor">{{ shareModalT.roleEditor }}</option>
              <option value="viewer">{{ shareModalT.roleViewer }}</option>
            </select>
          </label>

          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="open = false"
            >
              {{ shareModalT.cancel }}
            </button>
            <button
              type="button"
              data-test-id="share-submit"
              class="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canSubmit"
              @click="onSubmit"
            >
              <span data-test-id="share-internal-submit">
                {{ loading ? shareModalT.shareSubmitPending : shareModalT.shareSubmit }}
              </span>
            </button>
          </div>

          <div
            v-if="errorMessage"
            class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
          >
            {{ errorMessage }}
          </div>

          <div
            v-if="invitationUrl"
            class="space-y-3 rounded-xl border border-border bg-canvas/80 p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{
                shareModalT.invitationUrlLabel
              }}</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  data-test-id="share-copy-link"
                  class="cursor-pointer rounded-md px-2 py-1 text-[11px] text-accent transition-colors hover:bg-hover"
                  @click="copyInvitationUrl"
                >
                  {{ copied ? shareModalT.copied : shareModalT.copy }}
                </button>
                <button
                  v-if="canShare"
                  type="button"
                  data-test-id="share-os-share"
                  class="cursor-pointer rounded-md px-2 py-1 text-[11px] text-accent transition-colors hover:bg-hover"
                  @click="shareInvitationUrl"
                >
                  {{ shareModalT.share }}
                </button>
              </div>
            </div>
            <p data-test-id="share-link-output" class="break-all text-xs text-surface">
              {{ invitationUrl }}
            </p>
            <p class="text-[10px] text-muted">{{ shareModalT.expiresIn7Days }}</p>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
