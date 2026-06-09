# 13: Mobile App 全体 (multi-screen)

iOS / Android アプリの Onboarding / Auth / Core / Create flow / Settings を 1 プロンプトで生成。 公式 mobile-app reference の数値 spec (Status Bar 62 / Tab Bar 36 等) は AI が自動適用。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
全画面で公式 mobile spec が厳守される (Status Bar 62 / Wrapper 単一 stack / Tab Bar 36 radius / Tab item 26 / Icon 18 / Label 10)。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Pulse>
- 1 文の説明: <例 メンタルヘルス + 睡眠 daily check-in>
- カテゴリ: <例 ヘルスケア>
- 対象ユーザー: <例 25-40 代の knowledge worker、 燃え尽き予防>
- primary action: <例 1 分の daily mood check-in>
- platform: <iOS first (Android 後) / 両対応 / iOS のみ>

[トーン (3-5 語)]
- <例 warm minimalism / 朝の光感 / friendly>

[含める画面グループ]
- Onboarding (Splash / 3-step intro / Permissions)
- Auth (Sign up / Sign in / OTP / Password reset)
- Core (主要画面、 ↓ で詳細列挙)
- Create / Action flow (主要 action のフロー、 ↓ で step 列挙)
- Settings (Profile / Notifications / About)
- States (Empty / Loading / Error)
- Components

(↑ 不要な group は削除)

[Core 画面 (製品固有、 名前 + 主機能 1-2 文)]
- <例 Home ── 今日の check-in + 連続日数 + 週間 insight>
- <例 List (Journal) ── 全 entry filter 付き>
- <例 Detail ── entry 詳細 + 写真 + reaction>
- <例 Search ── 検索 + suggested filter>
- <例 FilterModal ── modal sheet>

[Create flow (主要 action の step 列挙)]
- <例 step 1: mood picker (6 emoji)>
- <例 step 2: contributing tags + textarea>
- <例 step 3: 保存 confirmation>

[ブランド (任意)]
- メインカラー: <例 calm blue / 任意>
- アクセント: <例 warm yellow (highlight) / 任意>

[platform 固有 (任意)]
- <例 iOS native pattern (Apple HIG 遵守)>
- <例 Material 3 (Android)>
- <例 両 OS で同じ見た目を優先>

[特有要素 (任意)]
- <例 voice input 対応>
- <例 camera 必須>
- <例 Apple Health 連携>
- <例 biometric (Face ID) 対応>
- <例 social login (Apple / Google) 両方>
- <例 dark mode 必須>

[言語]
- <default 英語、 日本語必須なら明記>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全画面の overview PNG (縦並び) と group ごと PNG と Tab Bar 単独 PNG を /tmp に保存して Read。
- 全画面 375x812 (iPhone 15 標準) で 4 列グリッド配置、 全 frame は Screen/<group>/<name>。
- Status Bar 62 px / Wrapper 単一 vertical stack / 全 Title font size 統一 /
  Tab Bar 数値 (Pill 62 / 36 radius / Tab item 26 / Icon 18 / Label 10 / letter-spacing 0.5 / uppercase) は
  ~/.claude/skills/pencil-design/references/mobile-app.md の公式値を厳守。
- One-handed reach (CTA は lower half)、 4 states (loading / empty / error / success) を first-class。
- 全コピー文 / 全カラー / フォント / radius / shadow / icon は AI 補完。
~~~

## 補足

- 修正は自然文: 「Onboarding 3 step を 2 step に短縮」「Bottom Tab Bar の中央 FAB を camera icon に」「Detail に reaction emoji の選択 modal 追加」「全画面 dark mode 版を別 page に」「Android 版 (Material 3) も別 page に」
- 公式 mobile-app reference の数値 spec は妥協なく守られる、 ユーザー側で数値を書く必要は完全にゼロ
- platform 固有の差 (iOS HIG / Material 3) は Optional で明示するとそれに従う
- biometric / Apple Health / camera 等の連携は Optional で書いた要素のみ反映 (デフォルトは標準 form のみ)
- Create flow は製品ごとに step 数 / 構造が大きく変わるので、 ユーザー記入が効く

## AI が補完する内容

- 画面サイズ 375x812 (iPhone 15 標準)
- Status Bar 62 px 全画面 (公式必須値)
- Wrapper container (公式 CRITICAL、 単一 vertical stack)
- 全 Title font size 統一 (公式必須)
- gap-based vertical spacing
- Bottom Tab Bar 数値 (公式値、 Pill 62 高 / 36 radius / Tab item 26 / Icon 18 / Label 10 / letter-spacing 0.5 / uppercase)
- One-handed reach
- 4 states (loading / empty / error / success)
- Touch target 適正
- safe area / status bar inset
- レイアウト pattern (Onboarding intro / Auth card / Home dashboard / List / Detail / Settings sectioned)
- Create flow standard pattern (大きな primary button、 step indicator)
- icon naming (lucide / SF Symbols)
- 全コピー文 / 全カラー / フォント / radius / shadow / icon
