# 05: Settings 画面プロンプトテンプレ

アプリ内の設定 / プロフィール / アカウント管理画面用。 公式 design-system reference の Card slot / Form layout / Button hierarchy に従う。

## 最強サンプル

```
/pencil-design

design/settings-account.fig + .pen に書き出して。

【タイプ】Web App Settings (アカウント設定)

【製品】
- 名前: Beacon Analytics (上記 dashboard と同じ製品)
- このページ目的: 「ユーザーが自分の情報を 30 秒で更新できる」
- primary purpose (公式 #1): プロフィール編集と保存

【画面サイズ】1440 × 900 (デスクトップ)、 ただし content 中央 max 880px

【トーン・美学】(dashboard と統一)
- bg #FAFBFD / surface white / accent #4F46E5
- text primary #1A1F36 / secondary #4B5563 / tertiary #9CA3AF
- danger #EF4444 / success #10B981
- フォント Inter (全体)
- card radius 12 / button radius 8 / input radius 8
- subtle shadow

【レイアウト】

横方向: 左 sidebar (240) + main content (fill_container)
main 内: 中央 max 880px 寄せ、 上 padding 48 横 32

main 縦構成:
1. Page Header (高さ 80)
2. Settings sub-nav (横並び tab)
3. Profile Section Card
4. Account Settings Section Card
5. Security Section Card
6. Danger Zone Card

【Sidebar】(dashboard と同じ、 ただし "Settings" が active)

【Page Header (高さ 80)】
- 左: title "Settings" (24px Bold) + sub "Manage your account and preferences" (14px secondary)
- 右: 「Save changes」 primary button (filled #4F46E5、 disabled 状態で grey、 enabled 時 highlighted)

【Settings sub-nav】(横並び tab、 高さ 48、 border-bottom 1 #E5E7EB)
- 5 tab、 active state は accent color underline + bold
- "Profile" (active) / "Account" / "Security" / "Notifications" / "Billing"

【3. Profile Section (Card)】
- header slot: title "Profile" (16px Bold) + sub "This information will be displayed publicly" (13px secondary)
- content slot (gap 20、 padding 24):

  3.1 Avatar row (横並び、 alignItems center、 gap 24)
  - 左: avatar 96x96 円、 bg gradient + initials "JD" (32px Bold white center)
  - 右 vertical:
    - "Upload new photo" secondary button (outline、 padding 8 16、 radius 8)
    - 下に "JPG, GIF or PNG. Max 2MB." (12px tertiary)

  3.2 Form fields (vertical layout、 gap 16)
  - row 1 (horizontal、 gap 16): "First name" input + "Last name" input (各 width fill_container)
  - "Email address" input (full width、 disabled bg #F3F4F6) + 下に "Email cannot be changed. Contact support." (12px tertiary)
  - "Username" input + 下に "beacon.app/u/" prefix がない場合は文字内に表示
  - "Bio" textarea (高さ 96、 placeholder "Tell us about yourself...")
  - "Company" + "Job title" 2 col 横並び
  - "Time zone" select (placeholder "Asia/Tokyo")

  3.3 Visibility section (gap 12)
  - section title "Profile visibility" (14px Bold)
  - radio group 3 件 (各 高さ auto、 padding 12、 radius 8、 hover bg #F9FAFB):
    - "Public — visible to everyone"
    - "Team only — visible to your organization" (selected)
    - "Private — only you can see this"

【4. Account Settings Section (Card)】
- header: "Account preferences" + sub
- content fields:
  - Language (select、 default "English (US)")
  - Date format (select、 "MM/DD/YYYY")
  - Number format (radio: "1,234.56" / "1.234,56" / "1 234,56")
  - Theme (radio with preview): "Light" / "Dark" / "System" (大型 thumbnail 96x60 各、 横並び、 selected ring 2 accent)

【5. Security Section (Card)】
- header: "Security" + sub "Protect your account and connected services"
- content (gap 16):

  5.1 Password row (horizontal、 space_between)
  - 左: vertical (gap 4)
    - "Password" (14px Bold)
    - "Last changed 2 weeks ago" (13px secondary)
  - 右: "Change password" secondary button

  5.2 2FA row (同上構造)
  - "Two-factor authentication" + "Authenticator app — active" + success badge
  - "Manage" button

  5.3 Active sessions row
  - "Active sessions" + "3 devices currently signed in"
  - "View all" link button

  5.4 API tokens row
  - "Personal access tokens" + "Used for CLI and integrations"
  - "Create new token" primary outline button

【6. Danger Zone Card】(border 1 #FEE2E2 (red-100)、 bg #FEF2F2 (red-50)、 padding 24、 radius 12)
- header: "Danger zone" (16px Bold #B91C1C (red-700)) + sub "These actions are permanent and cannot be undone." (13px #B91C1C 80%)
- gap 16:
  - "Export all data" row + "Request export" outline red button
  - "Transfer ownership" row + "Transfer" outline red button
  - "Delete account" row + "Delete account..." filled red button (#DC2626)

【公式 design-system reference の遵守】
- 13. Spacing reference table 通り (page padding 32 / card padding 24 / form gap 16 / button group gap 12)
- 14. Button hierarchy:
  - "Save changes" (primary、 page header 右上)
  - "Change password" 等 (secondary outline)
  - "Delete account" (destructive)
- 15. Design Tokens: 全 color と radius を token (`$--accent` 等) で binding (今回 inkly では hex 直書きで OK、 ただし concept として token 思想を反映)

【公式 16 原則の遵守 (web-app reference)】
- #1 Purpose First → 「プロフィール編集 + 保存」が dominant
- #6 System Status Visibility → "Last changed 2 weeks ago" / "3 devices signed in" / "Authenticator app — active" 等で system state を常時可視化
- #7 Action Hierarchy → primary 1 つ (Save) / secondary 多数 / destructive 別領域 (Danger Zone)
- #14 Constraint Over Decoration → 装飾 0、 全要素が action / info / hierarchy を支える

【完了時】
- 全体 PNG → /tmp/settings-account.png
- Danger Zone 単独 → /tmp/sa-danger.png (red 系の境界明確化確認)
- .fig + .pen 両方
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【タイプ】Web App Settings
【製品】<name> ── 既存 design system <他画面> と統一
【目的】<画面 primary purpose>
【サイズ】1440 x fit_content、 main content max 880 中央寄せ
【トーン】既存と同じ <accent #YYY、 token 体系>
【sidebar】既存と同じ、 Settings が active
【page header】title "Settings" + sub + primary "Save changes"
【sub-nav】tab 5 件 (<list>)
【セクション (上→下)】
  - Profile (avatar + form 6-8 field + visibility radio)
  - Account preferences (language / format / theme picker)
  - Security (password / 2FA / sessions / API token、 各 row 構造)
  - Danger Zone (red border + 3 destructive action)
【数値】spacing reference table 通り、 card padding 24 / form gap 16
【完了時】.fig + .pen + section PNG
```
