<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

useHead({ title: 'Invitation' })

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const token = typeof route.params.token === 'string' ? route.params.token : ''
  if (!token) {
    void router.replace('/invite/accept')
    return
  }

  void router.replace({
    path: '/invite/accept',
    query: {
      token
    }
  })
})
</script>

<template>
  <main
    data-test-id="invite-redirect-view"
    class="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(91,171,255,0.18),transparent_30%),linear-gradient(180deg,var(--color-canvas),#0b1018)] px-6"
  >
    <div class="w-full max-w-md rounded-[28px] border border-white/10 bg-panel/85 p-8 text-center shadow-2xl backdrop-blur-xl">
      <p class="text-sm uppercase tracking-[0.18em] text-accent">Invite</p>
      <h1 class="mt-3 text-2xl font-semibold text-surface">Opening invitation…</h1>
      <p class="mt-3 text-sm text-muted">You will be redirected to the invitation screen.</p>
    </div>
  </main>
</template>
