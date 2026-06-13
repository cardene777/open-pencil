<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { colorToCSS } from '@inkly/core/color'

import { initials } from '@/app/shell/ui'
import { stableRemotePeerId } from '@/app/collab/awareness'
import type { RemotePeer } from '@/app/collab/types'
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import { useI18n } from '@inkly/vue'

const collab = useCollabPanelContext()
const { dialogs } = useI18n()
const route = useRoute()

const boardId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : ''
)

// peer.userId → email map。 server SSOT (listInvitations.board.collaborators) から
// 1 度だけ fetch して、 popover で「user.id しか awareness に乗っていない peer」
// にも email を表示できるようにする (board 招待された collaborator のみ閲覧可能、
// awareness で email 平文を撒かない設計)。
// fetch は boardId 切替時のみ実行する。 peer 数変動 (join/leave/cursor) では
// 再 fetch しない (PR #231 review MAJOR ... peer count 変動毎に invitation
// 再 fetch する DoS 経路の防止)。
const userEmailById = ref<Map<string, string>>(new Map())
// 「現在 fetch している boardId」を識別する version 値。 board 切替中に in-flight
// な fetch が遅延 resolve しても、 version mismatch で stale 応答を破棄する
// (PR #231 review MAJOR ... cross-board email leak 防止)。
let activeFetchBoardId: string | null = null

async function refreshEmailMap(targetBoardId: string) {
  // 古い board の map を即時 clear (新 board の応答が来るまで stale を見せない)。
  userEmailById.value = new Map()
  activeFetchBoardId = targetBoardId
  if (!targetBoardId) return
  try {
    const { listInvitations } = await import('@/app/api/client')
    const response = await listInvitations(targetBoardId)
    // fetch 中に board 切替が起きていれば応答は破棄する。
    if (activeFetchBoardId !== targetBoardId) return
    if (boardId.value !== targetBoardId) return
    const map = new Map<string, string>()
    for (const collaborator of response.board.collaborators) {
      if (collaborator.userId && collaborator.email) {
        map.set(collaborator.userId, collaborator.email)
      }
    }
    userEmailById.value = map
  } catch {
    // 招待権限がない閲覧者は listInvitations が 403 を返すため silent fallback。
    if (activeFetchBoardId === targetBoardId) {
      userEmailById.value = new Map()
    }
  }
}

watch(
  boardId,
  (newId) => {
    void refreshEmailMap(newId)
  },
  { immediate: true }
)

// peer 並び順用の signature。 peer 数 / id / idle flag に変化があった時のみ再 sort
// する。 cursor / selection awareness の頻繁更新では再計算しない
// (PR #231 review MINOR ... awareness cadence sort 過剰の防止)。
const peersOrderSignature = computed(() =>
  collab.peers
    .map((p) => `${stableRemotePeerId(p)}:${p.isIdle ? '1' : '0'}`)
    .join('|')
)

const sortedPeers = ref<RemotePeer[]>([])
watch(
  peersOrderSignature,
  () => {
    sortedPeers.value = [...collab.peers].sort((a, b) => {
      const aIdle = a.isIdle ? 1 : 0
      const bIdle = b.isIdle ? 1 : 0
      return aIdle - bIdle
    })
  },
  { immediate: true }
)

function emailFor(peer: RemotePeer): string | null {
  if (!peer.userId) return null
  return userEmailById.value.get(peer.userId) ?? null
}
</script>

<template>
  <div class="flex -space-x-1.5">
    <PopoverRoot>
      <PopoverTrigger as-child>
        <div
          data-test-id="collab-local-avatar"
          class="flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-panel text-[10px] font-semibold text-white"
          :style="{ background: colorToCSS(collab.state.localColor) }"
        >
          {{ initials(collab.state.localName || dialogs.you) }}
        </div>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          :side-offset="8"
          side="bottom"
          align="end"
          class="z-50 w-56 rounded-xl border border-border bg-panel p-3 text-xs text-surface shadow-xl"
        >
          <p class="text-[11px] tracking-wider text-muted uppercase">{{ dialogs.you }}</p>
          <p class="mt-1 truncate text-sm font-medium">
            {{ collab.state.localName || dialogs.you }}
          </p>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <PopoverRoot v-for="peer in sortedPeers" :key="stableRemotePeerId(peer)">
      <PopoverTrigger as-child>
        <div
          data-test-id="collab-peer-avatar"
          class="flex size-6 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white transition-all"
          :class="[
            collab.followingPeer === peer.clientId
              ? 'border-white ring-2 ring-white/40'
              : 'border-panel',
            peer.isIdle ? 'opacity-40 grayscale' : ''
          ]"
          :style="{ background: colorToCSS(peer.color) }"
        >
          {{ initials(peer.name) }}
        </div>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          :side-offset="8"
          side="bottom"
          align="end"
          class="z-50 w-60 rounded-xl border border-border bg-panel p-3 text-xs text-surface shadow-xl"
        >
          <p class="truncate text-sm font-medium">{{ peer.name }}</p>
          <p v-if="emailFor(peer)" class="mt-0.5 truncate text-[11px] text-muted">
            {{ emailFor(peer) }}
          </p>
          <p class="mt-1 text-[11px] text-muted">
            {{ peer.isIdle ? dialogs.peerIdle : dialogs.peerActive }}
          </p>
          <button
            type="button"
            class="mt-3 w-full cursor-pointer rounded-md border border-border bg-canvas px-2 py-1.5 text-xs text-surface hover:bg-hover"
            @click="collab.toggleFollowPeer(peer.clientId)"
          >
            {{
              collab.followingPeer === peer.clientId
                ? dialogs.followingPeerStop({ name: peer.name })
                : dialogs.clickToFollowPeer({ name: peer.name })
            }}
          </button>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
