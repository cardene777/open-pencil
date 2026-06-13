import { createI18n, params } from '@nanostores/i18n'
import type { ComponentsJSON } from '@nanostores/i18n'
import type { TranslationFunction } from '@nanostores/i18n'
import type { ReadableAtom } from 'nanostores'

import { locale } from '#vue/i18n/locale'
import type { Locale } from '#vue/i18n/locale'

const localeLoaders: Record<Exclude<Locale, 'en'>, () => Promise<{ default: ComponentsJSON }>> = {
  ja: () => import('#vue/locales/ja.json'),
  de: () => import('#vue/locales/de.json'),
  es: () => import('#vue/locales/es.json'),
  fr: () => import('#vue/locales/fr.json'),
  it: () => import('#vue/locales/it.json'),
  pl: () => import('#vue/locales/pl.json'),
  ru: () => import('#vue/locales/ru.json'),
  'zh-CN': () => import('#vue/locales/zh-CN.json')
}

type MessageTree = {
  [key: string]: string | TranslationFunction<any[], any> | MessageTree
}

type MessageValues<Tree extends MessageTree> = {
  [Key in keyof Tree]: Tree[Key] extends string
    ? string
    : Tree[Key] extends TranslationFunction<infer Args, infer Output>
      ? TranslationFunction<Args, Output>
      : Tree[Key] extends MessageTree
        ? MessageValues<Tree[Key]>
        : never
}

type NestedI18n = <Body extends MessageTree>(
  componentName: string,
  baseTranslation: Body
) => ReadableAtom<MessageValues<Body>>

const baseI18n = createI18n<Locale, 'en'>(locale, {
  baseLocale: 'en',
  async get(code) {
    if (code === 'en') return {}
    const mod = await localeLoaders[code]()
    return mod.default
  }
})

const i18n = baseI18n as NestedI18n

export const menuMessages = i18n('menu', {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  object: 'Object',
  arrange: 'Arrange',
  text: 'Text',

  new: 'New',
  open: 'Open…',
  save: 'Save',
  saveAs: 'Save as…',
  exportSelection: 'Export selection…',
  autosave: 'Auto-save to local file',
  closeTab: 'Close tab',

  copy: 'Copy',
  paste: 'Paste',

  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  profiler: 'Performance profiler',
  language: 'Language',
  checkUpdates: 'Check for updates…',

  moveToPage: 'Move to page',
  createInstance: 'Create instance',
  hide: 'Hide',
  show: 'Show',
  lock: 'Lock',
  unlock: 'Unlock',
  cut: 'Cut',
  front: 'Front',
  back: 'Back',
  toggleUI: 'Toggle UI',

  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',

  pasteHere: 'Paste here',
  pasteToReplace: 'Paste to replace',
  copyPasteAs: 'Copy/Paste as',
  copyAsText: 'Copy as text',
  copyAsSVG: 'Copy as SVG',
  copyAsPNG: 'Copy as PNG',
  copyAsJSX: 'Copy as JSX',
  copyNodeId: 'Copy node ID',
  copyXPath: 'Copy XPath',
  booleanOperations: 'Boolean operations'
})

export const commandMessages = i18n('commands', {
  undo: 'Undo',
  redo: 'Redo',
  selectAll: 'Select all',
  duplicate: 'Duplicate',
  delete: 'Delete',
  group: 'Group',
  groupSelection: 'Group selection',
  frameSelection: 'Frame selection',
  ungroup: 'Ungroup',
  createComponent: 'Create component',
  createComponentSet: 'Create component set',
  createInstance: 'Create instance',
  detachInstance: 'Detach instance',
  goToMainComponent: 'Go to main component',
  addAutoLayout: 'Add auto layout',
  bringToFront: 'Bring to front',
  sendToBack: 'Send to back',
  showHide: 'Show/Hide',
  lockUnlock: 'Lock/Unlock',
  unionSelection: 'Union selection',
  subtractSelection: 'Subtract selection',
  intersectSelection: 'Intersect selection',
  excludeSelection: 'Exclude selection',
  flattenSelection: 'Flatten',
  outlineText: 'Outline text',
  outlineStroke: 'Outline stroke',
  booleanOperations: 'Boolean operations',
  flipHorizontal: 'Flip horizontal',
  flipVertical: 'Flip vertical',
  moveToPage: 'Move to page',
  zoomTo100: 'Zoom to 100%',
  zoomToFit: 'Zoom to fit',
  zoomToSelection: 'Zoom to selection'
})

export const toolMessages = i18n('tools', {
  move: 'Move',
  frame: 'Frame',
  section: 'Section',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  polygon: 'Polygon',
  star: 'Star',
  pen: 'Pen',
  text: 'Text',
  hand: 'Hand'
})

export const panelMessages = i18n('panels', {
  untitled: 'Untitled',
  nodeCopyString: ' copy',
  layers: 'Layers',
  pages: 'Pages',
  design: 'Design',
  code: 'Code',
  ai: 'AI',
  assets: 'Assets',
  searchLocalComponents: 'Search local components',
  assetLibraryBadge: 'Library',
  assetVariantSummary: params('{count} variants · {names}'),
  duplicateVariantValues: 'Duplicate variant values',
  openDocumentation: 'Open documentation',
  noLocalComponents: 'No local components',
  componentSet: 'Component set',
  component: 'Component',
  insertInstance: 'Insert instance',
  description: 'Description',
  documentation: 'Documentation',
  openDocs: 'Open docs',
  properties: 'Properties',

  xAxis: 'X Axis',
  yAxis: 'Y Axis',
  rotation: 'Rotation',
  width: 'Width',
  height: 'Height',
  opacity: 'Opacity',
  radius: 'Radius',
  spread: 'Spread',

  page: 'Page',
  position: 'Position',
  layout: 'Layout',
  autoLayout: 'Auto layout',
  alignment: 'Alignment',
  appearance: 'Appearance',
  fill: 'Fill',
  stroke: 'Stroke',
  effects: 'Effects',
  export: 'Export',
  typography: 'Typography',
  variables: 'Variables',
  variants: 'Variants',
  constraints: 'Constraints',

  addFill: 'Add fill',
  addStroke: 'Add stroke',
  addEffect: 'Add effect',
  addExport: 'Add export',
  removeFill: 'Remove fill',
  removeStroke: 'Remove stroke',
  removeEffect: 'Remove effect',
  removeExport: 'Remove export',
  effectSettings: 'Effect settings',
  expandEffectSettings: 'Expand effect settings',
  collapseEffectSettings: 'Collapse effect settings',
  toggleExportPreview: 'Toggle export preview',

  dropShadow: 'Drop shadow',
  innerShadow: 'Inner shadow',
  layerBlur: 'Layer blur',
  backgroundBlur: 'Background blur',
  foregroundBlur: 'Foreground blur',

  strokeType: 'Stroke type',
  strokeWeight: 'Stroke weight',

  noSelection: 'No selection',
  noLocalVariables: 'No local variables',
  openVariables: 'Open variables',
  addPage: 'Add page',
  toggleVisibility: 'Toggle visibility',
  independentCornerRadii: 'Independent corner radii',
  detachVariable: 'Detach variable',
  applyVariable: 'Apply variable',
  noVariablesFound: 'No variables found',
  addAutoLayout: 'Add auto layout',
  removeAutoLayout: 'Remove auto layout',
  alignLeft: 'Align left',
  alignCenterHorizontally: 'Align center horizontally',
  alignRight: 'Align right',
  alignTop: 'Align top',
  alignCenterVertically: 'Align center vertically',
  alignBottom: 'Align bottom',
  flipHorizontal: 'Flip horizontal',
  flipVertical: 'Flip vertical',
  rotate90: 'Rotate 90°',
  mixedFillsHelp: 'Click + to replace mixed fills',
  mixedStrokesHelp: 'Click + to replace mixed strokes',
  mixedEffectsHelp: 'Click + to replace mixed effects',
  strokeSides: 'Stroke sides',
  strokeDash: 'Dashed stroke',
  strokeAlignInside: 'Inside',
  strokeAlignCenter: 'Center',
  strokeAlignOutside: 'Outside',
  exportScale: 'Export scale',
  exportFormat: 'Export format',
  exportPreview: 'Preview',
  exportRenderingPreview: 'Rendering preview…',
  create: 'Create',
  add: 'Add',
  createVariable: 'Create variable',
  createColorVariable: params('Create color variable from {value}'),
  createNumberVariable: params('Create number variable from {value}'),
  variableName: 'Variable name',
  mixed: 'Mixed',
  layersCount: params('{count} layers'),
  goToMainComponent: 'Go to Main Component',
  detachInstance: 'Detach Instance',

  gap: 'Gap',

  solid: 'Solid',
  linearGradient: 'Linear',
  radialGradient: 'Radial',
  image: 'Image',
  stops: 'Stops',
  addStop: 'Add stop',

  alignCenter: 'Align center',
  alignMiddle: 'Align middle',
  clipContent: 'Clip content',
  colorFormatRgb: 'RGB',
  colorFormatHsl: 'HSL',
  colorFormatHsb: 'HSB',
  colorFormatOkhcl: 'OkHCL',
  colorHintHsl: 'H hue · S saturation · L lightness',
  colorHintHsb: 'H hue · S saturation · B brightness',
  colorHintOkhcl: 'H hue · C chroma · L lightness · A alpha',
  colorPreviewClipped: params('Clipped to {space} preview gamut'),
  rulers: 'Rulers',
  multiplayerCursors: 'Multiplayer cursors',
  direction: 'Direction',
  flow: 'Flow',
  gapAuto: 'Auto gap',
  horizontalGap: 'Horizontal gap',
  verticalGap: 'Vertical gap',
  auto: 'Auto',
  columns: 'Columns',
  rows: 'Rows',
  sizingFixed: 'Fixed',
  sizingHug: 'Hug',
  sizingFill: 'Fill',
  sizingHugShort: 'Hug',
  sizingFillShort: 'Fill',
  addMinWidth: 'Add min width',
  removeMinWidth: 'Remove min width',
  addMaxWidth: 'Add max width',
  removeMaxWidth: 'Remove max width',
  addMinHeight: 'Add min height',
  removeMinHeight: 'Remove min height',
  addMaxHeight: 'Add max height',
  removeMaxHeight: 'Remove max height',
  minWidthShort: 'Min W',
  maxWidthShort: 'Max W',
  minHeightShort: 'Min H',
  maxHeightShort: 'Max H',
  setToCurrentWidth: 'Set to current width',
  setToCurrentHeight: 'Set to current height',
  sizingFillFr: 'Fill (fr)',
  sizingFixedPx: 'Fixed (px)',
  searchFonts: 'Search fonts...',
  previousCategory: 'Previous category',
  nextCategory: 'Next category',
  moreTools: 'More tools',
  layoutDirectionHorizontal: 'Horizontal layout',
  layoutDirectionVertical: 'Vertical layout',
  layoutDirectionGrid: 'Grid layout',
  layoutWrap: 'Wrap items',
  toggleIndividualPadding: 'Toggle individual padding',
  alignmentGridCell: 'Set alignment',
  addTrack: 'Add track',
  removeTrack: 'Remove track',
  widthSizingMenu: 'Width sizing options',
  heightSizingMenu: 'Height sizing options',
  colorPickerSwatch: 'Open color picker',
  colorHexInput: 'Color hex value'
})

export const prototypeMessages = i18n('prototype', {
  panelTitle: 'Prototype',
  addReaction: 'Add reaction',
  reaction: params('Reaction {index}'),
  trigger: 'Trigger',
  triggerOnClick: 'On click',
  triggerOnHover: 'On hover',
  triggerOnMouseDown: 'On mouse down',
  triggerAfterDelay: 'After delay',
  action: 'Action',
  actionNavigate: 'Navigate',
  actionOpenOverlay: 'Open overlay',
  actionCloseOverlay: 'Close overlay',
  actionBack: 'Back',
  actionExternalUrl: 'Open URL',
  targetFrame: 'Target frame',
  externalUrl: 'External URL',
  transition: 'Transition',
  transitionInstant: 'Instant',
  transitionDissolve: 'Dissolve',
  transitionSlideLeft: 'Slide left',
  transitionSlideRight: 'Slide right',
  delayMs: 'Delay (ms)',
  transitionDurationMs: 'Duration (ms)',
  deleteReaction: 'Delete',
  moveUp: 'Move up',
  moveDown: 'Move down',
  startFrameLabel: 'Start frame',
  setAsStartFrame: 'Set as start frame',
  openInPreview: 'Open in preview',
  play: 'Play',
  back: 'Back',
  resetToStart: 'Reset to start',
  close: 'Close',
  noFrames: 'No frames on this page',
  noSelection: 'Select a frame to edit prototype reactions.',
  noTargetFrame: 'No target frame',
  loadingPreview: 'Loading preview…',
  previewUnavailable: 'Preview unavailable'
})

export const variableTypeMessages = i18n('variableTypes', {
  color: 'Color',
  colorHint: 'Paint values',
  number: 'Number',
  numberHint: 'Sizes, spacing, opacity',
  text: 'Text',
  textHint: 'Copy and labels',
  boolean: 'Boolean',
  booleanHint: 'True or false'
})

export const pageMessages = i18n('pages', {
  newPage: 'New page',
  rename: 'Rename',
  delete: 'Delete',
  pageName: params('Page {number}')
})

export const dialogMessages = i18n('dialogs', {
  cancel: 'Cancel',
  apply: 'Apply',
  close: 'Close',
  ok: 'OK',
  copy: 'Copy',
  copied: 'Copied',
  copiedExclamation: 'Copied!',
  copyMessage: 'Copy message',
  createCollection: 'Create collection',
  renameCollection: 'Rename collection',
  deleteCollection: 'Delete collection',
  localVariables: 'Local variables',
  noVariableCollections: 'No variable collections',
  modes: 'Modes',
  addMode: 'Add mode',
  renameMode: 'Rename mode',
  duplicateMode: 'Duplicate mode',
  deleteMode: 'Delete mode',
  setDefaultMode: 'Set as default',
  selectLayerForJSX: 'Select a layer to see its JSX code',
  copyJSXReference: 'Copy JSX prop reference to clipboard',
  newTab: 'New tab',
  closeTab: params('Close {name}'),
  showUI: params('Show UI ({shortcut})'),
  fontSettings: 'Font settings',
  you: 'You',
  youSuffix: 'you',
  followingPeerStop: params('Following {name} (click to stop)'),
  clickToFollowPeer: params('Click to follow {name}'),
  connectAIProvider: 'Connect an AI provider to start chatting.',
  connect: 'Connect',
  getAPIKey: params('Get an {provider} API key →'),
  oneKeyManyModels: 'One key for 100+ models from all providers.',
  describeChange: 'Describe a change…',
  describeCreateOrChange: 'Describe what you want to create or change.',
  stopGenerating: 'Stop generating',
  sendMessage: 'Send message',
  baseURLPlaceholder: 'Base URL (e.g. http://localhost:11434/v1)',
  modelIDPlaceholder: 'Model ID (e.g. llama-3.3-70b)',
  customEndpointBaseURLPlaceholder: 'http://localhost:11434/v1',
  customEndpointModelPlaceholder: 'e.g. llama-3.3-70b',
  customEndpointOpenRouterModelPlaceholder: 'e.g. meta-llama/llama-3.3-70b-instruct',
  mobilePanelNavigation: 'Mobile panel navigation',
  permissionRequest: 'Permission Request',
  acpInstallPrefix: 'Install it with',
  aiProvider: 'AI Provider',
  providerSettings: 'Provider settings',
  done: 'Done',
  apiKey: 'API Key',
  apiType: 'API Type',
  baseURL: 'Base URL',
  modelID: 'Model ID',
  maxOutputTokens: 'Max output tokens',
  clear: 'Clear',
  keySavedReplace: 'Key saved — enter new to replace',
  getAPIKeyGeneric: 'Get API key →',
  pexelsAPIKey: 'Pexels API Key (stock photos)',
  unsplashAccessKey: 'Unsplash Access Key',
  stockPhotoToolOptional: 'Optional — for stock_photo tool',
  pexelsAlternativeOptional: 'Optional — alternative to Pexels',
  getPexelsAPIKey: 'Get free Pexels API key →',
  getUnsplashAccessKey: 'Get free Unsplash access key →',
  completions: 'Completions',
  responses: 'Responses',
  yourName: 'Your name',
  enterYourName: 'Enter your name',
  shareThisFile: 'Share this file',
  joinRoom: 'Join room',
  join: 'Join',
  roomLink: 'Room link',
  joinCollaboration: 'Join collaboration',
  joinRoomIntro: 'Someone shared this file with you. Enter your name to join.',
  orJoinRoom: 'or join a room',
  pasteRoomLinkOrId: 'Paste room link or ID',
  connected: 'Connected',
  search: 'Search…',
  noResults: 'No results',
  share: 'Share',
  appUpToDate: 'Inkly is up to date',
  updateAvailableTitle: 'Update Inkly',
  updateAvailable: params('Inkly {version} is available.'),
  updateInstallPrompt:
    'Download and install it now? The app will restart after the update is installed.',
  downloadingUpdate: params('Downloading Inkly {version}'),
  updateInstalledTitle: 'Update installed',
  updateInstalled: params('Inkly {version} was installed{size}. Restarting now.'),
  updateUnavailable:
    'Updates are not available yet. Publish a signed release with latest.json first.',
  updateCheckFailed: params('Could not check for updates: {error}')
})

export const boardsMessages = i18n('boards', {
  heading: 'Your boards',
  subtitle: 'Create a board and share it without leaving Inkly.',
  defaultBoardName: 'Untitled board',
  boardNamePlaceholder: 'Board name',
  recentHeading: 'Recent boards',
  recentSubtitle: 'Search by board name or reopen a recently edited board.',
  searchPlaceholder: 'Search boards',
  loadingBoards: 'Loading boards…',
  emptyHeading: 'No boards yet',
  emptyHint: 'Create your first board to start the invite and sharing flows.',
  emptySearchHeading: 'No matching boards',
  emptySearchHint: 'Try a different name or clear the search box.',
  deleteDialogTitle: 'Delete board',
  deleteDialogDescription: 'This permanently removes the board and its invitation links.',
  deleteDialogCancel: 'Cancel',
  deleteDialogConfirm: 'Delete board',
  toastLoadFail: 'Failed to load boards',
  toastCreateFail: 'Failed to create board',
  toastDeleteFail: 'Failed to delete board',
  toastLoginFail: 'Failed to start Google login'
})

export const dashboardMessages = i18n('dashboard', {
  title: 'Dashboard',
  brand: 'Inkly',
  metrics: {
    personalBoards: 'Personal boards',
    unread: 'Unread'
  },
  quickActions: {
    heading: 'Quick actions',
    subtitle: 'Start a new board or jump to a workspace',
    newBoard: '+ New board',
    creating: 'Creating…',
    allBoards: 'All boards',
    allBoardsHint: 'Browse and manage your boards',
    notifications: 'Notifications',
    notificationsHint: params('{count} unread')
  },
  pinned: {
    heading: 'Pinned boards',
    countLabel: params('{count} pinned')
  },
  recent: {
    heading: 'Recent boards',
    subtitle: 'Pick up where you left off',
    viewAll: 'View all →',
    loading: 'Loading…',
    empty: 'No boards yet. Create your first board above.'
  },
  invitedBadge: 'Invited',
  activityFeed: {
    heading: 'Activity',
    subtitle: 'Recent notifications and mentions',
    viewAll: 'View all →',
    empty: 'No activity yet.'
  },
  pinAria: {
    pin: 'Pin board',
    unpin: 'Unpin board',
    toggle: 'Toggle pin'
  },
  navLinks: {
    boards: 'Boards',
    account: 'Account'
  },
  customize: {
    button: 'Customize',
    panelTitle: 'Customize dashboard',
    panelHint: 'Toggle sections and reorder them. Saved to this browser.',
    reset: 'Reset to default',
    done: 'Done',
    moveUp: 'Move up',
    moveDown: 'Move down',
    toggleAria: 'Toggle section',
    sectionMetrics: 'Metrics',
    sectionQuickActions: 'Quick actions',
    sectionPinned: 'Pinned boards',
    sectionRecent: 'Recent boards',
    sectionActivity: 'Activity',
    dragHandleAria: params('Drag to reorder {section}'),
    dragRowAria: params('{section} section, draggable'),
    dragStartAnnounce: params('Grabbed {section}. Drop it on another section to reorder.'),
    dragDropAnnounce: params('Moved {section} before {target}.'),
    dragCancelAnnounce: params('Cancelled reorder of {section}.'),
    keyboardHint:
      'Press Space to pick up. Use arrow keys to move, Enter to drop, Escape to cancel.',
    keyboardPickupAnnounce: params(
      'Picked up {section}. Arrow keys move, Enter drops, Escape cancels.'
    ),
    keyboardMoveAnnounce: params('Moved {section} to position {position} of {total}.'),
    keyboardDropAnnounce: params('Dropped {section}.'),
    keyboardCancelAnnounce: params('Cancelled keyboard reorder of {section}.')
  }
})

export const accountMessages = i18n('account', {
  headTitle: 'Account',
  eyebrow: 'Account',
  heading: 'Profile',
  subtitle:
    'Inkly works without an account. Sign in only if you want to migrate your anonymous boards and keep them under your user profile.',
  loading: 'Loading account…',
  signInHeading: 'Continue with Google',
  signInDescription:
    'If Google OAuth is not configured in this environment, the button will report that it is unavailable and anonymous mode will keep working.',
  signInButton: 'Sign in with Google',
  signInPending: 'Starting…',
  defaultDisplayName: 'Inkly User',
  avatarAlt: params('{name} avatar'),
  migrating: 'Migrating your boards…',
  logoutButton: 'Log out',
  logoutPending: 'Signing out…',
  logoutDialogTitle: 'Log out',
  logoutDialogDescription: 'You will return to anonymous mode on this device.',
  logoutDialogHint: 'Your boards remain available. Sign in again to restore account notifications.',
  logoutDialogCancel: 'Cancel',
  logoutDialogConfirm: 'Log out',
  toastSignedOut: 'Signed out',
  toastLoginFail: 'Failed to start Google login',
  toastLogoutFail: 'Failed to sign out'
})

export const boardSettingsMessages = i18n('boardSettings', {
  headTitleDefault: 'Board Settings',
  headTitleWithName: params('{name} Settings'),
  backToBoards: 'Back to boards',
  headingFallback: 'Board settings',
  subtitle: 'Review invitation links and the anonymous collaborators that have accepted them.',
  openBoard: 'Open board',
  newInvite: 'New invite',
  loading: 'Loading board settings…',
  invitationLinksHeading: 'Invitation links',
  refresh: 'Refresh',
  editorInvite: 'Editor invite',
  viewerInvite: 'Viewer invite',
  statusRevoked: 'Revoked',
  statusActive: 'Active',
  statusSeparator: ' · ',
  expiresPrefix: 'Expires',
  linkUnavailable: 'Link unavailable',
  copy: 'Copy',
  copied: 'Copied',
  revoke: 'Revoke',
  emptyInvitations: 'No invitation links yet.',
  collaboratorsHeading: 'Collaborators',
  addedPrefix: 'Added',
  revokeDialogTitle: 'Revoke invitation',
  revokeDialogDescription:
    'This invite link will stop working immediately. Existing collaborators keep their current access.',
  revokeDialogCancel: 'Cancel',
  revokeDialogConfirm: 'Revoke link',
  shareModalBoardFallback: 'Board',
  toastLinkCopied: 'Link copied to clipboard',
  toastInvitationRevoked: 'Invitation revoked',
  toastLoadFail: 'Failed to load board settings',
  toastRevokeFail: 'Failed to revoke invitation'
})

export const notificationsMessages = i18n('notifications', {
  headTitle: 'Notifications',
  eyebrow: 'Inbox',
  heading: 'Notifications',
  subtitle: 'Track board invitations, workspace access, and mentions in one place.',
  backToBoards: 'Boards',
  markAllRead: 'Mark all read',
  loading: 'Loading notifications…',
  loginRequiredHeading: 'Login required',
  loginRequiredHint: 'Notifications are available only for signed-in users.',
  emptyHeading: 'No notifications yet',
  emptyHint: 'Invitations and mentions will show up here once they arrive.',
  openLabel: 'Open',
  markReadLabel: 'Mark read',
  deleteLabel: 'Delete',
  toastLoginFail: 'Failed to start Google login',
  toastMarkReadFail: 'Failed to mark notification as read',
  toastMarkAllReadFail: 'Failed to mark notifications as read',
  toastDeleteFail: 'Failed to delete notification',
  toastOpenFail: 'Failed to open notification'
})

export const notificationsFormatMessages = i18n('notificationsFormat', {
  invitationTitle: params('{inviter} invited you to {board}'),
  mentionTitle: params('{mentioner} mentioned you in {board}'),
  invitationBody: params('Board invitation as {role}.')
})

export const notificationBellMessages = i18n('notificationBell', {
  triggerAriaLabel: 'Open notifications',
  popoverHeading: 'Notifications',
  popoverSubtitle: 'Latest 5 items',
  viewAll: 'View all',
  loading: 'Loading notifications…',
  empty: 'No notifications yet.'
})

export const boardCardMessages = i18n('boardCard', {
  previewPending: 'Preview pending',
  previewAlt: params('{name} preview'),
  badge: 'Board',
  peopleCount: params('{count} people'),
  updatedPrefix: 'Updated',
  pinAriaPin: 'Pin board',
  pinAriaUnpin: 'Unpin board',
  pinLabel: 'Pin',
  pinnedLabel: 'Pinned',
  settings: 'Settings',
  delete: 'Delete'
})

export const loginBannerMessages = i18n('loginBanner', {
  eyebrow: 'Optional account',
  heading: 'Log in with Google to keep your boards',
  description:
    'Anonymous mode stays available. If you log in, Inkly migrates your current anonymous boards to your account automatically.',
  migrating: 'Migrating your anonymous boards…',
  loginButton: 'Sign in with Google',
  loginPending: 'Starting…'
})

export const mobilePresenceMessages = i18n('mobilePresence', {
  onlineCount: params('Online: {count}'),
  inThisRoom: 'In this room',
  youFallback: 'You',
  youSuffix: 'you',
  following: 'following',
  disconnect: 'Disconnect'
})

export const mentionInputMessages = i18n('mentionInput', {
  heading: 'Mention',
  matchingQuery: params('Matching "{query}"'),
  prompt: 'Type a name or email',
  loading: 'Loading people…',
  empty: 'No matching collaborators.',
  avatarAlt: params('{name} avatar')
})

export const safariBannerMessages = i18n('safariBanner', {
  messagePrefix:
    "Your browser doesn't support the local file API. Files will be downloaded instead of saved in place. ",
  useChrome: 'Use Chrome',
  messageSuffix: ' or Edge for full support.',
  dismiss: 'Dismiss'
})

export const shareModalMessages = i18n('shareModal', {
  dialogTitle: 'Share',
  dialogDescription: params('Add internal members to {boardName} or send an invitation link.'),
  boardNameFallback: 'Board',
  boardMissingNotice: 'Create a board on /boards first, then re-open to issue invitation links.',
  emailLabel: 'Email',
  emailPlaceholder: 'collaborator@example.com',
  emailRequired: 'Email is required',
  emailInvalid: 'Enter a valid email address',
  roleLabel: 'Role',
  roleEditor: 'Editor',
  roleViewer: 'Viewer',
  cancel: 'Close',
  submit: 'Create invite',
  submitPending: 'Creating…',
  invitationUrlLabel: 'Invitation URL',
  copy: 'Copy',
  copied: 'Copied',
  share: 'Share',
  expiresIn7Days: 'Link expires in 7 days.',
  toastInvitationCreated: 'Invitation link created',
  toastCreateFail: 'Failed to create invitation',
  toastLinkCopied: 'Link copied to clipboard',
  shareTitle: params('Invitation to {boardName}'),
  internalEmailsLabel: 'Internal members (jfet.co.jp)',
  internalSuggestPlaceholder: 'Search by name or email',
  internalSuggestHint: 'Select a suggestion or add a full email manually.',
  internalSuggestLoading: 'Searching internal members…',
  internalSuggestEmpty: 'No matching internal members.',
  internalManualAdd: 'Add manually',
  internalEmailsPlaceholder: 'alice@jfet.co.jp, bob@jfet.co.jp',
  internalEmailsHint: 'Separate addresses with commas, spaces, or newlines.',
  internalChipRemove: 'Remove',
  externalEmailLabel: 'External invitation (single)',
  shareSubmit: 'Share',
  shareSubmitPending: 'Sharing…',
  toastShareAdded: params('{count} added directly to the board.'),
  toastSharePending: params('{count} pending — they will join after first sign-in.'),
  toastShareRejected: params('{count} external addresses — use the invitation link instead.'),
  toastShareFail: 'Failed to share the board',
  recipientsLabel: 'Recipients',
  recipientsPlaceholder: 'Type an email and press space to add',
  recipientsHint: 'Press space, comma, or Enter to turn the email into a chip.',
  recipientsInvalidNotice: params('{count} entries are not valid email addresses.'),
  recipientsExternalNotice: params('{count} external addresses will receive an invitation link.')
})

export const fontSettingsMessages = i18n('fontSettings', {
  descriptionTauri: 'Access system fonts, Google Fonts, fallback packs, and cached downloads.',
  descriptionBrowser: 'Allow browser access to local fonts and manage Google Fonts.',
  localFontsLabel: 'Local fonts',
  googleFontsLabel: 'Google Fonts',
  cacheLabel: 'Downloaded cache',
  cacheValue: params('{count} fonts · {size}'),
  lastUpdatedLabel: 'Last updated',
  systemAccessHeading: 'System font access',
  systemAccessGranted: 'System fonts are available.',
  systemAccessPrompt: 'Allow browser font access when system fonts are missing.',
  allow: 'Allow',
  requesting: 'Requesting…',
  googleFontsHeading: 'Google Fonts',
  googleFontsDescription: 'Show fonts from Google in the font picker.',
  enable: 'Enable',
  disable: 'Disable',
  enabled: 'Enabled',
  disabled: 'Disabled',
  fallbackHeading: 'Fallback packs',
  fallbackDescription: 'Download CJK and Arabic fallbacks before opening files that need them.',
  download: 'Download',
  downloading: 'Downloading…',
  refresh: 'Refresh',
  clearCache: 'Clear cache'
})

export const commonMessages = i18n('common', {
  home: 'Home',
  openBoard: 'Open →'
})

export const guestDashboardMessages = i18n('guestDashboard', {
  headTitle: 'Your invited boards',
  guestBadge: 'Guest',
  signOut: 'Sign out',
  accountAriaLabel: 'Account menu',
  welcomeTitle: params('Welcome, {name}'),
  welcomeSubtitle: params('You have been invited to {boards} boards by {inviters} inviters.'),
  boardsHeading: 'Your invited boards',
  boardsSubheading: 'Boards shared with you by jfet members',
  emptyTitle: 'No invited boards yet',
  emptyDescription:
    'When someone invites you to a board, it will appear here. Re-open the invitation URL if you came in by mistake.',
  inviterUnknown: 'unknown inviter',
  fromInviter: params('from {name}'),
  untitledBoard: 'Untitled board',
  relativeJustNow: 'Just now',
  relativeMinutes: params('{value} min ago'),
  relativeHours: params('{value}h ago'),
  relativeDays: params('{value}d ago'),
  roleLabel: {
    owner: 'OWNER',
    editor: 'EDITOR',
    viewer: 'VIEWER',
    commenter: 'COMMENT'
  }
})

export const permissionDeniedMessages = i18n('permissionDenied', {
  headTitle: 'Access not granted',
  headline: 'Access not granted',
  description:
    'Only boards shared with you are available. Open the invitation URL again, or sign in with a different account.',
  blockedPathLabel: 'Blocked path',
  ctaPrimary: 'Go to invited boards',
  ctaSignOut: 'Sign out'
})

export const inviteAuthMessages = i18n('inviteAuth', {
  headTitle: 'Accept invitation',
  eyebrow: 'Invite',
  headlineVerifying: 'Verifying invitation…',
  headlineInvalid: 'Invitation is invalid',
  headlineExpired: 'Invitation has expired',
  headlineAuthed: 'Opening the board…',
  headlineSignUp: 'Create your account',
  headlineSignIn: 'Sign in to accept',
  verifyingHint: 'You will be redirected to the editor automatically.',
  invalidHint: 'The token may be expired or revoked. Ask the inviter for a fresh link.',
  backToTop: 'Back to top',
  modeSignUp: 'New here',
  modeSignIn: 'Already have an account',
  nameLabel: 'Display name',
  namePlaceholder: 'Alice',
  emailLabel: 'Invited email',
  emailPlaceholder: 'invited@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'At least 8 characters',
  submitSignUp: 'Create account & open board',
  submitSignIn: 'Sign in & open board',
  submitSubmitting: 'Accepting invitation…',
  errorPasswordTooShort: 'Password must be at least 8 characters.',
  errorNameRequired: 'Please enter your display name.',
  errorUnknown: 'Could not accept invitation. Please try again.',
  errorMap: {
    email_mismatch: 'The email does not match the invitation. Use the same address as the invitee.',
    sign_up_failed: 'Could not create the account. The email may already be in use.',
    sign_in_failed: 'Could not sign in. Check your password.',
    expired: 'Invitation has expired.',
    revoked: 'Invitation has been revoked.',
    auth_misconfigured: 'Email/password sign-in is not available on this server.'
  }
})

export const saveAndLeaveModalMessages = i18n('saveAndLeaveModal', {
  title: 'Add this board to your dashboard?',
  descriptionLine1: 'This board has not been saved to your dashboard yet.',
  descriptionLine2: params('Add "{name}" to the dashboard before leaving?'),
  untitledName: 'Untitled board',
  toastAdded: params('Added "{name}" to your dashboard'),
  errorFallback: 'Failed to add to dashboard',
  buttonSaving: 'Saving…',
  buttonSave: 'Add to dashboard and leave',
  buttonDiscard: 'Discard and leave',
  buttonCancel: 'Cancel'
})

export const adminMessages = i18n('admin', {
  title: 'Admin',
  badge: 'Internal',
  navLinks: {
    dashboard: 'Dashboard',
    account: 'Account'
  },
  tabs: {
    overview: 'Overview',
    boards: 'Boards',
    activity: 'Activity'
  },
  overview: {
    totalBoards: 'Total boards',
    personal: 'Personal',
    collaborators: 'Collaborators'
  },
  boardsTab: {
    heading: 'All boards',
    shownCount: params('{shown} / {total} shown'),
    searchPlaceholder: 'Search by name or id',
    searchAria: 'Search boards',
    exportCsv: 'Export CSV',
    exportToastSingular: params('Exported {count} board'),
    exportToastPlural: params('Exported {count} boards'),
    deletePromptSingular: params('Delete board "{name}"? This cannot be undone.'),
    deleteSuccess: 'Board deleted',
    deleteFail: 'Failed to delete board',
    loading: 'Loading…',
    empty: 'No boards match the filter.',
    colName: 'Name',
    colCollaborators: 'Collaborators',
    colCreated: 'Created',
    colUpdated: 'Updated',
    actions: 'Actions',
    open: 'Open',
    deleting: 'Deleting…',
    delete: 'Delete',
    csvHeaderId: 'Id'
  },
  activityTab: {
    heading: 'Activity',
    subtitle: 'Recent notifications (invitations, mentions). Latest 50 records.',
    empty: 'No activity recorded.',
    searchPlaceholder: 'Search title or body',
    searchAria: 'Search activity',
    typeAria: 'Filter activity by type',
    typeAll: 'All types',
    typeInvitation: 'Invitation',
    typeMention: 'Mention',
    rangeAria: 'Filter activity by range',
    rangeAll: 'All time',
    range24h: 'Last 24h',
    range7d: 'Last 7 days',
    range30d: 'Last 30 days',
    shownCount: params('{shown} / {total} shown'),
    exportCsv: 'Export CSV',
    exportToastSingular: params('Exported {count} record'),
    exportToastPlural: params('Exported {count} records'),
    csvUnknown: 'Unknown',
    csvHeaderId: 'Id',
    csvHeaderType: 'Type',
    csvHeaderTitle: 'Title',
    csvHeaderBody: 'Body',
    csvHeaderCreatedAt: 'Created At',
    csvHeaderReadAt: 'Read At'
  }
})
