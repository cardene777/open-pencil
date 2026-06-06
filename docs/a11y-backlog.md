# a11y backlog

`tests/e2e/a11y/*` の `disableRules` に残っている axe violation を 1 件ずつ解消するための backlog。 fix 済 rule は `disableRules` から削除し、 同時に TODO comment も消す運用 (PR #78 と同方針)。

## 完了済 (history)

| PR | 解消した rule | 対象 |
|---|---|---|
| #76 | `button-name` (notification bell) | NotificationBell trigger に aria-label / icon に aria-hidden |
| #77 | `select-name` (board team) | BoardsView board team select に aria-label |
| #78 | TODO comment / disableRules cleanup | 上記 fix 済 rule を test 側から削除 |
| #95 | `button-name` (editor toolbar 系 5 button) | ToolButton / ToolFlyout / ToolbarActionGroup / MobileToolbar prev,next に aria-label を i18n key (`tools.*` / `panels.previousCategory,nextCategory,moreTools`) で配線、 PropertiesPanel 系 / LayersPanel 系は後続 PR で対応するため editor.a11y.spec.ts の disableRules は残置 |
| #96 | `button-name` (PropertiesPanel 系 20 button) | Position / Effects / Color / Appearance / Fill / Typography / Export の Tip wrap 済 button に i18n key 経由 aria-label を直接配線 (Tip + button aria-label 二重配線パターン) |
| #97 | `button-name` (Stroke / Layout / Variables 12 button) | StrokeSection / LayoutSection (AutoLayout/Flex/Grid) / VariablesSection / BoundVariableButton / BooleanOperationsControl + 新規 i18n key 8 件 (layoutDirection* / layoutWrap / toggleIndividualPadding / alignmentGridCell / addTrack / removeTrack) を 9 locale 一括追加 |
| #98 | `button-name` (editor chrome 全域) | AppMenu / AppSelect / FillPicker swatch + 3 tab / SizeControls width/height sizing menu / ColorPickerRoot primitive の swatch、 `editor.a11y.spec.ts` の disableRules から `button-name` を削除 (今後 violation は即 fail)、 新規 i18n key 3 件 (widthSizingMenu / heightSizingMenu / colorPickerSwatch) を 9 locale 追加 |
| #99 | `label` + `aria-required-children` (editor chrome) | ColorPicker/ColorInput.vue hex input に panels.colorHexInput を `aria-label` 配線 + PropertiesPanel.vue TabsList wrapper div 追加で ZoomDropdown を sibling 移動、 editor.a11y.spec.ts の disableRules から `label` / `aria-required-children` 両方削除 |

editor 全 chrome (Toolbar + PropertiesPanel + LayersPanel + reka-ui primitive 全域) で button-name / label / aria-required-children rule は **完全解消** され、 `editor.a11y.spec.ts` の disableRules は `color-contrast` 1 rule のみとなった。

## 残っている rule (次の fix 候補)

### color-contrast (大規模 design system 改修必要)

**現状分析 (2026-06-06 時点)** — color-contrast 違反は単一 CSS variable 改修では解消不能と判明した。 axe report (`notifications.a11y.spec.ts` で disableRules を一時的に外して走らせた結果) で以下の構造が確認された。

主要な違反パターン (背景色は `--color-panel` `#2a2a2a` ベース):

| 違反箇所 | fg color | bg color | 現状 ratio | 必要 | 解消方針 |
|---|---|---|---|---|---|
| `text-muted` 11px on bg-panel | `#888888` | `#2a2a2a` | 4.04 | 4.5 | `--color-muted` を明るく (`#a8a8a8`) |
| `text-accent` 11px on bg-panel | `#3b82f6` | `#2a2a2a` | 3.9 | 4.5 | `--color-accent` を明るく (`#5b9eff`) |
| `text-white` 14px on bg-accent | `#ffffff` | `#3b82f6` | 3.68 (fail) | 4.5 | accent を **暗く** すれば pass (例 `#1d4ed8` で 7.04 pass)、 ただし accent を明るくすると更に悪化 |
| `text-muted` 12px on bg-accent/8 | `#888888` | `#2b313a` | 3.69 | 4.5 | `--color-muted` 改善で 4.74 (pass) |
| `text-muted/80` 11px on bg-accent/8 | `#757778` | `#2b313a` | 2.91 | 4.5 | 80% alpha 自体を `text-muted` に置換 (NotificationBell L145 / NotificationsView L200) |

**両立不能な物理制約** — `--color-accent` を 1 つの値で:
- A. 「dark bg 上の text-accent text として 4.5:1 pass」 (明るい青が必要、 `#5b9eff` 以上で 4.5+)
- B. 「accent bg 上の text-white text として 4.5:1 pass」 (暗い青が必要、 `#1d4ed8` 以下で 7.0+ pass、 `#2563eb` で 5.17 pass)
両方は満たせない。 解消には accent token を **fg 用 / bg 用に分離** する design system 改修が必要 (例 `--color-accent-bg` + `--color-accent-fg-on-dark`)。

**重要** — 現状の `#3b82f6` は **どちらも fail** している (text-white 上で 3.68 / text-accent on dark bg で 3.9)。 既に AA 不合格状態のため、 design 側との擦り合わせは緊急度が高い。

**推奨進め方** (まだ未実施):

1. **Phase A — token 分離 design**: design 側と `--color-accent` を fg 用 / bg 用に分離するかを擦り合わせ。 trade-off は (a) 「accent button の見た目を Tailwind blue-700 系で固定 (暗め)」 vs (b) 「token を 2 種類に分けて使い分け」。
2. **Phase B — global token 改修**: `src/app.css` の `@theme` と `html[data-theme='light']` を改修、 全 component で `bg-accent` (button bg) と `text-accent` (link/highlight) の使い分けを統一。
3. **Phase C — spec ごとの個別調整**: 残る違反は `text-muted/80` の透明度問題等で局所改修可能、 component 単位で `text-muted` 直接配線に置換。
4. **Phase D — 8 spec の disableRules 削除**: 全 spec で color-contrast 違反 0 件を確認してから disableRules を削除。

**未対応 spec list (`disableRules` で color-contrast を skip 中)**:

- `admin.a11y.spec.ts` — accent buttons / destructive buttons (dashboard の delete confirmation 等)
- `dashboard.a11y.spec.ts` — dashboard CTA controls
- `dashboard-view.a11y.spec.ts` — accent CTA / metric cards
- `notifications.a11y.spec.ts` — notifications-read-all CTA + popover 内 text-muted / text-accent (本 issue で詳細分析済)
- `team-detail.a11y.spec.ts` — team detail and invite dialog
- `teams.a11y.spec.ts` — teams views and dialogs
- `boards-settings.a11y.spec.ts` — board settings
- `editor.a11y.spec.ts` — editor chrome (button-name / label / aria-required-children は #95-#99 で解消済、 color-contrast のみ残置)

## 進め方の SSOT

新規 fix PR を出すときは:

1. 対象 rule と test file の `TODO(cardene)` comment 行を確認
2. 当該 component に修正を入れて violation を解消
3. `disableRules` array から該当 rule を削除し、 TODO comment も同時に消す (#78 の `chore(a11y)` PR と同形式)
4. 本 backlog の 「完了済」 表に追記

`color-contrast` のような複数 spec に出現する rule は 「一度に全 spec から削除」 ではなく 「1 component / 1 spec ずつ」 順に進めて regression を局所化する。
