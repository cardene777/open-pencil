<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'

import { useI18n } from '@inkly/vue'

import AppInput from '@/components/ui/AppInput.vue'
import { isValidEmail } from '@/app/auth/email'
import { partitionShareEmails, parseShareEmailChips } from '@/app/boards/share'
import { inviteUser, shareBoard, type InvitationRole } from '@/app/api/client'
import { toast } from '@/app/shell/ui'
import { useDialogUI } from '@/components/ui/dialog'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  created: []
}>()

const { boardId, boardName = '' } = defineProps<{
  boardId: string | null
  boardName?: string
}>()

const { shareModal: shareModalT } = useI18n()

const internalEmailInput = ref('')
const externalEmail = ref('')
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

const internalChips = computed(() => parseShareEmailChips(internalEmailInput.value))
const invalidInternalEmails = computed(() =>
  internalChips.value.filter((chip) => !chip.valid).map((chip) => chip.value)
)
const normalizedExternalEmail = computed(() => externalEmail.value.trim().toLowerCase())
const externalEmailError = computed(() => {
  if (normalizedExternalEmail.value.length === 0) return ''
  if (!isValidEmail(normalizedExternalEmail.value)) return shareModalT.value.emailInvalid
  return ''
})
const shareTargets = computed(() =>
  partitionShareEmails({
    internalEmails: internalChips.value.map((chip) => chip.value),
    externalEmail: normalizedExternalEmail.value
  })
)
const hasShareInput = computed(
  () => internalChips.value.length > 0 || normalizedExternalEmail.value.length > 0
)
const canSubmit = computed(() => {
  if (!boardId || loading.value || !hasShareInput.value) return false
  if (invalidInternalEmails.value.length > 0) return false
  return externalEmailError.value.length === 0
})

watch(open, (value) => {
  if (value) return
  internalEmailInput.value = ''
  externalEmail.value = ''
  role.value = 'editor'
  invitationUrl.value = ''
  errorMessage.value = ''
  loading.value = false
})

async function onSubmit() {
  if (!boardId || !canSubmit.value) return
  loading.value = true
  errorMessage.value = ''
  invitationUrl.value = ''

  let hasSuccess = false
  let firstError = ''

  try {
    if (shareTargets.value.internal.length > 0) {
      try {
        const response = await shareBoard(boardId, {
          emails: shareTargets.value.internal,
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

    if (shareTargets.value.external.length > 0) {
      try {
        const invitation = await inviteUser({
          email: shareTargets.value.external[0] ?? '',
          boardId,
          role: role.value
        })
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
      internalEmailInput.value = ''
      externalEmail.value = ''
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
    // ユーザーキャンセル時の AbortError は無視、 他はトーストに出す
    if (error instanceof Error && error.name !== 'AbortError') {
      toast.error(error.message)
    }
  }
}

function removeInternalChip(index: number) {
  internalEmailInput.value = internalChips.value
    .filter((_, chipIndex) => chipIndex !== index)
    .map((chip) => chip.value)
    .join('\n')
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
          <div v-if="!boardId" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            {{ shareModalT.boardMissingNotice }}
          </div>

          <label class="block space-y-1.5">
            <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {{ shareModalT.internalEmailsLabel }}
            </span>
            <textarea
              v-model="internalEmailInput"
              data-test-id="share-internal-emails-input"
              rows="3"
              :placeholder="shareModalT.internalEmailsPlaceholder"
              :disabled="loading || !boardId"
              class="min-h-24 w-full rounded border border-border bg-input px-3 py-2 text-sm text-surface outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p class="text-xs text-muted">{{ shareModalT.internalEmailsHint }}</p>
          </label>

          <div
            v-if="internalChips.length > 0"
            class="flex flex-wrap gap-2"
          >
            <div
              v-for="(chip, index) in internalChips"
              :key="chip.value"
              :data-test-id="`share-internal-chip-${index}`"
              :class="[
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                chip.valid
                  ? 'border-white/10 bg-canvas/70 text-surface'
                  : 'border-red-500/30 bg-red-500/10 text-red-100'
              ]"
            >
              <span>{{ chip.value }}</span>
              <button
                type="button"
                class="cursor-pointer rounded-full text-[10px] text-muted transition-colors hover:text-surface"
                :aria-label="`${shareModalT.internalChipRemove} ${chip.value}`"
                :disabled="loading"
                @click="removeInternalChip(index)"
              >
                ×
              </button>
            </div>
          </div>

          <div
            v-if="invalidInternalEmails.length > 0"
            class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
          >
            {{ shareModalT.emailInvalid }}
          </div>

          <label data-test-id="share-external-email-input" class="block space-y-1.5">
            <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {{ shareModalT.externalEmailLabel }}
            </span>
            <AppInput
              v-model="externalEmail"
              test-id="share-email-input"
              type="email"
              :placeholder="shareModalT.emailPlaceholder"
              :disabled="loading || !boardId"
            />
          </label>

          <div
            v-if="externalEmail.length > 0 && externalEmailError"
            data-test-id="share-email-error"
            class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
          >
            {{ externalEmailError }}
          </div>

          <label class="block space-y-1.5">
            <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{ shareModalT.roleLabel }}</span>
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

          <div v-if="errorMessage" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
            {{ errorMessage }}
          </div>

          <div
            v-if="invitationUrl"
            class="space-y-3 rounded-xl border border-border bg-canvas/80 p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{ shareModalT.invitationUrlLabel }}</span>
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
