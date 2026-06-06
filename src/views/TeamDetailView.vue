<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'

import { useI18n } from '@inkly/vue'

import { isValidEmail } from '@/app/auth/email'
import { createBoardEditorLocation } from '@/app/api/client'
import {
  addTeamMember,
  getTeam,
  removeTeamMember,
  type TeamDetailResponse
} from '@/app/api/teams'
import { toast } from '@/app/shell/ui'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useDialogUI } from '@/components/ui/dialog'

const { teamDetail: teamDetailT } = useI18n()

const route = useRoute()
const router = useRouter()
const payload = ref<TeamDetailResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<'editor' | 'viewer'>('editor')
const inviting = ref(false)
const removeDialogOpen = ref(false)
const removeTarget = ref<TeamDetailResponse['members'][number] | null>(null)
const cls = useDialogUI({
  content: 'w-[min(30rem,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl'
})

const teamId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const isOwner = computed(() => payload.value?.team.role === 'owner')
const normalizedInviteEmail = computed(() => inviteEmail.value.trim())
const inviteEmailError = computed(() => {
  if (normalizedInviteEmail.value.length === 0) return teamDetailT.value.emailRequired
  if (!isValidEmail(normalizedInviteEmail.value)) return teamDetailT.value.emailInvalid
  return ''
})
const canInvite = computed(
  () => isOwner.value && inviteEmailError.value.length === 0 && !inviting.value
)

const summaryText = computed(() =>
  teamDetailT.value.membersBoardsSummary({
    members: payload.value?.team.memberCount ?? 0,
    boards: payload.value?.team.boardCount ?? 0
  })
)

const removeDialogLoseAccessText = computed(() => {
  const email = removeTarget.value?.user.email
  if (!email) return teamDetailT.value.removeDialogLoseAccessFallback
  return teamDetailT.value.removeDialogLoseAccess({ email })
})

useHead({
  title: computed(() =>
    payload.value
      ? teamDetailT.value.headTitleWithName({ name: payload.value.team.name })
      : teamDetailT.value.headTitleDefault
  )
})

async function loadTeam() {
  if (!teamId.value) return
  loading.value = true
  errorMessage.value = ''

  try {
    payload.value = await getTeam(teamId.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : teamDetailT.value.toastLoadFail
    errorMessage.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}

async function inviteMember() {
  if (!teamId.value) return
  if (!canInvite.value) return
  inviting.value = true

  try {
    await addTeamMember(teamId.value, {
      email: normalizedInviteEmail.value,
      role: inviteRole.value
    })
    inviteOpen.value = false
    inviteEmail.value = ''
    inviteRole.value = 'editor'
    await loadTeam()
    toast.info(teamDetailT.value.toastMemberAdded)
  } catch (error) {
    const message = error instanceof Error ? error.message : teamDetailT.value.toastAddFail
    toast.error(message)
  } finally {
    inviting.value = false
  }
}

function requestRemoveMember(member: TeamDetailResponse['members'][number]) {
  removeTarget.value = member
  removeDialogOpen.value = true
}

async function confirmRemoveMember() {
  const member = removeTarget.value
  removeDialogOpen.value = false
  removeTarget.value = null
  if (!teamId.value || !member) return

  try {
    await removeTeamMember(teamId.value, member.userId)
    await loadTeam()
    toast.info(teamDetailT.value.toastMemberRemoved)
  } catch (error) {
    const message = error instanceof Error ? error.message : teamDetailT.value.toastRemoveFail
    toast.error(message)
  }
}

function openBoard(board: NonNullable<TeamDetailResponse['boards']>[number]) {
  void router.push(createBoardEditorLocation(board))
}

onMounted(() => {
  void loadTeam()
})
</script>

<template>
  <main
    data-test-id="team-detail-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,174,92,0.14),transparent_28%),linear-gradient(180deg,var(--color-canvas),#0c1119)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section class="rounded-[28px] border border-white/8 bg-panel/85 p-6 shadow-2xl backdrop-blur-xl">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <button
              type="button"
              class="cursor-pointer rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="router.push('/teams')"
            >
              {{ teamDetailT.backToTeams }}
            </button>
            <h1 class="text-3xl font-semibold text-surface">
              {{ payload?.team.name ?? teamDetailT.headingFallback }}
            </h1>
            <p class="text-sm text-muted">
              {{ summaryText }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <LocaleSwitcher test-id="team-detail-locale-switcher" />
            <button
              type="button"
              data-test-id="team-detail-invite-button"
              class="cursor-pointer rounded-xl bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!isOwner"
              @click="inviteOpen = true"
            >
              {{ teamDetailT.inviteButton }}
            </button>
            <button
              type="button"
              data-test-id="team-detail-settings-link"
              class="cursor-pointer rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-surface transition-colors hover:bg-hover"
              @click="router.push(`/team/${teamId}/settings`)"
            >
              {{ teamDetailT.settingsButton }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="loading" class="rounded-2xl border border-border bg-panel/70 p-6 text-sm text-muted">
        {{ teamDetailT.loading }}
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
            <h2 class="text-lg font-semibold text-surface">{{ teamDetailT.membersHeading }}</h2>
            <span
              class="rounded-full border border-white/10 bg-canvas/60 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted"
            >
              {{ payload.team.role }}
            </span>
          </div>

          <ul data-test-id="team-detail-member-list" class="mt-4 space-y-3">
            <li
              v-for="member in payload.members"
              :key="member.userId"
              class="flex items-center justify-between rounded-2xl border border-border bg-canvas/70 px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium text-surface">{{ member.user.name }}</p>
                <p class="text-[11px] text-muted">{{ member.user.email }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full border border-white/10 bg-panel px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted"
                >
                  {{ member.role }}
                </span>
                <button
                  v-if="isOwner && member.role !== 'owner'"
                  type="button"
                  data-test-id="team-detail-remove-member"
                  class="cursor-pointer rounded-md px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                  @click="requestRemoveMember(member)"
                >
                  {{ teamDetailT.removeMemberAction }}
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section class="rounded-[24px] border border-border bg-panel/75 p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-surface">{{ teamDetailT.boardsHeading }}</h2>
            <button
              type="button"
              class="cursor-pointer rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="loadTeam"
            >
              {{ teamDetailT.refresh }}
            </button>
          </div>

          <ul class="mt-4 space-y-3">
            <li
              v-for="board in payload.boards"
              :key="board.id"
              class="flex items-center justify-between rounded-2xl border border-border bg-canvas/70 px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium text-surface">{{ board.name }}</p>
                <p class="text-[11px] text-muted">
                  {{ teamDetailT.boardUpdatedPrefix }} {{ new Date(board.updatedAt).toLocaleString() }}
                </p>
              </div>
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-panel px-3 py-1.5 text-xs text-surface transition-colors hover:bg-hover"
                @click="openBoard(board)"
              >
                {{ teamDetailT.openBoard }}
              </button>
            </li>
            <li
              v-if="payload.boards.length === 0"
              class="rounded-2xl border border-dashed border-border bg-canvas/50 p-5 text-sm text-muted"
            >
              {{ teamDetailT.emptyBoards }}
            </li>
          </ul>
        </section>
      </template>
    </div>

    <DialogRoot v-model:open="inviteOpen">
      <DialogPortal>
        <DialogOverlay :class="cls.overlay" />
        <DialogContent data-test-id="team-invite-dialog" :class="cls.content">
          <DialogTitle :class="cls.title">{{ teamDetailT.inviteDialogTitle }}</DialogTitle>
          <DialogDescription :class="cls.description">
            {{ teamDetailT.inviteDialogDescription }}
          </DialogDescription>

          <div class="mt-4 space-y-4">
            <label class="block space-y-1.5">
              <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{ teamDetailT.emailLabel }}</span>
              <AppInput
                v-model="inviteEmail"
                test-id="team-invite-email-input"
                type="email"
                :placeholder="teamDetailT.emailPlaceholder"
              />
            </label>

            <div
              v-if="inviteEmail.length > 0 && inviteEmailError"
              data-test-id="team-invite-email-error"
              class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
            >
              {{ inviteEmailError }}
            </div>

            <label class="block space-y-1.5">
              <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{{ teamDetailT.roleLabel }}</span>
              <select
                v-model="inviteRole"
                data-test-id="team-invite-role-select"
                class="w-full rounded border border-border bg-input px-2 py-1.5 text-xs text-surface outline-none focus:border-accent"
              >
                <option value="editor">{{ teamDetailT.roleEditor }}</option>
                <option value="viewer">{{ teamDetailT.roleViewer }}</option>
              </select>
            </label>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
                @click="inviteOpen = false"
              >
                {{ teamDetailT.inviteDialogCancel }}
              </button>
              <button
                type="button"
                data-test-id="team-invite-submit"
                class="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canInvite"
                @click="inviteMember"
              >
                {{ inviting ? teamDetailT.inviteDialogSubmitPending : teamDetailT.inviteDialogSubmit }}
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <AlertDialogRoot :open="removeDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay :class="cls.overlay" @click="removeDialogOpen = false" />
        <AlertDialogContent
          data-test-id="team-detail-remove-dialog"
          :class="cls.content"
          @escape-key-down="removeDialogOpen = false"
        >
          <AlertDialogTitle :class="cls.title">{{ teamDetailT.removeDialogTitle }}</AlertDialogTitle>
          <AlertDialogDescription :class="cls.description">
            {{ teamDetailT.removeDialogDescription }}
          </AlertDialogDescription>

          <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-100">
            {{ removeDialogLoseAccessText }}
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <AlertDialogCancel
              data-test-id="team-detail-remove-cancel"
              class="rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="removeDialogOpen = false"
            >
              {{ teamDetailT.removeDialogCancel }}
            </AlertDialogCancel>
            <AlertDialogAction
              data-test-id="team-detail-remove-confirm"
              class="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500/90"
              @click="confirmRemoveMember"
            >
              {{ teamDetailT.removeDialogConfirm }}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </main>
</template>
