<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

type SectionId =
  | 'overview'
  | 'quickstart'
  | 'editor'
  | 'boards'
  | 'mention'
  | 'cli'
  | 'faq'

interface DocSection {
  id: SectionId
  title: string
  summary: string
  body: string[]
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Pencil Editor とは',
    summary: 'デザインと共同編集をオープンに、 すべてあなたの環境で。',
    body: [
      'Pencil Editor は .fig (Figma 互換) と .pen (Pencil ネイティブ) を直接編集できるオープンソースのデザインエディタです。 ブラウザ / デスクトップ (Tauri v2) / CLI / MCP server / Vue SDK の 5 種類の表面から同じ document を扱えます。',
      'すべて MIT ライセンスで配布されており、 セルフホスト (Fly.io / 任意の Node 環境) も `pencil-editor.fly.dev` のホスト版もどちらも利用可能です。 アカウント不要で board を共同編集するための anonymous mode、 jfet.co.jp 内部メンバー向けの jfet モード、 外部協業者向けの guest モードを 1 つのプロダクトに統合しています。',
      '本ドキュメントは Quickstart / 主要画面の使い方 / mention / CLI / FAQ を 1 セクションずつ解説します。 サイドバーから興味のあるセクションへ移動してください。'
    ]
  },
  {
    id: 'quickstart',
    title: 'Quickstart',
    summary: '5 分で board を 1 枚作って共同編集する。',
    body: [
      '1. `https://pencil-editor.fly.dev` を開く (またはローカルで `bun run dev:full` を起動して `http://localhost:1420` を開く)。',
      '2. ヘッダー右上の「ログイン」を押し、 メンバー (Google) かゲスト (メール) を選択する。 jfet.co.jp の Google アカウントが手元にない場合はゲストでメール + パスワードを登録する。',
      '3. ログイン後、 ダッシュボードに移動して `+ 新しい board` を選び board 名を入力する。',
      '4. board 画面右上の「招待」ボタンから共有リンクを発行する。 リンクを開いた人は guest login 画面に飛ばされ、 メール + パスワードでアカウント作成すると即 board に参加できる。',
      '5. 任意のテキストレイヤーを編集中に `@<相手>` と入力するとメンション補完が出る。 選択すると通知ベルに即座にプッシュされる。'
    ]
  },
  {
    id: 'editor',
    title: 'エディタの使い方',
    summary: 'ツールバー / ショートカット / インラインメニューの読み方。',
    body: [
      'ツールバーは V (移動)、 F (Frame)、 R (Rectangle)、 P (Pen)、 T (Text)、 H (Hand) を切り替えるキー操作に対応しています。 ⌘+Z / ⇧⌘+Z で undo / redo、 ⌘+D で複製、 ⌫ で削除を実行できます。',
      'レイヤーパネルでは上下ドラッグで z-index 並べ替え、 → / ← でツリー展開ができます。 プロパティパネルではテキスト / 塗り / 線 / エフェクト / 書き出し設定を 1 か所で編集できます。 ScrubInput (数値の上をドラッグ) で滑らかに値を変更できます。',
      'ダブルクリックでテキスト編集モードに入ります。 編集中にメンション補完を使う場合は `@` を入力すると board 参加者候補が表示されます (mention タブを参照)。'
    ]
  },
  {
    id: 'boards',
    title: 'Board 管理',
    summary: 'board 作成 / 共有 / 削除の基本を理解する。',
    body: [
      '個人 board は所有者本人だけが管理権を持ち、 招待リンクを発行することで他者に共有できます。 招待リンクには invitation token が含まれており、 受け取った相手は guest login 画面でメールアドレスを登録するだけで board に参加できます。',
      'ダッシュボードの「ピン留め」を使うと、 よく使う board をリストの先頭に固定できます。 board を削除すると関連する collaborator / invitation も合わせて削除されます (undo はできないため確認モーダルで二段階保護されています)。'
    ]
  },
  {
    id: 'mention',
    title: 'Mention 通知',
    summary: 'board 参加者にリアルタイムで通知を飛ばす。',
    body: [
      'テキスト編集中に `@` を入力するとメンション候補が popover で表示されます。 候補は board の参加者 (自分を除く) から取得され、 名前 / メールアドレスで部分一致絞り込みできます。',
      '候補を選択すると mention text が確定され、 相手の通知ベルに WebSocket push でリアルタイム通知が届きます。 通知本文には mention された board 名と発信者の表示名が含まれます。',
      '通知ベルから直接 board に遷移できます (notification popover → board リンク)。 既読 / 未読の管理は `/notifications` ページから一括操作できます。'
    ]
  },
  {
    id: 'cli',
    title: 'inkly CLI',
    summary: 'headless で .pen / .fig を操作する。',
    body: [
      'inkly CLI (`packages/cli/dist/index.mjs`) は bun runtime で動作し、 editor app や MCP server を起動せずに .pen / .fig ファイルを完全 headless で操作できます。 CI/CD パイプラインや自動化スクリプトに組み込めます。',
      '主要コマンド: `info` (ドキュメント情報)、 `tree` (node 木構造)、 `find` (name で検索)、 `query --xpath` (XPath 検索)、 `node --id` (node 詳細)、 `variables` (design token 列挙)、 `eval --code` (Figma plugin API 互換の JS で編集)、 `export -f png|svg|pdf|jpg|webp|jsx` (各種 export)、 `lint` (一貫性チェック)、 `analyze` (spacing / typography 分析)、 `convert -o` (フォーマット変換)。',
      '`bun packages/cli/dist/index.mjs --help` ですべてのコマンドと flag を確認できます。 sub command 単位の help (例: `... eval --help`) もあります。'
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    summary: 'よくある質問。',
    body: [
      'Q: メンバーとゲストの違いは?  A: メンバーは jfet.co.jp Google アカウントでログインし、 ダッシュボード / 通知 / admin を利用できます。 ゲストは外部のメール + パスワードでログインし、 招待された board の編集のみが可能です。',
      'Q: 招待リンクを発行した相手が「ゲスト」ではなく「メンバー」としてログインした場合は?  A: jfet.co.jp の Google アカウントを持っているなら Google ログインで board にアクセスできます。 招待リンクは認証方法を強制せず、 アクセスする人がメンバー / ゲストのどちらでも board に到達できます。',
      'Q: board を間違えて削除したら?  A: 現状 undo はありません。 重要な board は事前に `inkly export` で .pen / .json として書き出しておくことを推奨します。',
      'Q: 自分でホストしたい場合は?  A: GitHub の `cardene777/open-pencil` を clone し、 Fly.io または任意の Node 環境にデプロイできます。 詳細は repository の README を参照してください。',
      'Q: Mention 候補が空になる場合は?  A: 相手がその board の参加者として追加済みか確認してください。 board に参加していない user は候補に表示されません。'
    ]
  }
]

const currentSectionId = computed<SectionId>(() => {
  const value = route.params.section
  if (typeof value === 'string') {
    const found = sections.find((section) => section.id === value)
    if (found) return found.id
  }
  return 'overview'
})

const currentSection = computed(() =>
  sections.find((section) => section.id === currentSectionId.value) ?? sections[0]
)

onMounted(() => {
  document.body.classList.add('landing-active')
})

onBeforeUnmount(() => {
  document.body.classList.remove('landing-active')
})
</script>

<template>
  <main data-test-id="docs-view" class="docs">
    <header class="docs__header">
      <router-link to="/" class="docs__brand">Pencil Editor</router-link>
      <nav class="docs__nav">
        <router-link to="/" class="docs__link">トップ</router-link>
        <router-link to="/dashboard" class="docs__link">ダッシュボード</router-link>
        <a
          href="https://github.com/cardene777/open-pencil"
          target="_blank"
          rel="noopener"
          class="docs__link"
        >
          GitHub
        </a>
      </nav>
    </header>

    <div class="docs__layout">
      <aside class="docs__sidebar" data-test-id="docs-sidebar">
        <p class="docs__sidebar-title">セクション</p>
        <ul class="docs__menu">
          <li v-for="section in sections" :key="section.id">
            <router-link
              :to="section.id === 'overview' ? '/docs' : `/docs/${section.id}`"
              :class="['docs__menu-link', currentSectionId === section.id ? 'is-active' : '']"
              :data-test-id="`docs-link-${section.id}`"
            >
              {{ section.title }}
            </router-link>
          </li>
        </ul>
      </aside>

      <article class="docs__article" data-test-id="docs-article">
        <p class="docs__eyebrow">Documentation</p>
        <h1 class="docs__title" data-test-id="docs-title">{{ currentSection.title }}</h1>
        <p class="docs__summary">{{ currentSection.summary }}</p>

        <div class="docs__body">
          <p v-for="(paragraph, index) in currentSection.body" :key="index">
            {{ paragraph }}
          </p>
        </div>
      </article>
    </div>

    <footer class="docs__footer">
      <p>© Pencil Editor · MIT License</p>
    </footer>
  </main>
</template>

<style scoped>
.docs {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d1017 0%, #161b27 100%);
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.docs__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.docs__brand {
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
  color: #e8eaed;
  text-decoration: none;
}

.docs__nav {
  display: flex;
  gap: 1.5rem;
}

.docs__link {
  color: rgba(232, 234, 237, 0.7);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.docs__link:hover {
  color: #e8eaed;
}

.docs__layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2.5rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 3rem 2rem 5rem;
}

.docs__sidebar {
  position: sticky;
  top: 2rem;
  align-self: start;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.2rem 1rem;
  background: rgba(255, 255, 255, 0.03);
}

.docs__sidebar-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(232, 234, 237, 0.5);
  margin: 0 0 0.75rem 0.5rem;
}

.docs__menu {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.docs__menu-link {
  display: block;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  font-size: 0.88rem;
  color: rgba(232, 234, 237, 0.7);
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
}

.docs__menu-link:hover {
  background: rgba(124, 140, 255, 0.1);
  color: #e8eaed;
}

.docs__menu-link.is-active {
  background: rgba(124, 140, 255, 0.18);
  color: #f5f6f7;
  font-weight: 500;
}

.docs__article {
  min-width: 0;
}

.docs__eyebrow {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(124, 140, 255, 0.85);
  margin: 0 0 0.5rem;
}

.docs__title {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 700;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  word-break: keep-all;
  overflow-wrap: normal;
  line-break: strict;
}

.docs__summary {
  font-size: 1.05rem;
  color: rgba(232, 234, 237, 0.75);
  margin: 0 0 2rem;
  line-height: 1.6;
  word-break: keep-all;
  overflow-wrap: normal;
  line-break: strict;
}

.docs__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.docs__body p {
  font-size: 0.98rem;
  color: rgba(232, 234, 237, 0.78);
  line-height: 1.75;
  margin: 0;
  word-break: keep-all;
  overflow-wrap: normal;
  line-break: strict;
}

.docs__footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(232, 234, 237, 0.4);
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .docs__layout {
    grid-template-columns: 1fr;
    padding: 2rem 1.25rem 3rem;
  }

  .docs__sidebar {
    position: static;
  }
}
</style>
