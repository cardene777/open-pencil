import { defineConfig } from '@playwright/test'

// e2e は test-util 経路 (/api/auth/test/login) を必須とするため、 dev server を
// reuse する場合は INKLY_API_AUTH_ENABLE_TEST_UTILS=1 で起動された server だけが
// 有効。 .env.dev (本番接続) の dev server を reuse すると test-util が無効で
// 全 spec の mockGoogleLogin が 404 になる。
//
// ユーザーが意図して reuse したい時のみ PLAYWRIGHT_REUSE_DEV_SERVER=1 を設定する。
// 未設定なら playwright が test 専用 server を新規起動 (= ユーザー側 dev server を
// 事前に停止する必要あり、 port 1420 / 3001 の衝突防止)。
const reuseDevServer = process.env.PLAYWRIGHT_REUSE_DEV_SERVER === '1'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      pathTemplate: '{testDir}/visual/__snapshots__/{arg}{ext}',
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    }
  },
  use: {
    baseURL: 'http://localhost:1420',
    testIdAttribute: 'data-test-id',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    launchOptions: {
      args: ['--enable-unsafe-swiftshader']
    }
  },
  projects: [
    {
      name: 'inkly',
      testDir: './tests/e2e',
      fullyParallel: false
    },
    {
      name: 'inkly-webkit',
      testDir: './tests/e2e',
      testMatch: '**/*.webkit.spec.ts',
      use: {
        browserName: 'webkit'
      }
    },
    {
      name: 'figma',
      testDir: './tests/figma'
    }
  ],
  webServer: [
    {
      command: 'VITE_INKLY_AUTH_TEST_MODE=1 bun run dev',
      port: 1420,
      reuseExistingServer: reuseDevServer
    },
    {
      command:
        'INKLY_API_DB_MODE=memory INKLY_API_JWT_SECRET=playwright-secret INKLY_API_AUTH_ENABLE_TEST_UTILS=1 bun --filter @inkly/api dev',
      port: 3001,
      reuseExistingServer: reuseDevServer
    }
  ]
})
