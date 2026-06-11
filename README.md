# Inkly

オープンソースのデザインエディタ。 `.fig` と `.pen` のデザインファイルを直接開き、 AI を内蔵し、 ヘッドレス Vue SDK でカスタムエディタを組める programmable toolkit として動く。

> **ステータス** 活発に開発中。 production 利用はまだ推奨しない。
>
> **注意** 同名の OSS が他にもある ([Inkly by ZSeven-W](https://github.com/ZSeven-W/inkly)、 AI-native な design-to-code workflow に特化)。 本プロジェクトは Figma 互換のビジュアルデザインとリアルタイムコラボレーションに特化している。

**[ブラウザで試す →](https://app.inkly.dev/demo)** · [ダウンロード](https://github.com/cardene777/open-pencil/releases/latest) · [ドキュメント](https://inkly.dev) · [llms.txt](https://inkly.dev/llms.txt)

![Inkly](packages/docs/public/screenshot.png)

## デモ

LLM 生成デザインをそのままブラウザのエディタで開き、 インラインで編集して、 Slack 経由でチームに共有する。 すべてブラウザの中だけで完結する。

![Inkly デモ — .fig を開く / 編集 / 共有 / 配布](packages/docs/public/promo.gif)

## インストール

**macOS (Homebrew):**

```sh
brew install inkly
```

または [releases ページ](https://github.com/cardene777/open-pencil/releases/latest) からダウンロードする。 インストール不要で動かしたいなら [web 版](https://app.inkly.dev) を使う。

## できること

- **`.fig` / `.pen` を開く** — Figma ファイルをそのままネイティブに読み書き、 アプリ / OS のファイルブラウザから Pencil ドキュメントを開く、 ノードをアプリ間でコピー & ペースト
- **AI でデザイン生成** — チャットに作りたいものを書くだけで、 90 以上の tool がノードを作成 / 編集する。 OpenRouter / Anthropic / OpenAI / Google AI / Z.ai / MiniMax または互換エンドポイントを接続できる
- **完全にプログラマブル** — ヘッドレス CLI、 XPath クエリ、 `eval` 経由の Figma Plugin API、 AI エージェント向け MCP サーバ、 Claude Code / Codex / Gemini CLI 向けのデスクトップエージェント連携
- **Lint / 変換 / トークン抽出** — ドキュメントを inspect、 命名 / レイアウト / アクセシビリティの lint、 対応フォーマット間での変換、 色 / タイポ / 余白 / クラスタの解析、 デザイントークン抽出
- **コンポーネントとバリアント** — 再利用可能なコンポーネント作成、 バリアントをセットにまとめる、 ローカルアセットを instance として挿入、 inspector から variant 切替
- **デザイン → コード** — 選択範囲を JSX / Tailwind として export、 トークン生成物の出力、 コンポーネント指向のコードワークフローへのマッピング
- **カスタムエディタ向け Vue SDK** — ヘッドレスのコンポーネント / composable で Inkly を他アプリに埋め込んだり、 ワークフロー特化の編集 UI を組める。 [SDK ドキュメント →](https://inkly.dev/programmable/sdk/)
- **リアルタイムコラボレーション** — WebRTC による P2P、 サーバ不要 / アカウント不要。 カーソル / プレゼンス / フォローモード
- **サインイン済みユーザー向けの通知 inbox** — ボード招待 / チーム招待 / メンションの未読バッジと通知センター
- **Auto layout と CSS Grid** — Yoga WASM 経由の flex / grid レイアウト、 gap / padding / 整列 / track size をサポート
- **~7 MB のデスクトップアプリ** — Tauri v2 で macOS / Windows / Linux、 ブラウザでは PWA としても動く

## CLI

```sh
npm install -g @inkly/cli
# または: bun add -g @inkly/cli
```

### デザインファイルを inspect

エディタを開かずに、 ノードツリーをたどったり、 名前 / 型で検索したり、 プロパティを掘ったりできる。

```sh
inkly tree design.fig
inkly find design.pen --type TEXT
inkly node design.fig --id 1:23
inkly info design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

### XPath でクエリ

XPath セレクタで、 型 / 属性 / 構造からノードを探せる。

```sh
inkly query design.fig "//FRAME"                              # 全フレーム
inkly query design.fig "//FRAME[@width < 300]"                # 300px 未満のフレーム
inkly query design.fig "//TEXT[contains(@name, 'Button')]"     # 名前に 'Button' を含むテキスト
inkly query design.fig "//*[@cornerRadius > 0]"               # 角丸が付いているノード
inkly query design.fig "//SECTION//TEXT"                       # セクションの中のテキスト
```

### エクスポート

PNG / JPG / WEBP / SVG / `.fig` / JSX へレンダリングできる。 選択範囲やページを `.fig` として export したり、 ドキュメント全体をフォーマット間で変換することも可能。

```sh
inkly export design.fig                           # PNG
inkly export design.fig -f jpg -s 2 -q 90        # JPG、 2x、 品質 90
inkly export design.fig -f fig --page "Page 1"   # ページを .fig として export
inkly export design.fig -f jsx --style tailwind   # Tailwind JSX
inkly convert design.pen output.fig               # ドキュメントフォーマット間の変換
```

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

### デザインファイルを lint

命名 / レイアウト / 構造 / アクセシビリティの問題を、 ターミナルから検出できる。

```sh
inkly lint design.fig
inkly lint design.pen --preset strict
inkly lint design.fig --rule color-contrast
inkly lint design.fig --list-rules
```

### 解析とデザイントークン抽出

デザインシステム全体をターミナルから監査できる。 不整合を見つけ、 実際のパレットを抽出し、 切り出し候補のコンポーネントを発見する。

```sh
inkly analyze colors design.fig
inkly analyze typography design.fig
inkly analyze spacing design.fig
inkly analyze clusters design.fig
inkly variables design.fig
```

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×

3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

### Figma Plugin API でスクリプト

`eval` で Figma Plugin API がそのまま使える。 ファイルを編集して書き戻すこともできる。

```sh
inkly eval design.fig -c "figma.currentPage.children.length"
inkly eval design.fig -c "figma.currentPage.selection.forEach(n => n.opacity = 0.5)" -w
```

### 起動中のアプリを操作

デスクトップアプリが起動しているときは、 ファイル引数を省略すると CLI が RPC 経由で接続し、 ライブのキャンバスを操作する。 自動化スクリプト / CI パイプライン / エディタとやり取りする AI エージェントから使うと便利。

```sh
inkly tree                               # ライブドキュメントを inspect
inkly export -f png                      # 現在のキャンバスをスクリーンショット
inkly eval -c "figma.currentPage.name"   # エディタにクエリ
```

すべてのコマンドは `--json` で機械可読な出力を返せる。

## AI と MCP

### 組み込みチャット

<kbd>⌘</kbd><kbd>J</kbd> で AI アシスタントを開ける。 100 以上の tool が、 形状作成 / 塗り・線の設定 / auto layout 管理 / コンポーネントと変数の操作 / ブーリアン演算 / デザイントークン解析 / アセット export を担当する。 API キーは自分で持ち込む (OpenRouter / Anthropic / OpenAI / Google AI / Z.ai / MiniMax または互換エンドポイント)。 バックエンド不要、 アカウント不要。

### コーディングエージェント (デスクトップ)

Claude Code / Codex / Gemini CLI をチャットパネルから直接使える。 エージェントはエディタの MCP サーバに接続し、 100 以上のデザイン tool を利用できる。 デスクトップアプリと該当エージェントの CLI をローカルにインストールしておく必要がある。

**セットアップ (Claude Code):**

1. ACP アダプタをインストール `npm install -g @agentclientprotocol/claude-agent-acp`
2. `~/.claude/settings.json` に MCP 権限を追加
   ```json
   {
     "permissions": {
       "allow": ["mcp__inkly__*"]
     }
   }
   ```
3. デスクトップアプリを開く → <kbd>Ctrl</kbd><kbd>J</kbd> → プロバイダ選択で **Claude Code**

### MCP サーバ

Claude Code / Cursor / Windsurf 等の MCP クライアントに繋いで、 デザインドキュメントをヘッドレスに inspect / 編集 / export できる。 100 以上の tool が利用可能。 [詳細ドキュメント →](https://inkly.dev/reference/mcp-tools)

**Stdio** (Claude Code / Cursor / Windsurf):

```sh
npm install -g @inkly/mcp
claude mcp add --scope user inkly -- inkly-mcp
```

その他の MCP クライアント向け。

```json
{
  "mcpServers": {
    "inkly": {
      "command": "inkly-mcp"
    }
  }
}
```

**HTTP** (スクリプト / CI):

```sh
inkly-mcp-http   # http://localhost:3100/mcp
```

**ファイルアクセス** `INKLY_MCP_ROOT` を設定すると、 ファイル操作 (`open_file` / `new_document` / export の `path` 引数) を特定ディレクトリ配下に制限できる。 未設定時はカレントディレクトリ。

### AI エージェント向け skill

AI コーディングエージェントに Inkly の使い方を教える。 デザインの inspect / アセット export / トークン解析 / `.fig` 編集を任せられる。

```sh
npx skills add inkly/skills@inkly
```

Claude Code / Cursor / Windsurf / Codex など、 [skills](https://skills.sh) 対応エージェントすべてで動く。

ドキュメント参照ができるエージェント向けには、 docs サイトが [llms.txt](https://inkly.dev/llms.txt) / [llms-full.txt](https://inkly.dev/llms-full.txt) / VitePress から生成したページ別 Markdown を配信している。

## コラボレーション

リンクを共有してリアルタイムで共同編集できる。 サーバ不要 / アカウント不要、 ピア同士は WebRTC で直接つながる。

1. 右上パネルの共有ボタンを押す
2. 生成されたリンク (`app.inkly.dev/share/<room-id>`) を共有する
3. 共同編集者にはあなたのカーソル / 選択 / 編集がリアルタイムで見える
4. ピアのアバターを押すと、 そのピアのビューポートを追従できる

## なぜ Inkly か

Figma は閉鎖的なプラットフォームで、 プログラマブルアクセスを能動的に制限している。 公式 MCP サーバは read-only。 [figma-use](https://github.com/dannote/figma-use) は CDP 経由で完全 read/write 自動化を実現したが、 [Figma 126 が CDP を封じた](https://forum.figma.com/report-a-problem-6/remote-debugging-port-not-working-in-figma-desktop-126-1-2-50858)。 デザインファイルは独自バイナリで、 公式ソフトでしか完全には読めない。 ワークフローはバージョンアップで壊れる。

Inkly はその代替を目指す。 オープンソース (MIT)、 `.fig` をネイティブに読み、 すべての操作はスクリプタブル、 データは手元から離れない。

製品の方向性と現在の Figma 互換性ギャップは [ロードマップ](https://inkly.dev/development/roadmap) を参照。

## コントリビュート

### セットアップ

```sh
bun install
```

env ファイルを 2 つから選んで作成 (どちらか or 両方)。

| file | 用途 |
|---|---|
| `.env.local` | 完全ローカル開発 (SQLite ファイル / dummy secret / オフライン OK) |
| `.env.dev` | ローカル PC で実 DB + 実 OAuth に接続 (Turso / Google ログイン本物) |

```sh
cp .env.local.example .env.local   # 完全ローカル用
cp .env.dev.example   .env.dev     # 実 DB / OAuth 用 (Turso + GCP の値を埋める)
```

起動。

```sh
bun run dev:full
```

`scripts/dev.sh` は **`.env.dev` を優先**し、 無ければ `.env.local` を読む (両方ある場合は `.env.dev` が使われる)。 エディタは `http://localhost:1420/` (Landing) または `http://localhost:1420/editor` で起動する。

#### 個別に起動したい場合

```sh
bun run dev        # Vite のみ (localhost:1420)
bun run dev:api    # API server のみ (localhost:3001)
bun run tauri dev  # デスクトップアプリ (Rust 必要)
```

API を立てずに Vite だけで動かすと、 `/dashboard` `/boards` 等の auth 必須画面で「Failed to load session」エラーになる。 エディタ (`/` または `/editor`) は API なしでも閲覧できる。

### DB

DB の接続先は環境変数で完全に切替できる。

| 設定 | 接続先 |
|---|---|
| `TURSO_DATABASE_URL` に値あり | Turso (libSQL remote) |
| `INKLY_API_DB_MODE=memory` | in-memory (e2e 用、 リセット可能) |
| どちらも空 | ローカル SQLite ファイル (`.context/api-data/inkly.db`) |

ローカル PC から Turso に接続したい場合は、 `.env.dev` (推奨) または `.env.local` の `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` に値を設定する。

Turso のセットアップ。

```sh
# Turso CLI install (macOS)
brew install tursodatabase/tap/turso

# プロジェクト DB 作成
turso db create pencil-editor-prod
turso db show pencil-editor-prod --url        # → TURSO_DATABASE_URL
turso db tokens create pencil-editor-prod     # → TURSO_AUTH_TOKEN

# migration (SQL は packages/api/src/db/migrations/)
bun run packages/api/src/db/migrate.ts
```

### Google ログイン

Google ログインを使う場合は GCP 側のセットアップが必要。 値が空のままなら Google ログインボタンは「Google login is not configured」を返す。

1. [GCP コンソール](https://console.cloud.google.com) でプロジェクト作成
2. 「APIs & Services」→「Credentials」→「Create OAuth 2.0 Client ID」(type: Web application)
3. 承認済みリダイレクト URI に `http://localhost:3001/api/auth/callback/google` を追加
4. 取得した Client ID / Client Secret を `.env.dev` (または `.env.local`) の `INKLY_API_GOOGLE_CLIENT_ID` / `INKLY_API_GOOGLE_CLIENT_SECRET` に設定
5. `bun run dev:full` を再起動 → ダッシュボードで「Google でログイン」が動く

### 招待メール (Resend)

招待メールを実際に送信したい場合は Resend 側のセットアップが必要。 値が空のままならメール送信は no-op (招待 URL は引き続き発行できる)。

1. [Resend](https://resend.com) でアカウント作成
2. API key を発行
3. `.env.dev` (または `.env.local`) の `INKLY_API_RESEND_KEY` に値を設定
4. `bun run dev:full` を再起動 → 招待フローでメール送信される

### 品質ゲート

| コマンド | 説明 |
|---|---|
| `bun run check` | Lint + typecheck |
| `bun run test` | E2E visual regression |
| `bun run test:unit` | 単体テスト |
| `bun run coverage:unit` | 単体カバレッジ (`.context/coverage/unit/lcov.info`) |
| `bun run coverage:e2e:demo` | `dashboard.interaction.spec.ts` のデモ E2E カバレッジ (`.context/coverage/e2e/`) |
| `bun run coverage:report` | unit + demo E2E カバレッジを実行してマージ済み summary を表示 |
| `bun run format` | コードフォーマット |

### カバレッジ

カバレッジの成果物は `.context/coverage/` 配下に書き出され、 git ignore 対象。

```sh
bun run coverage:unit
bun run coverage:e2e:demo
bun run coverage:report
```

- 単体カバレッジは Bun ネイティブの LCOV reporter を使い `.context/coverage/unit/lcov.info` を出力
- Bun のしきい値は `bunfig.toml` で 60% 行 / 60% 関数 / 60% statement の初期 baseline を設定
- Bun 1.3.14 は LCOV に branch データを出さないため、 branch カバレッジはマージ summary で `n/a` として表示される (Bun が branch を出すまでの暫定)
- デモ E2E カバレッジは opt-in、 `tests/e2e/interaction/dashboard.interaction.spec.ts` に限定。 Playwright の trace zip を `.context/coverage/e2e/traces/` にコピーする
- しきい値を上げる前に、 マージ summary でカバーされていない行数が多いファイルから優先的にカバーする

### プロジェクト構成

```
packages/
  core/           @inkly/core — エンジン (シーングラフ / レンダラ / レイアウト / ファイルフォーマット / ツール)
  vue/            @inkly/vue — ヘッドレス Vue SDK
  cli/            @inkly/cli — ヘッドレス CLI
  mcp/            @inkly/mcp — MCP サーバ (stdio + HTTP)
  docs/           ドキュメントサイト (inkly.dev)
src/              Vue アプリ (コンポーネント / composable / store)
desktop/          Tauri v2 (Rust + config)
tests/            E2E (188 件) + 単体 (764 件)
```

### 技術スタック

| レイヤ | 技術 |
|---|---|
| レンダリング | Skia (CanvasKit WASM) |
| レイアウト | Yoga WASM (flex + grid via [fork](https://github.com/inkly/yoga/tree/grid)) |
| UI | Vue 3 / Reka UI / Tailwind CSS 4 |
| ファイルフォーマット | Kiwi バイナリ + Zstd + ZIP |
| コラボレーション | Trystero (WebRTC P2P) + Yjs (CRDT) |
| デスクトップ | Tauri v2 |
| AI / MCP | Multi-provider (Anthropic / OpenAI / Google AI / OpenRouter) / MCP SDK / Hono |

### デスクトップビルド

[Rust](https://rustup.rs/) とプラットフォーム別の前提環境 ([Tauri v2 ガイド](https://v2.tauri.app/start/prerequisites/)) が必要。

```sh
bun run tauri build
```

## 謝辞

[ドキュメントサイト](https://inkly.dev) の作成 / 保守を担っている [@sld0Ant](https://github.com/sld0Ant) (Anton Soldatov) に感謝。

## ライセンス

MIT
