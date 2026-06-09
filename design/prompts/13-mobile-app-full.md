# 13: Mobile App 全体 (multi-screen)

iOS / Android アプリの全画面 (Onboarding / Auth / Core / Create / Settings) を 1 プロンプトで一括生成。 公式 mobile-app reference の数値 spec (Status Bar 62 / Tab Bar 36 等) は AI が自動適用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- カテゴリ:
- 対象ユーザー:
- primary action (このアプリで最も頻繁な操作、 1 つ):
- platform (iOS / Android / 両対応):

【トーン】(3-5 語):

【含める画面グループ】
- [ ] Onboarding (Splash / 3-step intro / Permissions)
- [ ] Auth (Sign up / Sign in / OTP / Password reset)
- [ ] Core (主要画面、 ↓ で詳細)
- [ ] Create / Action flow (主要 action のフロー)
- [ ] Settings (Profile / Notifications / About)
- [ ] States (Empty / Loading / Error)
- [ ] Components

【Core 画面】(製品固有、 名前 + 主機能 1-2 文)
- 例 Home ── 今日のサマリ + quick action
- 例 List ── 全件 + filter
- 例 Detail ── 個別レコード
- 例 Search ── 検索 UI

【Create flow】(主要 action の step 列挙)
- 例 step 1: 内容選択
- 例 step 2: 詳細入力
- 例 step 3: 確認 / 送信
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント:

【platform 固有】
- 「iOS native pattern (Apple HIG 遵守)」
- 「Material 3 (Android)」
- 「両 OS で同じ見た目を優先」

【特有要素】
- 「voice input 対応」「camera 必須」「Apple Health 連携」「biometric (Face ID)」
- 「social login (Apple / Google) 両方」
- 「dark mode 必須」

【言語】
- (default 英語、 日本語必須なら明記)
```

## AI が公式 mobile-app reference から自動補完

- 画面サイズ 375x812 (iPhone 15 標準)
- Status Bar 62 px 全画面 (公式必須値)
- Wrapper container (公式 CRITICAL、 単一 vertical stack)
- 全 Title font size 統一 (公式必須)
- gap-based vertical spacing (公式必須、 margin 不使用)
- Bottom Tab Bar 数値 (Pill 62高 / 36 radius / Tab item 26 radius / Icon 18 / Label 10 / letter-spacing 0.5 / uppercase)
- One-handed reach
- 4 states (loading / empty / error / success) を first-class
- Touch target 適正
- safe area / status bar inset
- 全画面のレイアウト pattern (Onboarding intro / Auth card / Home dashboard / List / Detail / Settings sectioned)
- Create flow standard pattern (大きな primary button、 step indicator)
- icon naming (lucide / SF Symbols)
- 全コピー文 / 全カラー / フォント / radius / shadow / icon

## サンプル

```
/pencil-design

【出力】design/mobile-pulse.fig + .pen

【製品】
- 名前と 1 文の説明: Pulse ── メンタルヘルス + 睡眠 daily check-in
- カテゴリ: ヘルスケア
- 対象ユーザー: 25-40 代の knowledge worker、 燃え尽き予防
- primary action: 1 分の daily mood check-in
- platform: iOS first (Android 後)

【トーン】
- warm minimalism / 朝の光感 / friendly

【含める画面グループ】
- [x] Onboarding
- [x] Auth
- [x] Core
- [x] Create
- [x] Settings
- [x] States
- [x] Components

【Core 画面】
- Home ── 今日の check-in + 連続日数 + 週間 insight
- List (Journal) ── 全 entry filter 付き
- Detail ── entry 詳細 + 写真 + reaction
- Search ── 検索 + suggested filter
- FilterModal ── modal sheet

【Create flow】
- step 1: mood picker (6 emoji)
- step 2: contributing tags (work / family etc) + textarea
- step 3: 保存 confirmation

【ブランド】
- メインカラー: calm blue
- アクセント: warm yellow (highlight)

【特有要素】
- biometric (Face ID) 対応
- Apple Health 連携 (Optional)
```

## さらに短い指示

```
/pencil-design

design/mobile-pulse.fig + .pen。
Pulse ── メンタルヘルス + 睡眠 daily check-in、 knowledge worker 向け。
warm minimalism、 calm blue + warm yellow。
iOS、 Onboarding / Auth / Core / Create flow / Settings 全部。
Core は Home / Journal / Detail / Search / FilterModal の 5 画面。
Create flow は mood → tags → 保存 の 3 step。
Face ID 対応。
```

## 修正指示

```
Onboarding 3 step を 2 step に短縮
Bottom Tab Bar の中央 FAB を camera icon に
Detail に reaction emoji の選択 modal 追加
全画面 dark mode 版を別 page に
Android 版 (Material 3) も別 page に
```

## ヒント

- 公式 mobile-app reference の **数値 spec は妥協なく守られる** ので、 ユーザー側で数値を書く必要は完全にゼロ
- platform 固有の差 (iOS HIG / Material 3) は Optional で明示するとそれに従う
- biometric / Apple Health / camera 等の連携は Optional で **書いた要素のみ** 反映 (デフォルトは標準 form のみ)
- Create flow は主要 action のフローなので、 製品ごとに step 数 / 構造が大きく変わる、 ユーザー記入が効く
