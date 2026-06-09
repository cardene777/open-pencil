# 10: SaaS Application 全体 (full multi-screen)

SaaS web アプリの **全画面** (auth flow + 主要画面 + settings + empty/error 状態) を 1 プロンプトで一括生成するテンプレ。

## 含まれる画面 (16 画面)

| グループ | 画面 |
|---|---|
| Marketing (3) | Landing / Pricing / Sign up CTA |
| Auth (4) | Sign up / Sign in / Forgot password / Email verify |
| Onboarding (3) | Welcome / Workspace setup / Invite team |
| Core (4) | Dashboard / Item list / Item detail / Item create |
| Settings (4) | Profile / Workspace / Billing / Members |
| States (4) | Empty / Loading / Error / 404 |

合計 **22 画面** + 共通 component (header / sidebar / button / card / form / modal / toast)。

## 最強サンプル (そのままコピペで使える)

```
/pencil-design

design/saas-fullapp.fig + design/saas-fullapp.pen に書き出して。

【プロジェクト】
- 製品: Lumen — チーム向け非同期ビデオメッセージング SaaS
- ターゲット: 50-500 名規模のリモート企業の PM / Dev / Designer
- 解決する課題: Slack の長文化と Zoom 疲れの中間、 5 分の動画で文脈共有
- ビジネスモデル: Free (3 video/月) → Pro ($12/seat) → Team ($24/seat、 SSO + Analytics)
- primary action: 録画開始 + 送信

【全体トーン (全画面共通の design system)】
- 美学: friendly minimalism、 余白多い、 顔写真重視
- bg: page #FAFAF9 (warm grey)、 surface white、 sidebar #1C1B1F (almost black)
- accent: #5B41F4 (vibrant purple)、 sub-accent #FFB547 (warm yellow、 highlight 用)
- text: primary #1C1B1F、 secondary #6B7280、 tertiary #A1A5AD、 link #5B41F4
- success #10B981 / warning #F59E0B / error #EF4444
- フォント: heading "Inter" Bold、 body "Inter" Regular、 monoは "JetBrains Mono"
- radius: surface 12 / button 10 / input 10 / pill 999
- shadow: card #0000000A blur 12 offset y 2 / modal #00000014 blur 32 offset y 8
- spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96

【全体レイアウト規約】
- desktop 1440 幅、 mobile breakpoint も別画面で作成
- 全 dashboard 系: Sidebar (240) + Main (fill)
- 全 settings 系: Sidebar + sub-nav tab + main 中央 max 880
- 全 auth 系: 全画面中央寄せ card (max 440)、 bg #FAFAF9 + 装飾要素
- 全 marketing 系: 1440 幅、 fit_content 縦

==================================================================
【ページ配置】
==================================================================

各画面は document 内に 1440 幅で **横並びグリッド** で配置 (4 列):
  - x = 0, 1640, 3280, 4920 (gap 200)
  - y = 0 (marketing 行), 1000 (auth 行), 2000 (onboarding 行), 3000 (core 行), 4000 (settings 行), 5000 (states 行)
- 各 frame の name は "Screen/<group>/<name>" 形式
- 全 frame に placeholder: false (完成状態)

==================================================================
【グループ 1: Marketing (y=0 行)】
==================================================================

▼ Screen/Marketing/Landing (x=0, y=0、 1440 × 3200)
- ヘッダー 80: logo "Lumen" + nav (Product / Customers / Pricing / Login) + primary CTA "Start free"
- Hero (720): bg #1C1B1F、 大型 headline 96 "Show, don't type." + sub 22 "Async video for teams that ship faster." + 横並び CTA 2 (primary "Record your first" / outline "Watch demo")
- Trust logos 120: 5 ロゴ placeholder + eyebrow "Used by teams at"
- Problem (480): split 50/50 "Slack threads burn 4hr/week" + bullet 3
- How it works (560): 3 step horizontal cards 各 step icon + title + desc
- Core feature (3 セクション、 各 540): スクリーンショット placeholder + 文字 reverse 交互
- Testimonial (480): 3 quote + avatar + name + company
- Pricing (640): 3 tier 横並び (Free / Pro highlighted / Team) + 機能チェック list
- FAQ (440): 5 件 accordion
- Final CTA (320): bg accent purple、 white 大型 title + CTA
- Footer (280): 4 col link + copyright

▼ Screen/Marketing/Pricing (x=1640, y=0、 1440 × 2400)
- header 80 + same nav
- hero (320): "Pricing that scales with your team." + sub
- toggle 80: monthly / annual (yearly に 20% off badge)
- 3 tier grid (760): 各 card に price 大型 / 機能 list 8 件 / CTA、 Pro card は accent border + "Most popular" badge top
- feature comparison table (720): 列 Free / Pro / Team、 行 24 機能、 ✓ / × / 制限値
- FAQ (320): pricing 限定 4 件
- Footer

▼ Screen/Marketing/SignupCTA (x=3280, y=0、 1440 × 800)
- 大型 split: 左 "Try Lumen free for 14 days" + bullet "No card" "Unlimited recordings" "Cancel anytime" + form email 1 input + CTA、 右 product mockup

==================================================================
【グループ 2: Auth (y=1000 行)】 全 card max 440 中央寄せ
==================================================================

▼ Screen/Auth/SignUp (x=0, y=1000、 1440 × 900)
- bg #FAFAF9 + 左上に小 logo (link to landing)
- center card (440 幅 padding 40 radius 16 bg white shadow):
  - title 28 "Create your account" + sub 14 secondary "Start sending videos in 60 sec"
  - SSO buttons 縦 3: Google (white bg、 outline、 logo + label "Continue with Google") / Apple (黒 bg、 white) / SSO (outline、 "SAML SSO")
  - divider "or with email"
  - form 4 field: Full name / Work email / Password (show toggle) / Workspace name
  - checkbox "I agree to Terms and Privacy"
  - primary button full width "Create account"
  - footer text "Already have an account? Sign in" (link)
- 右下に decoration: 半透明 purple gradient blob (装飾、 width 320)

▼ Screen/Auth/SignIn (x=1640, y=1000、 同サイズ)
- 同様の card 構造
- title "Welcome back"
- SSO 3 件 + divider + email/password form
- "Forgot password?" link 右寄せ
- "Stay signed in" checkbox
- primary "Sign in"
- footer "Don't have an account? Sign up"

▼ Screen/Auth/ForgotPassword (x=3280, y=1000)
- 中央 card 440
- icon top (key icon 48 accent)
- title "Reset your password" + sub "Enter your email and we'll send you a reset link"
- email 1 field
- primary "Send reset link"
- link "Back to sign in"

▼ Screen/Auth/EmailVerify (x=4920, y=1000)
- 中央 card
- 大きな ✉ icon 64 accent
- title "Check your email"
- sub "We sent a verification link to *jane@acme.com*. Click the link to continue."
- 補助 link "Resend email" "Use a different email" + countdown "Resend in 0:42"
- bottom card 別: "Wrong email? Sign in with another account"

==================================================================
【グループ 3: Onboarding (y=2000 行)】 progress 3 step 共通
==================================================================

▼ Screen/Onboarding/Welcome (x=0, y=2000、 1440 × 900)
- top progress: 3 step dot "Welcome / Workspace / Invite" 1 がアクティブ
- center wide card (max 720)
- title 40 "Welcome to Lumen, Jane 👋"
- sub "Let's get your workspace ready in 90 seconds."
- 縦 3 option (各 card):
  - "Record your first video" (primary、 アイコン red dot + "RECORD")
  - "Watch 2-min intro" (secondary)
  - "Take the product tour"
- skip link 下 "Skip — I'll explore on my own"

▼ Screen/Onboarding/WorkspaceSetup (x=1640, y=2000)
- progress 2/3 active
- center card max 560
- title "Set up your workspace"
- workspace logo upload (96 円、 dashed border、 "Click to upload" + "PNG, JPG max 2MB")
- form: Workspace name input + Workspace URL (prefix "lumen.app/" + input)
- industry select (Marketing / Sales / Engineering / Product / Design / Other)
- team size radio buttons 5 件 (横並び pill: "Just me" "2-10" "11-50" "51-200" "200+")
- primary "Continue"

▼ Screen/Onboarding/InviteTeam (x=3280, y=2000)
- progress 3/3
- center card max 560
- title "Invite your team"
- sub "Lumen is better with friends. Add up to 5 teammates."
- 5 email input fields (各 high 48、 placeholder "name@company.com" + small "Remove" icon)
- 下に "+ Add another"
- role select per row (Admin / Member / Guest)
- 大きな primary "Send invites"
- secondary "Skip for now"
- 下に share link card "Or share an invite link" + copyable URL + copy button

==================================================================
【グループ 4: Core (y=3000 行)】 Sidebar + Main pattern
==================================================================

▼ Screen/Core/Dashboard (x=0, y=3000、 1440 × 1000)
- Sidebar 240 (dark #1C1B1F、 padding 24 16、 gap 4):
  - top logo + workspace switcher (avatar + "Acme Inc." + chevron)
  - nav (各 40 高 padding 12 radius 8):
    - Inbox (icon、 badge "5")
    - Library (active、 accent bg)
    - Recordings
    - Members
    - Analytics
  - section "WORKSPACES":
    - Acme (current、 checkmark)
    - Side Project
  - section "SETTINGS":
    - Settings
    - Help & feedback
  - bottom: user profile card (avatar + name + role)
- TopBar 64 white border-bottom: breadcrumb "Library / All" + search center + (新規録画 red dot button + notification + avatar) 右
- Main padding 32:
  - Page header: title "Library" + sub "All your recordings" + 右に sort dropdown + filter button + primary "New recording"
  - Quick stats 4 KPI cards 横: "127 videos" / "1,438 views" / "82% completion" / "12 comments today"
  - section "Pinned" (上 box): 3 card 横 (各 280x180、 thumbnail + duration overlay + title + views)
  - section "Recent" (下 grid 4x2): 8 card 同様 (各 280x180)
  - 各 card hover state: 影 + play button overlay

▼ Screen/Core/ItemList (x=1640, y=3000、 1440 × 1000)
- Sidebar 同じ
- Main: 一覧 table view
- header: title "All recordings" + count "127" + filter chips (date / owner / tag / status) + 右 "Switch to grid" toggle
- table 行 12:
  - 列: thumbnail (60x40) / title / owner avatar+name / duration / views / created / actions (3 dots)
  - row hover bg
  - sort 列 indicator on "Created"
- pagination 下 "Page 1 of 11" + prev/next + per-page select

▼ Screen/Core/ItemDetail (x=3280, y=3000、 1440 × 1000)
- Sidebar
- Main 3 col: 左 navigation (back / metadata) 240 + 中央 video player 主役 720 + 右 sidebar (comments / chapters / transcript) 320
- 中央 video: aspect 16:9 black bg (placeholder)、 下に title 32 Bold + owner + date + 視聴回数
- video controls bar 64: play / progress bar (gradient accent) / time / settings / fullscreen
- 下に reaction row: ❤ 24 / 👍 18 / 🎉 5 / 💡 3 (各 chip pill bg #F3F4F6)
- comment section: input + comment list 4 件 (avatar + name + time + text + reply 数)
- 右 sidebar tabs: Comments (active) / Chapters / Transcript
  - Comments: 縦 list、 timestamp jump 可能
  - Chapters: 5 件 (各 thumbnail + start time + title)
  - Transcript: 縦 scroll、 timestamp highlighted

▼ Screen/Core/ItemCreate (x=4920, y=3000、 1440 × 1000)
- modal full-screen-takeover (背景半透明)
- 中央 card (max 720)
- header: title "New recording" + close X
- step 1: 録画ソース選択 (3 card 横並び):
  - "Screen + Camera" (selected、 ring 2 accent)
  - "Screen only"
  - "Camera only"
- camera preview area (4:3 placeholder + face placeholder + mic 波形 visualization)
- audio source dropdown (MacBook Pro Microphone)
- 設定 toggles: "Auto-generate transcript" / "Allow comments" / "Public link" (各 horizontal switch + label + sub explain)
- 大きな button bottom: "Start recording" (赤い丸 + label、 padding 18 32 radius 12)

==================================================================
【グループ 5: Settings (y=4000 行)】 Sidebar + sub-nav + content
==================================================================

▼ Screen/Settings/Profile (x=0, y=4000、 1440 × 1000)
- 既存 dashboard sidebar (Settings active)
- main: page header + sub-nav 5 tab (Profile active / Account / Notifications / Security / API)
- 中央 max 880:
  - Profile section card: avatar 96 + upload + name / email (disabled) / username / bio / company / time zone
  - Visibility radio 3 件
- "Save changes" primary 右上 page header
- Danger zone は別 tab "Account"

▼ Screen/Settings/Workspace (x=1640, y=4000)
- sub-nav "Workspace" active
- 中央 max 880:
  - Workspace identity: logo upload + name + url (lumen.app/{slug}) + custom domain (Pro feature lock icon)
  - Branding: primary color picker + secondary color + custom email header upload
  - Integrations: 4 row (Slack / Notion / Linear / Loom): logo + name + status (Connected/Connect) + action button
  - Default permissions: radio (Public / Workspace / Private)

▼ Screen/Settings/Billing (x=3280, y=4000)
- 中央 max 880:
  - Current plan card (大): "Pro plan" + "$12 × 8 seats = $96/mo" + next billing date + "Upgrade to Team" cta
  - Usage card: graph + "1,438 views this month" + "Unlimited"
  - Payment method card: Visa ****1234 + Expiry + "Update card" link + Billing email
  - Invoices table: 6 row (Date / Amount / Status badge / Download icon)
  - Tax info section: VAT / Address form

▼ Screen/Settings/Members (x=4920, y=4000)
- 中央 max 880:
  - Header: "Members (8)" + 右 "Invite members" primary
  - Filter chips (Role / Status)
  - members table 8 row: avatar + name + email + role (badge) + last active + actions menu
  - Pending invitations section (2 row、 strikethrough resend / revoke)
  - Roles & permissions link → modal

==================================================================
【グループ 6: States (y=5000 行)】
==================================================================

▼ Screen/States/Empty (x=0, y=5000、 1440 × 800)
- Sidebar + main
- 中央寄せ illustration (大きな circular icon 160 accent 20% bg + main icon 80 white)
- title 28 "No recordings yet"
- sub 16 "Create your first video to share knowledge with your team."
- primary "New recording" + secondary "Watch demo"

▼ Screen/States/Loading (x=1640, y=5000)
- Sidebar + main
- 中央: spinner (animated を表現するため radial gradient circular + small accent dot)
- title "Loading your library..."
- sub 14 secondary "This usually takes a moment"

▼ Screen/States/Error (x=3280, y=5000)
- Sidebar + main
- 中央 illustration: ⚠ icon 80 red 10% bg + 主 icon red
- title 28 "Something went wrong"
- sub "We couldn't load your videos. The team has been notified."
- primary "Try again" + secondary "Contact support"
- error id mono 11px tertiary "Error ID: ERR-2026-06-09-1138"

▼ Screen/States/NotFound (x=4920, y=5000)
- Sidebar (still active) + main
- 中央 big "404" Bold 200 outline only (border、 文字内透明)
- title "We can't find that recording"
- sub "It may have been moved or deleted."
- primary "Back to library" + secondary "Report issue"

==================================================================
【共通 component (再利用、 別の x=8000 領域に component frame として配置)】
==================================================================

▼ x=8000, y=0: Components frame (1200x4000 padding 64 layout vertical gap 48)
1. Button system (Primary / Secondary / Outline / Ghost / Destructive + small/medium/large、 各 active+hover+disabled、 計 15 variants)
2. Input system (default / focus / error / disabled、 各 label + helper text)
3. Card 5 variant
4. Badge 5 variant (default / success / warning / error / info / Pro)
5. Modal template
6. Toast template (success / error / info)
7. Avatar (sizes 24/32/40/56/96 + with status dot)
8. Dropdown menu
9. Table row template
10. Empty state template

==================================================================
【公式 reference の遵守 (重要)】
==================================================================

- web-app reference の 16 原則 を全 dashboard 系で遵守
  - 特に #1 Purpose First / #2 Dominant Region / #6 System Status / #7 Action Hierarchy
- landing-page reference の Hero / Anti-slop / Imagery hierarchy を marketing で遵守
- design-system reference の spacing table (24-32 / 16 / 12 / [10,16])、 button hierarchy、 token を全画面で適用
- general-rules の placeholder / 25 op cap / text fill / image type なし / fit_content vs fill_container

【Anti-pattern (絶対ダメ)】
- 同一画面に competing focal point
- per-section horizontal padding (wrapper で管理)
- flat solid background (Anti-Slop)
- 0 width / 0 height
- card pattern boilerplate (せめて 1 件は asymmetric)
- 既存 screen の上に重ねて配置 (必ず空白領域)

【実装戦略 (skill が守るべき手順)】
1. 全 22 画面の placeholder frame を最初に pre-create (1 batch_design call で名前 + 座標 + size + placeholder:true のみ)
2. 共通 component (button / input / card / badge) を先に作成 (再利用、 component frame として x=8000)
3. グループ単位 (Marketing 3 / Auth 4 / ...) で順次中身を実装、 各 batch_design 25 op cap
4. 各画面完成ごとに placeholder: false に
5. グループ完成ごとに section PNG export して目視確認
6. 全画面完成後に overview PNG (scale 0.5) export

【完了時 (絶対)】
- 全 22 画面 + components frame の placeholder: false 化
- 各画面の section PNG → /tmp/lumen-{group}-{name}.png
- 全体 overview PNG (1440 x 6000 scale 0.4) → /tmp/lumen-overview.png
- design system component の PNG → /tmp/lumen-components.png
- .fig + .pen 両方
- 各画面の text fill 漏れチェック
- 0 width / 0 height チェック
- 完了報告に画面 22 件の状態 (PASS / 要修正) を一覧
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen

【プロジェクト】
- 製品: <name>
- カテゴリ: <SaaS / Fintech / E-commerce / etc>
- ターゲット: <persona>
- primary action: <X>

【全体トーン】
- 美学: <方向性>
- bg / surface / accent: <hex>
- フォント: <family>
- radius / spacing scale

【含める画面 (22 推奨)】
- Marketing 3 (Landing / Pricing / SignupCTA)
- Auth 4 (SignUp / SignIn / ForgotPassword / EmailVerify)
- Onboarding 3 (Welcome / WorkspaceSetup / InviteTeam)
- Core 4 (Dashboard / ItemList / ItemDetail / ItemCreate)
- Settings 4 (Profile / Workspace / Billing / Members)
- States 4 (Empty / Loading / Error / NotFound)
- + Components frame

【配置】4 列グリッド、 各 1440 幅、 x=0/1640/3280/4920、 y は group ごと

【各画面詳細】
- Marketing/Landing: <要素列挙>
- Auth/SignUp: <要素>
- Core/Dashboard: <要素>
- ... (全画面分)

【完了時】22 画面 placeholder false、 group ごと PNG、 overview PNG、 .fig + .pen
```

## 使い方のコツ

| Tip | 内容 |
|---|---|
| 段階分割 | 22 画面 1 発は重いので、 1 度に 6-8 画面で分割実行 (Marketing → Auth → Core → Settings → States の順) も可 |
| 既存画面のリビルド | 「Auth セクションだけ作り直して」「Dashboard だけ修正」も可、 group 単位指示 |
| Mobile responsive 版 | "全画面の 375 幅 mobile 版も別の y=10000 行に追加" を末尾に追記 |
| Dark mode 版 | "全画面の dark mode 版を別 page に追加" を追記 |
| 翻訳版 | "全画面の日本語版を別 page に追加" を追記 |
