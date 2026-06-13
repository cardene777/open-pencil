<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/app/auth/store'
import { toast } from '@/app/shell/ui'

const props = defineProps<{
  open: boolean
  returnTo?: string
  inviteToken?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const router = useRouter()
const auth = useAuthStore()

const loggingIn = computed(() => auth.loginPending)

const returnToValue = computed(() => props.returnTo ?? '')

const inviteTokenValue = computed(() => props.inviteToken ?? '')

function buildCallbackURL() {
  if (typeof window === 'undefined') return undefined
  const target = returnToValue.value || '/dashboard'
  const callback = new URL(target, window.location.origin)
  if (inviteTokenValue.value && returnToValue.value) {
    callback.searchParams.set('invite', inviteTokenValue.value)
  }
  return callback.toString()
}

async function chooseMember() {
  if (loggingIn.value) return
  try {
    await auth.signInWithGoogle(buildCallbackURL())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google ログインを開始できませんでした'
    toast.error(message)
  }
}

function chooseGuest() {
  if (loggingIn.value) return
  const query: Record<string, string> = {}
  if (returnToValue.value) query.returnTo = returnToValue.value
  if (inviteTokenValue.value) query.invite = inviteTokenValue.value
  void router.push({ path: '/login/guest', query })
  emit('close')
}

function close() {
  if (loggingIn.value) return
  emit('close')
}
</script>

<template>
  <div
    v-if="props.open"
    data-test-id="login-modal-overlay"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    @click="close"
  >
    <div
      data-test-id="login-modal"
      class="w-full max-w-md rounded-2xl border border-white/10 bg-panel/95 p-7 shadow-2xl"
      @click.stop
    >
      <h2 class="text-center text-lg font-semibold text-surface">ログイン方法を選択</h2>
      <p class="mt-2 text-center text-sm text-muted">
        メンバー (jfet.co.jp) は Google でログイン、 ゲストはメールアドレスでログインします。
      </p>

      <div class="mt-6 flex flex-col gap-3">
        <button
          type="button"
          data-test-id="login-modal-member"
          class="flex items-center justify-center gap-3 rounded-xl border border-border bg-canvas/60 px-4 py-3 text-sm font-medium text-surface transition-colors hover:bg-hover disabled:cursor-wait disabled:opacity-60"
          :disabled="loggingIn"
          @click="chooseMember"
        >
          <span class="text-base">👥</span>
          <span class="flex-1 text-left">
            <span class="block">メンバー (Google でログイン)</span>
            <span class="block text-[11px] text-muted">jfet.co.jp の Google アカウント</span>
          </span>
        </button>

        <button
          type="button"
          data-test-id="login-modal-guest"
          class="flex items-center justify-center gap-3 rounded-xl border border-border bg-canvas/60 px-4 py-3 text-sm font-medium text-surface transition-colors hover:bg-hover disabled:cursor-wait disabled:opacity-60"
          :disabled="loggingIn"
          @click="chooseGuest"
        >
          <span class="text-base">🌱</span>
          <span class="flex-1 text-left">
            <span class="block">ゲスト (メールアドレスでログイン)</span>
            <span class="block text-[11px] text-muted">招待された board を共同編集</span>
          </span>
        </button>
      </div>

      <button
        type="button"
        data-test-id="login-modal-close"
        class="mt-6 w-full rounded-lg border border-border bg-transparent px-4 py-2 text-xs text-muted transition-colors hover:bg-hover hover:text-surface disabled:cursor-wait disabled:opacity-60"
        :disabled="loggingIn"
        @click="close"
      >
        キャンセル
      </button>
    </div>
  </div>
</template>
