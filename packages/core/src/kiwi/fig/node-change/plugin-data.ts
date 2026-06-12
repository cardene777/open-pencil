import type { NodeChange, PluginData, PluginRelaunchData } from '#core/kiwi/fig/codec'
import type { PluginDataEntry, PluginRelaunchDataEntry } from '#core/scene-graph'

import { guidToString } from './guid'

export const INKLY_PLUGIN_ID = 'inkly'
export const TEXT_DIRECTION_PLUGIN_KEY = 'textDirection'
export const LAYOUT_DIRECTION_PLUGIN_KEY = 'layoutDirection'
export const NODE_TYPE_PLUGIN_KEY = 'nodeType'
export const BOUND_VARIABLES_PLUGIN_KEY = 'boundVariables'
export const PROTOTYPE_REACTIONS_PLUGIN_KEY = 'prototypeReactions'

function setInklyPluginDataValue(
  node: { pluginData: PluginDataEntry[] },
  key: string,
  value: string | null
): void {
  const pluginData = node.pluginData.filter(
    (entry) => !(entry.pluginId === INKLY_PLUGIN_ID && entry.key === key)
  )
  if (value !== null) pluginData.push({ pluginId: INKLY_PLUGIN_ID, key, value })
  node.pluginData = pluginData
}

export function upsertPluginData(
  node: { pluginData: PluginDataEntry[] },
  key: string,
  value: string
): void {
  setInklyPluginDataValue(node, key, value)
}

export function setOptionalInklyPluginData(
  node: { pluginData: PluginDataEntry[] },
  key: string,
  value: string | null
): void {
  setInklyPluginDataValue(node, key, value)
}

function parseBoundVariablesPluginValue(value: string | null): Record<string, string> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'string'
      )
    )
  } catch {
    return {}
  }
}

export function extractBoundVariables(nc: NodeChange): Record<string, string> {
  const bindings = parseBoundVariablesPluginValue(
    getInklyPluginValue(nc, BOUND_VARIABLES_PLUGIN_KEY)
  )
  nc.fillPaints?.forEach((paint, i) => {
    if (paint.colorVariableBinding) {
      bindings[`fills/${i}/color`] = guidToString(paint.colorVariableBinding.variableID)
    }
  })
  nc.strokePaints?.forEach((paint, i) => {
    if (paint.colorVariableBinding) {
      bindings[`strokes/${i}/color`] = guidToString(paint.colorVariableBinding.variableID)
    }
  })
  return bindings
}

export function extractPluginData(nc: NodeChange): PluginDataEntry[] {
  return (nc.pluginData ?? []).map((entry) => ({
    pluginId: entry.pluginID,
    key: entry.key,
    value: entry.value
  }))
}

export function getInklyPluginValue(nc: NodeChange, key: string): string | null {
  return (
    nc.pluginData?.find((entry) => entry.pluginID === INKLY_PLUGIN_ID && entry.key === key)
      ?.value ?? null
  )
}

export function parseInklyJsonPluginValue<T>(
  nc: NodeChange,
  key: string,
  guard: (value: unknown) => value is T
): T | null {
  const rawValue = getInklyPluginValue(nc, key)
  if (!rawValue) return null
  try {
    const parsed = JSON.parse(rawValue) as unknown
    return guard(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function extractPluginRelaunchData(nc: NodeChange): PluginRelaunchDataEntry[] {
  return (nc.pluginRelaunchData ?? []).map((entry) => ({
    pluginId: entry.pluginID,
    command: entry.command,
    message: entry.message,
    isDeleted: entry.isDeleted
  }))
}

export function mergePluginData(pluginData: PluginDataEntry[]): PluginData[] {
  return pluginData.map((entry) => ({
    pluginID: entry.pluginId,
    key: entry.key,
    value: entry.value
  }))
}

export function serializePluginRelaunchData(
  entries: PluginRelaunchDataEntry[]
): PluginRelaunchData[] {
  return entries.map((entry) => ({
    pluginID: entry.pluginId,
    command: entry.command,
    message: entry.message,
    isDeleted: entry.isDeleted
  }))
}
