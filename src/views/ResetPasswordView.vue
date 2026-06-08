<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useAuthStore } from '@/app/auth/store'
import { isValidEmail } from '@/app/auth/email'
import { toast } from '@/app/shell/ui'

useHead({ title: 'Reset Password' })

const route = useRoute()
const auth = useAuthStore()
void auth.init()

const resetToken = computed(() =>
  typeof route.query.token === 'string' ? route.query.token.trim() : ''
)
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pending = ref(false)
const emailSent = ref(false)
const passwordReset = ref(false)

function redirectTo() {
  if (typeof window === 'undefined') return '/reset-password'
  return new URL('/reset-password', window.location.origin).toString()
}

async function requestResetEmail() {
  if (!isValidEmail(email.value)) {
    toast.error('メールアドレスを確認してください。')
    return
  }

  pending.value = true

  try {
    await auth.sendPasswordReset({
      email: email.value.trim(),
      redirectTo: redirectTo()
    })
    emailSent.value = true
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send password reset email'
    toast.error(message)
  } finally {
    pending.value = false
  }
}

async function submitReset() {
  if (!resetToken.value) {
    toast.error('リセットトークンが見つかりません。')
    return
  }

  if (newPassword.value.length < 8) {
    toast.error('パスワードは 8 文字以上で入力してください。')
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    toast.error('確認用パスワードが一致しません。')
    return
  }

  pending.value = true

  try {
    await auth.submitPasswordReset({
      token: resetToken.value,
      newPassword: newPassword.value
    })
    passwordReset.value = true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password'
    toast.error(message)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main
    data-test-id="reset-password-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(91,171,255,0.18),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0b1018)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section class="rounded-[28px] border border-white/8 bg-panel/85 p-6 shadow-2xl backdrop-blur-xl">
        <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
          Password
        </p>
        <h1 class="mt-2 text-3xl font-semibold text-surface">
          {{ resetToken ? '新しいパスワードを設定' : 'パスワードを再設定' }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{
            resetToken
              ? '新しい password を設定すると、以後はその credential でログインできます。'
              : '招待された外部協業者は、登録済みのメールアドレスに再設定リンクを送信できます。'
          }}
        </p>
      </section>

      <section class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl">
        <template v-if="!resetToken">
          <label class="block text-sm text-muted">
            Email
            <input
              v-model="email"
              data-test-id="reset-password-email"
              type="email"
              autocomplete="email"
              class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
            />
          </label>

          <button
            type="button"
            data-test-id="reset-password-request-submit"
            class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="pending"
            @click="requestResetEmail"
          >
            {{ pending ? 'Sending…' : 'Send reset link' }}
          </button>

          <p v-if="emailSent" class="mt-3 text-sm text-emerald-200">
            リセット用メールを送信しました。受信したリンクからパスワードを再設定してください。
          </p>
        </template>

        <template v-else>
          <div class="space-y-3">
            <label class="block text-sm text-muted">
              New password
              <input
                v-model="newPassword"
                data-test-id="reset-password-new-password"
                type="password"
                autocomplete="new-password"
                class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
              />
            </label>
            <label class="block text-sm text-muted">
              Confirm password
              <input
                v-model="confirmPassword"
                data-test-id="reset-password-confirm-password"
                type="password"
                autocomplete="new-password"
                class="mt-1 w-full rounded-xl border border-white/10 bg-canvas/70 px-3 py-2 text-sm text-surface outline-none transition-colors focus:border-accent"
              />
            </label>
          </div>

          <button
            type="button"
            data-test-id="reset-password-submit"
            class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="pending"
            @click="submitReset"
          >
            {{ pending ? 'Saving…' : 'Save new password' }}
          </button>

          <p v-if="passwordReset" class="mt-3 text-sm text-emerald-200">
            パスワードを更新しました。以後は新しい password でログインしてください。
          </p>
        </template>

        <RouterLink to="/invite/accept" class="mt-5 inline-flex text-sm text-accent hover:text-accent/80">
          招待ログインへ戻る
        </RouterLink>
      </section>
    </div>
  </main>
</template>
