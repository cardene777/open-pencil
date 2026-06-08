import { computed, shallowRef, triggerRef } from 'vue'

import type { Page } from '@/app/api/client'

const boardIdRef = shallowRef<string | null>(null)
const pagesRef = shallowRef<Page[]>([])
const activePageIdRef = shallowRef<string | null>(null)

export const boardPages = computed(() => pagesRef.value)
export const activeBoardPageId = computed(() => activePageIdRef.value)
export const activeBoardPage = computed(
  () => pagesRef.value.find((page) => page.id === activePageIdRef.value) ?? null
)

export function setBoardPages(boardId: string, pages: Page[]) {
  boardIdRef.value = boardId
  pagesRef.value = [...pages]
  activePageIdRef.value = pages[0]?.id ?? null
}

export function clearBoardPages() {
  boardIdRef.value = null
  pagesRef.value = []
  activePageIdRef.value = null
}

export function setActiveBoardPageId(pageId: string | null) {
  activePageIdRef.value = pageId
}

export function addBoardPage(page: Page) {
  pagesRef.value = [...pagesRef.value, page].sort(
    (left, right) => left.position - right.position || left.createdAt - right.createdAt
  )
}

export function updateBoardPageEntry(page: Page) {
  pagesRef.value = pagesRef.value
    .map((entry) => (entry.id === page.id ? page : entry))
    .sort((left, right) => left.position - right.position || left.createdAt - right.createdAt)
}

export function removeBoardPage(pageId: string) {
  pagesRef.value = pagesRef.value.filter((page) => page.id !== pageId)
  if (activePageIdRef.value === pageId) {
    activePageIdRef.value = pagesRef.value[0]?.id ?? null
  }
}

export function replaceBoardPages(pages: Page[]) {
  pagesRef.value = [...pages]
  if (!pages.some((page) => page.id === activePageIdRef.value)) {
    activePageIdRef.value = pages[0]?.id ?? null
  }
  triggerRef(pagesRef)
}

export function getActiveBoardPageContext() {
  const pageId = activePageIdRef.value
  const boardId = boardIdRef.value
  if (!boardId || !pageId) return null
  return { boardId, pageId }
}
