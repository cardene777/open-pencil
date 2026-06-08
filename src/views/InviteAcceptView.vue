<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import {
  acceptInvitation,
  verifyInvitation,
  type VerifyInvitationResponse
} from '@/app/api/client'
import { useAuthStore } from '@/app/auth/store'
import { isValidEmail } from '@/app/auth/email'
import { toast } from '@/app/shell/ui'

useHead({ title: 'Invitation' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
void auth.init()

const inviteToken = computed(() =>
  typeof route.query.token === 'string' ? route.query.token.trim() : ''
)
const invite = ref<VerifyInvitationResponse['invitation'] | null>(null)
const inviteError = ref('')
const verifying = ref(false)
const accepting = ref(false)
const autoAcceptAttempted = ref(false)

const signInEmail = ref('')
const signInPassword = ref('')
const signUpName = ref('')
const signUpEmail = ref('')
const signUpPassword = ref('')

function inviteErrorMessage(reason: string | undefined) {
  if (reason === 'expired') return '招待リンクの有効期限が切れています。'
  if (reason === 'revoked') return 'この招待リンクは取り消されています。'
  return '招待リンクが無効です。'
}

function currentCallbackURL() {
  if (typeof window === 'undefined') return '/invite/accept'
  return window.location.toString()
}

async function loadInvitation() {
  autoAcceptAttempted.value = false
  invite.value = null
  inviteError.value = ''

  if (!inviteToken.value) return

  verifying.value = true

  try {
    const result = await verifyInvitation(inviteToken.value)
    if (!result.valid || !result.invitation) {
      inviteError.value = inviteErrorMessage(result.reason)
      return
    }

    invite.value = result.invitation
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify invitation'
    inviteError.value = message
  } finally {
    verifying.value = false
  }
}

async function openAcceptedBoard() {
  if (!inviteToken.value || !invite.value || accepting.value) return false

  accepting.value = true

  try {
    const accepted = await acceptInvitation(inviteToken.value)
    await router.replace({
      path: `/board/${accepted.boardId}`,
      query: invite.value.boardName ? { name: invite.value.boardName } : {}
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept invitation'
    toast.error(message)
    return false
  } finally {
    accepting.value = false
  }
}

async function startGoogleLogin() {
  try {
    await auth.signInWithGoogle(currentCallbackURL())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google login'
    toast.error(message)
  }
}

async function handleEmailSignIn() {
  if (!isValidEmail(signInEmail.value)) {
    toast.error('メールアドレスを確認してください。')
    return
  }

  if (!signInPassword.value) {
    toast.error('パスワードを入力してください。')
    return
  }

  try {
    await auth.signInWithPassword({
      email: signInEmail.value.trim(),
      password: signInPassword.value,
      callbackURL: currentCallbackURL()
    })

    if (invite.value) {
      await openAcceptedBoard()
      return
    }

    await router.replace('/dashboard')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign in'
    toast.error(message)
  }
}

async function handleEmailSignUp() {
  if (!inviteToken.value || !invite.value) {
    toast.error('有効な招待リンクが必要です。')
    return
  }

  if (!signUpName.value.trim()) {
    toast.error('名前を入力してください。')
    return
  }

  if (!isValidEmail(signUpEmail.value)) {
    toast.error('メールアドレスを確認してください。')
    return
  }

  if (signUpPassword.value.length < 8) {
    toast.error('パスワードは 8 文字以上で入力してください。')
    return
  }

  try {
    await auth.signUpWithPassword({
      name: signUpName.value.trim(),
      email: signUpEmail.value.trim(),
      password: signUpPassword.value,
      inviteToken: inviteToken.value,
      callbackURL: currentCallbackURL()
    })
    await openAcceptedBoard()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account'
    toast.error(message)
  }
}

watch(inviteToken, () => {
  void loadInvitation()
}, { immediate: true })

watch(
  () => [auth.initialized, auth.isAuthenticated, inviteToken.value, invite.value?.id] as const,
  ([initialized, isAuthenticated, token, inviteId]) => {
    if (!initialized || !isAuthenticated || !token || !inviteId || autoAcceptAttempted.value) return
    autoAcceptAttempted.value = true
    void openAcceptedBoard()
  },
  { immediate: true }
)

const showInvitationState = computed(() => inviteToken.value.length > 0)
</script>

<template>
  <main
    data-test-id="invite-accept-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(91,171,255,0.18),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0b1018)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section class="rounded-[28px] border border-white/8 bg-panel/85 p-6 shadow-2xl backdrop-blur-xl">
        <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">Invitation</p>
        <h1 class="mt-2 text-3xl font-semibold text-surface">
          {{ showInvitationState ? '招待を受け入れる' : '招待された外部協業者のログイン' }}
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-muted">
          {{
            showInvitationState
              ? '内部メンバーは Google ログイン、外部協業者は招待されたメールアドレスで email + password を使います。'
              : '既に招待を受けた外部協業者は email + password でログインできます。初回のアカウント作成は招待リンク経由でのみ可能です。'
          }}
        </p>
      </section>

      <section
        v-if="showInvitationState"
        class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl"
      >
        <template v-if="verifying">
          <p class="text-sm text-muted">招待リンクを確認しています…</p>
        </template>

        <template v-else-if="invite">
          <p class="text-sm text-muted">Board</p>
          <p class="mt-1 text-lg font-semibold text-surface">{{ invite.boardName }}</p>
          <p class="mt-2 text-sm text-muted">
            Role: <span class="text-surface">{{ invite.role }}</span>
          </p>
          <p class="mt-3 text-xs text-amber-100">
            初回アカウント作成時は、招待されたメールアドレスをそのまま入力してください。
          </p>
        </template>

        <template v-else>
          <p class="text-sm font-medium text-red-300">{{ inviteError }}</p>
          <p class="mt-2 text-sm text-muted">
            招待リンクが失効している場合は、招待元に再送を依頼してください。
          </p>
        </template>
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
            Google
          </p>
          <h2 class="mt-2 text-xl font-semibold text-surface">内部メンバーは Google ログイン</h2>
          <p class="mt-2 text-sm text-muted">
            `jfet.co.jp` メンバーは既存どおり Google ログインを使ってください。
          </p>
          <button
            type="button"
            data-test-id="invite-accept-google-login"
            class="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loginPending || accepting"
            @click="startGoogleLogin"
          >
            <icon-lucide-log-in class="size-4" />
            {{ auth.loginPending ? 'Starting…' : 'Continue with Google' }}
          </button>
        </section>

        <section class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
            Email Login
          </p>
          <h2 class="mt-2 text-xl font-semibold text-surface">外部協業者のログイン</h2>
          <p class="mt-2 text-sm text-muted">
            アカウント作成済みなら、同じ email と password で再ログインできます。
          </p>

          <div class="mt-5 space-y-3">
            <label class="block text-sm text-muted">
              Email
              <input
                v-model="signInEmail"
                data-test-id="invite-accept-signin-email"
                type="email"
                autocomplete="email"
                class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
              />
            </label>
            <label class="block text-sm text-muted">
              Password
              <input
                v-model="signInPassword"
                data-test-id="invite-accept-signin-password"
                type="password"
                autocomplete="current-password"
                class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
              />
            </label>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-test-id="invite-accept-signin-submit"
              class="inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="auth.loginPending || accepting"
              @click="handleEmailSignIn"
            >
              {{ auth.loginPending ? 'Signing in…' : 'Sign in' }}
            </button>
            <RouterLink
              to="/reset-password"
              class="text-sm text-accent transition-colors hover:text-accent/80"
            >
              パスワードを再設定
            </RouterLink>
          </div>
        </section>
      </div>

      <section
        v-if="invite"
        class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl"
      >
        <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">Sign Up</p>
        <h2 class="mt-2 text-xl font-semibold text-surface">招待メールから初回アカウント作成</h2>
        <p class="mt-2 text-sm text-muted">
          このフォームは招待リンク経由でのみ使えます。作成後はそのまま board に参加します。
        </p>

        <div class="mt-5 grid gap-3 md:grid-cols-3">
          <label class="block text-sm text-muted">
            Name
            <input
              v-model="signUpName"
              data-test-id="invite-accept-signup-name"
              type="text"
              autocomplete="name"
              class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
            />
          </label>
          <label class="block text-sm text-muted">
            Email
            <input
              v-model="signUpEmail"
              data-test-id="invite-accept-signup-email"
              type="email"
              autocomplete="email"
              class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
            />
          </label>
          <label class="block text-sm text-muted">
            Password
            <input
              v-model="signUpPassword"
              data-test-id="invite-accept-signup-password"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
            />
          </label>
        </div>

        <button
          type="button"
          data-test-id="invite-accept-signup-submit"
          class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="auth.loginPending || accepting"
          @click="handleEmailSignUp"
        >
          {{ auth.loginPending ? 'Creating…' : 'Create account and join board' }}
        </button>
      </section>
    </div>
  </main>
</template>
