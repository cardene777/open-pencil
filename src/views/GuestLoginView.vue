<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { checkInvited } from '@/app/api/client'
import { EmailAlreadyExistsError } from '@/app/auth/client'
import { useAuthStore } from '@/app/auth/store'
import { toast } from '@/app/shell/ui'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type Mode = 'signIn' | 'signUp'

const mode = ref<Mode>('signIn')
const email = ref('')
const password = ref('')
const name = ref('')
const formError = ref<string | null>(null)

const returnTo = computed(() => {
  const value = route.query.returnTo
  return typeof value === 'string' && value.startsWith('/') ? value : '/dashboard'
})

const inviteToken = computed(() => {
  const value = route.query.invite
  return typeof value === 'string' && value.length > 0 ? value : ''
})

const submitting = computed(() => auth.loginPending)

const submitLabel = computed(() => {
  if (submitting.value) return mode.value === 'signIn' ? 'ログイン中…' : '登録中…'
  return mode.value === 'signIn' ? 'ログイン' : '登録'
})

function switchMode(next: Mode) {
  mode.value = next
  formError.value = null
}

async function submitForm() {
  formError.value = null

  if (!email.value.trim()) {
    formError.value = 'メールアドレスを入力してください'
    return
  }
  if (password.value.length < 8) {
    formError.value = 'パスワードは 8 文字以上で入力してください'
    return
  }
  if (mode.value === 'signUp' && !name.value.trim()) {
    formError.value = '表示名を入力してください'
    return
  }

  // sign-up は board 招待を受けた email でのみ許可。 invitations テーブルに
  // 有効な招待が無ければ作成を拒否する (招待されていない人の勝手な sign-up を防止)。
  if (mode.value === 'signUp') {
    const invited = await checkInvited(email.value).catch(() => false)
    if (!invited) {
      formError.value =
        '招待を受けていないメールアドレスです。 招待リンクから登録してください。'
      return
    }
  }

  try {
    if (mode.value === 'signIn') {
      await auth.signInWithEmail({
        email: email.value,
        password: password.value
      })
    } else {
      await auth.signUpWithEmail({
        email: email.value,
        password: password.value,
        name: name.value
      })
    }

    if (!auth.isAuthenticated) {
      formError.value = 'ログインに失敗しました。 入力内容を確認してください。'
      return
    }

    // returnTo + invite token を保ったまま遷移
    if (inviteToken.value && returnTo.value === '/dashboard') {
      void router.replace({ path: '/dashboard', query: { invite: inviteToken.value } })
    } else if (inviteToken.value) {
      void router.replace({ path: returnTo.value, query: { invite: inviteToken.value } })
    } else {
      void router.replace(returnTo.value)
    }
    toast.info(mode.value === 'signIn' ? 'ログインしました' : 'アカウントを作成しました')
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      formError.value = error.message
      mode.value = 'signIn'
      return
    }
    formError.value = error instanceof Error ? error.message : '認証に失敗しました'
  }
}

onMounted(async () => {
  if (!auth.initialized) {
    try {
      await auth.init()
    } catch {
      // 未認証扱いで継続
    }
  }
  if (auth.isAuthenticated) {
    void router.replace(returnTo.value)
  }
})
</script>

<template>
  <main
    data-test-id="guest-login-view"
    class="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(91,171,255,0.18),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0b1018)] px-6"
  >
    <div class="w-full max-w-md rounded-[28px] border border-white/10 bg-panel/85 p-8 shadow-2xl backdrop-blur-xl">
      <p class="text-center text-sm uppercase tracking-[0.18em] text-accent">Guest Login</p>
      <h1 class="mt-3 text-center text-2xl font-semibold text-surface">
        {{ mode === 'signIn' ? 'ゲストとしてログイン' : 'ゲストアカウントを作成' }}
      </h1>
      <p class="mt-2 text-center text-sm text-muted">
        メールアドレスとパスワードでログインします。 jfet.co.jp のメンバーは
        <router-link to="/" class="text-accent hover:underline">ホーム</router-link>
        から Google ログインをご利用ください。
      </p>

      <div class="mt-6 flex gap-2 rounded-xl border border-white/10 bg-canvas/30 p-1">
        <button
          type="button"
          data-test-id="guest-login-mode-signin"
          :class="[
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            mode === 'signIn' ? 'bg-accent text-white' : 'text-muted hover:text-surface'
          ]"
          @click="switchMode('signIn')"
        >
          ログイン
        </button>
        <button
          type="button"
          data-test-id="guest-login-mode-signup"
          :class="[
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            mode === 'signUp' ? 'bg-accent text-white' : 'text-muted hover:text-surface'
          ]"
          @click="switchMode('signUp')"
        >
          新規登録
        </button>
      </div>

      <form class="mt-5 flex flex-col gap-3" @submit.prevent="submitForm">
        <label v-if="mode === 'signUp'" class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">表示名</span>
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            required
            data-test-id="guest-login-name-input"
            placeholder="例: Project Co-editor"
            class="rounded-lg border border-border bg-canvas/60 px-3 py-2 text-surface placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">メールアドレス</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            data-test-id="guest-login-email-input"
            placeholder="例: guest@example.com"
            class="rounded-lg border border-border bg-canvas/60 px-3 py-2 text-surface placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">パスワード</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'signUp' ? 'new-password' : 'current-password'"
            required
            minlength="8"
            data-test-id="guest-login-password-input"
            placeholder="8 文字以上"
            class="rounded-lg border border-border bg-canvas/60 px-3 py-2 text-surface placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>

        <div
          v-if="formError"
          data-test-id="guest-login-error"
          class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100"
        >
          {{ formError }}
        </div>

        <button
          type="submit"
          data-test-id="guest-login-submit"
          class="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitLabel }}
        </button>
      </form>

      <router-link
        to="/"
        data-test-id="guest-login-back-link"
        class="mt-6 block text-center text-xs text-muted hover:text-surface"
      >
        ← ホームへ戻る
      </router-link>
    </div>
  </main>
</template>
