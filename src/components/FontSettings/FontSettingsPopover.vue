<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { onMounted } from 'vue'

import { isTauri } from '@/app/tauri/env'
import { useFontSettings } from '@/components/FontSettings/use'
import { useI18n } from '@inkly/vue'
import Tip from '@/components/ui/Tip.vue'
import { useButtonUI } from '@/components/ui/button'
import { usePopoverUI } from '@/components/ui/popover'

const { dialogs, fontSettings: fontSettingsT } = useI18n()
const cls = usePopoverUI({ content: 'isolate z-[51] w-80 p-3' })
const trigger = useButtonUI({
  tone: 'ghost',
  size: 'iconSm',
  ui: { base: 'shrink-0 border border-border bg-input' }
})
const secondaryButton = useButtonUI({
  tone: 'ghost',
  size: 'sm',
  ui: {
    base: 'w-full bg-input px-2 py-1.5 text-[10px] font-medium text-surface hover:bg-hover disabled:opacity-50'
  }
})
const primaryButton = useButtonUI({
  tone: 'accent',
  size: 'sm',
  ui: { base: 'w-full px-2 py-1.5 text-[10px] font-medium disabled:opacity-50' }
})
const showDownloadedFonts = isTauri()

const {
  accessState,
  accessStateLabel,
  busyAction,
  cacheCount,
  cacheSize,
  cacheUpdatedLabel,
  canRequestLocalFonts,
  status,
  googleFontsEnabled,
  clearCache,
  downloadFallbacks,
  refreshSummary,
  requestAccess,
  setGoogleFontsEnabled
} = useFontSettings()

onMounted(() => {
  void refreshSummary()
})
</script>

<template>
  <PopoverRoot @update:open="$event && refreshSummary()">
    <Tip :label="dialogs.fontSettings">
      <PopoverTrigger data-test-id="font-settings-trigger" :class="trigger.base">
        <icon-lucide-settings class="size-3.5" :aria-hidden="true" />
      </PopoverTrigger>
    </Tip>

    <PopoverPortal>
      <PopoverContent
        side="left"
        :side-offset="8"
        align="start"
        :collision-padding="16"
        :avoid-collisions="true"
        :class="cls.content"
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <div
              class="flex size-8 shrink-0 items-center justify-center rounded bg-input text-muted"
            >
              <icon-lucide-type class="size-4" :aria-hidden="true" />
            </div>
            <div>
              <h3 class="text-[11px] font-semibold text-surface">{{ dialogs.fontSettings }}</h3>
              <p class="mt-0.5 text-[10px] leading-relaxed text-muted">
                {{
                  showDownloadedFonts
                    ? fontSettingsT.descriptionTauri
                    : fontSettingsT.descriptionBrowser
                }}
              </p>
            </div>
          </div>

          <div class="grid gap-1.5 rounded border border-border bg-input/40 p-2 text-[10px]">
            <div class="flex justify-between gap-3 text-muted">
              <span>{{ fontSettingsT.localFontsLabel }}</span>
              <span class="text-surface">{{ accessStateLabel }}</span>
            </div>
            <div class="flex justify-between gap-3 text-muted">
              <span>{{ fontSettingsT.googleFontsLabel }}</span>
              <span class="text-surface">{{ googleFontsEnabled ? fontSettingsT.enabled : fontSettingsT.disabled }}</span>
            </div>
            <div v-if="showDownloadedFonts" class="flex justify-between gap-3 text-muted">
              <span>{{ fontSettingsT.cacheLabel }}</span>
              <span class="text-surface">{{ fontSettingsT.cacheValue({ count: cacheCount, size: cacheSize }) }}</span>
            </div>
            <div v-if="showDownloadedFonts" class="flex justify-between gap-3 text-muted">
              <span>{{ fontSettingsT.lastUpdatedLabel }}</span>
              <span class="text-surface">{{ cacheUpdatedLabel }}</span>
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2">
              <div>
                <p class="text-[10px] font-medium text-surface">{{ fontSettingsT.systemAccessHeading }}</p>
                <p class="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {{
                    accessState === 'granted'
                      ? fontSettingsT.systemAccessGranted
                      : fontSettingsT.systemAccessPrompt
                  }}
                </p>
              </div>
              <button
                type="button"
                data-test-id="font-settings-request-access"
                :class="secondaryButton.base"
                :disabled="busyAction !== null || !canRequestLocalFonts"
                @click="requestAccess"
              >
                {{ busyAction === 'access' ? fontSettingsT.requesting : fontSettingsT.allow }}
              </button>
            </div>

            <div class="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2">
              <div>
                <p class="text-[10px] font-medium text-surface">{{ fontSettingsT.googleFontsHeading }}</p>
                <p class="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {{ fontSettingsT.googleFontsDescription }}
                </p>
              </div>
              <button
                type="button"
                data-test-id="font-settings-toggle-google-fonts"
                :class="secondaryButton.base"
                :disabled="busyAction !== null"
                @click="setGoogleFontsEnabled(!googleFontsEnabled)"
              >
                {{ googleFontsEnabled ? fontSettingsT.disable : fontSettingsT.enable }}
              </button>
            </div>

            <div
              v-if="showDownloadedFonts"
              class="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2"
            >
              <div>
                <p class="text-[10px] font-medium text-surface">{{ fontSettingsT.fallbackHeading }}</p>
                <p class="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {{ fontSettingsT.fallbackDescription }}
                </p>
              </div>
              <button
                type="button"
                data-test-id="font-settings-download-fallbacks"
                :class="primaryButton.base"
                :disabled="busyAction !== null"
                @click="downloadFallbacks"
              >
                {{ busyAction === 'download' ? fontSettingsT.downloading : fontSettingsT.download }}
              </button>
            </div>
          </div>

          <div v-if="showDownloadedFonts" class="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-test-id="font-settings-refresh-cache"
              :class="secondaryButton.base"
              :disabled="busyAction !== null"
              @click="refreshSummary"
            >
              {{ fontSettingsT.refresh }}
            </button>
            <button
              type="button"
              data-test-id="font-settings-clear-cache"
              :class="secondaryButton.base"
              :disabled="busyAction !== null || cacheCount === 0"
              @click="clearCache"
            >
              {{ fontSettingsT.clearCache }}
            </button>
          </div>

          <p
            v-if="status"
            class="rounded bg-input px-2 py-1.5 text-[10px] leading-relaxed text-muted"
          >
            {{ status }}
          </p>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
