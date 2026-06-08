<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { TooltipProvider } from 'reka-ui'

import { provideEditor, useI18n } from '@inkly/vue'
import AppToast from '@/components/AppToast.vue'
import ClearCacheDialog from '@/components/ClearCacheDialog.vue'
import { fadeOutGlobalLoader } from '@/app/editor/canvas/loader-overlay'
import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import { useAppTheme } from '@/app/shell/theme'
import { scheduleStartupUpdateCheck } from '@/app/shell/updater'

useHead({ titleTemplate: (title) => (title ? `${title} — Inkly` : 'Inkly') })

const store = useEditorStore()
const { dialogs } = useI18n()
provideEditor(store)
useAppTheme()

const route = useRoute()
// /board/:id を切り替えた時に EditorView を再マウントして state isolation を保つ
// (Vue Router は同じ component を route 間で reuse するため、 明示的な :key 指定で再生成を促す)
const viewKey = computed(() => route.path)

onMounted(() => {
  fadeOutGlobalLoader()
  toast.setupGlobalErrorHandler()
  scheduleStartupUpdateCheck(dialogs)
})
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <RouterView :key="viewKey" />
    <AppToast />
    <ClearCacheDialog />
  </TooltipProvider>
</template>
