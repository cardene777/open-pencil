# a11y backlog

`tests/e2e/a11y/*` の `disableRules` に残っている axe violation を 1 件ずつ解消するための backlog。 fix 済 rule は `disableRules` から削除し、 同時に TODO comment も消す運用 (PR #78 と同方針)。

## 完了済 (history)

| PR | 解消した rule | 対象 |
|---|---|---|
| #76 | `button-name` (notification bell) | NotificationBell trigger に aria-label / icon に aria-hidden |
| #77 | `select-name` (board team) | BoardsView board team select に aria-label |
| #78 | TODO comment / disableRules cleanup | 上記 fix 済 rule を test 側から削除 |

## 残っている rule (次の fix 候補)

### color-contrast

design system 改修系。 accent button / destructive button / metric card / dashboard CTA の background-foreground contrast ratio を WCAG AA (4.5:1 normal text, 3:1 large text) 以上に調整する大規模 PR が必要。

対象 file (`tests/e2e/a11y/` の `disableRules` で言及あり):

- `admin.a11y.spec.ts` — `accent buttons / destructive buttons`
- `dashboard.a11y.spec.ts` — `dashboard CTA controls`
- `dashboard-view.a11y.spec.ts` — `accent CTA / metric cards`
- `notifications.a11y.spec.ts` — `notifications surfaces`
- `team-detail.a11y.spec.ts` — `team detail and invite dialog`
- `teams.a11y.spec.ts` — `teams views and dialogs`
- `boards-settings.a11y.spec.ts` — `board settings`
- `editor.a11y.spec.ts` — `editor chrome`

進め方 — まず CSS variable (`var(--color-accent)` 等) の現在値を axe report で測定し、 contrast 計算 (WCAG AA 通過に必要な調整量) を出す。 design 側と擦り合わせて変更案を確定してから PR を起こす。

### editor chrome (button-name / aria-required-children / label)

editor 全体の icon-only chrome buttons + properties panel inputs + tablist の a11y 改修。 規模が大きく、 component 単位で分けて fix する。

対象 file:

- `editor.a11y.spec.ts:20` — `aria-required-children` in the properties tablist
- `editor.a11y.spec.ts:22` — `button-name` on icon-only editor chrome controls
- `editor.a11y.spec.ts:24` — `color-contrast` in editor chrome (上記 color-contrast カテゴリ)
- `editor.a11y.spec.ts:26` — `label` on editor property inputs

進め方 — editor chrome の icon-only button を grep で列挙し、 1 PR で 5-10 件単位の `aria-label` / `aria-labelledby` を付与。 properties tablist は role / tabindex 構造の review が必要。

## 進め方の SSOT

新規 fix PR を出すときは:

1. 対象 rule と test file の `TODO(cardene)` comment 行を確認
2. 当該 component に修正を入れて violation を解消
3. `disableRules` array から該当 rule を削除し、 TODO comment も同時に消す (#78 の `chore(a11y)` PR と同形式)
4. 本 backlog の 「完了済」 表に追記

`color-contrast` のような複数 spec に出現する rule は 「一度に全 spec から削除」 ではなく 「1 component / 1 spec ずつ」 順に進めて regression を局所化する。
