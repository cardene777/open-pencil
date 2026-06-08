<script setup lang="ts">
import {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarItemIndicator,
  MenubarMenu,
  MenubarPortal,
  MenubarRoot,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger
} from 'reka-ui'

import IconChevronRight from '~icons/lucide/chevron-right'

import { vTestId } from '@inkly/vue'
import AppShortcutText from '@/components/ui/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu'
import { IS_TAURI } from '@/constants'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import {
  hasMenuSubItems,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '@/app/shell/menu/entry'

const { topMenus } = useAppMenu()
const menuCls = useMenuUI()
const mainMenuCls = useMenuUI({ content: 'min-w-52' })
const subMenuCls = useMenuUI({ content: 'min-w-44' })
</script>

<template>
  <div v-if="!IS_TAURI" class="flex shrink-0 items-center border-b border-border bg-canvas/95 px-2 py-1">
    <MenubarRoot class="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
      <MenubarMenu v-for="menu in topMenus" :key="menu.label">
        <MenubarTrigger
          v-test-id="`menubar-${menu.label.toLowerCase()}`"
          class="flex cursor-pointer items-center rounded px-2 py-1 text-xs text-muted transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
        >
          {{ menu.label }}
        </MenubarTrigger>

        <MenubarPortal>
          <MenubarContent :side-offset="4" align="start" :class="mainMenuCls.content">
            <template v-for="(item, i) in menu.items" :key="i">
              <MenubarSeparator v-if="isMenuSeparator(item)" :class="menuCls.separator" />
              <MenubarSub v-else-if="hasMenuSubItems(item)">
                <MenubarSubTrigger :class="menuCls.item">
                  <span class="flex-1">{{ menuLabel(item) }}</span>
                  <IconChevronRight class="size-3 text-muted" />
                </MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent :side-offset="4" :class="subMenuCls.content">
                    <template v-for="(sub, j) in menuSubItems(item)" :key="j">
                      <MenubarSeparator v-if="isMenuSeparator(sub)" :class="menuCls.separator" />
                      <MenubarCheckboxItem
                        v-else-if="isMenuCheckbox(sub)"
                        :model-value="menuChecked(sub)"
                        :class="menuCls.item"
                        @update:model-value="updateMenuChecked(sub, $event as boolean)"
                      >
                        <span class="flex-1">{{ menuLabel(sub) }}</span>
                        <MenubarItemIndicator class="text-surface">
                          <icon-lucide-check class="size-3.5" />
                        </MenubarItemIndicator>
                      </MenubarCheckboxItem>
                      <MenubarItem
                        v-else
                        :class="menuCls.item"
                        :disabled="menuDisabled(sub)"
                        @select="runMenuAction(sub)"
                      >
                        <span class="flex-1">{{ menuLabel(sub) }}</span>
                        <AppShortcutText v-if="menuShortcut(sub)">{{
                          menuShortcut(sub)
                        }}</AppShortcutText>
                      </MenubarItem>
                    </template>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>
              <MenubarCheckboxItem
                v-else-if="isMenuCheckbox(item)"
                :model-value="menuChecked(item)"
                :class="menuCls.item"
                @update:model-value="updateMenuChecked(item, $event as boolean)"
              >
                <span class="flex-1">{{ menuLabel(item) }}</span>
                <MenubarItemIndicator class="text-surface">
                  <icon-lucide-check class="size-3.5" />
                </MenubarItemIndicator>
              </MenubarCheckboxItem>
              <MenubarItem
                v-else
                :class="menuCls.item"
                :disabled="menuDisabled(item)"
                @select="runMenuAction(item)"
              >
                <span class="flex-1">{{ menuLabel(item) }}</span>
                <AppShortcutText v-if="menuShortcut(item)">{{
                  menuShortcut(item)
                }}</AppShortcutText>
              </MenubarItem>
            </template>
          </MenubarContent>
        </MenubarPortal>
      </MenubarMenu>
    </MenubarRoot>
  </div>
</template>
