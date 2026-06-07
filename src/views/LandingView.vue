<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useHead } from '@unhead/vue'

import { useI18n } from '@inkly/vue'

import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

import IconSparkles from '~icons/lucide/sparkles'
import IconUsers from '~icons/lucide/users-round'
import IconBlocks from '~icons/lucide/blocks'
import IconNetwork from '~icons/lucide/network'
import IconBot from '~icons/lucide/bot'
import IconSunMoon from '~icons/lucide/sun-moon'

const { landing } = useI18n()

useHead({ title: () => landing.value.headTitle })

const currentYear = computed(() => new Date().getFullYear().toString())

const features = computed<Array<{ icon: Component; title: string; body: string }>>(() => [
  { icon: IconSparkles, title: landing.value.feature1Title, body: landing.value.feature1Body },
  { icon: IconUsers, title: landing.value.feature2Title, body: landing.value.feature2Body },
  { icon: IconBlocks, title: landing.value.feature3Title, body: landing.value.feature3Body },
  { icon: IconNetwork, title: landing.value.feature4Title, body: landing.value.feature4Body },
  { icon: IconBot, title: landing.value.feature5Title, body: landing.value.feature5Body },
  { icon: IconSunMoon, title: landing.value.feature6Title, body: landing.value.feature6Body }
])

const metrics = computed(() => [
  { value: landing.value.metric1Value, label: landing.value.metric1Label },
  { value: landing.value.metric2Value, label: landing.value.metric2Label },
  { value: landing.value.metric3Value, label: landing.value.metric3Label },
  { value: landing.value.metric4Value, label: landing.value.metric4Label }
])

const steps = computed(() => [
  { tag: landing.value.step1Tag, title: landing.value.step1Title, body: landing.value.step1Body },
  { tag: landing.value.step2Tag, title: landing.value.step2Title, body: landing.value.step2Body },
  { tag: landing.value.step3Tag, title: landing.value.step3Title, body: landing.value.step3Body }
])
</script>

<template>
  <div
    data-test-id="landing-view"
    class="shell-bg relative h-screen w-screen overflow-y-auto"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 h-[60vh] w-full hero-grid"
    />
    <div class="relative mx-auto flex w-full max-w-7xl flex-col gap-24 px-6 pb-24 pt-6 md:gap-32 md:px-10 md:pt-10">
      <!-- Nav -->
      <header
        data-test-id="landing-nav"
        class="hero-fade-up sticky top-3 z-30 flex items-center justify-between gap-3 rounded-full border border-border bg-panel/80 px-3 py-2 shadow-card backdrop-blur-xl md:px-4"
      >
        <RouterLink
          to="/"
          data-test-id="landing-brand"
          class="flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-surface transition-colors hover:bg-hover"
        >
          <span
            class="grid size-7 place-items-center rounded-md text-base font-bold"
            style="background: linear-gradient(135deg, var(--color-accent), var(--color-brand)); color: var(--color-accent-foreground);"
            aria-hidden="true"
          >
            I
          </span>
          <span style="font-family: var(--font-display);">Inkly</span>
        </RouterLink>

        <nav
          aria-label="Primary"
          class="hidden items-center gap-1 text-sm md:flex"
        >
          <a
            href="#features"
            data-test-id="landing-nav-product"
            class="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-hover hover:text-surface"
          >
            {{ landing.navProduct }}
          </a>
          <a
            href="#workflow"
            data-test-id="landing-nav-pricing"
            class="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-hover hover:text-surface"
          >
            {{ landing.navPricing }}
          </a>
          <a
            href="https://inkly.dev"
            target="_blank"
            rel="noopener noreferrer"
            data-test-id="landing-nav-docs"
            class="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-hover hover:text-surface"
          >
            {{ landing.navDocs }}
          </a>
        </nav>

        <div class="flex items-center gap-2">
          <LocaleSwitcher test-id="landing-locale-switcher" />
          <ThemeToggle test-id="landing-theme-toggle" />
          <RouterLink
            to="/dashboard"
            data-test-id="landing-nav-dashboard"
            class="hidden cursor-pointer items-center gap-2 rounded-full border border-border bg-canvas-elevated px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-hover hover:border-border-strong md:inline-flex"
          >
            <icon-lucide-layout-dashboard class="size-3.5" aria-hidden="true" />
            <span>{{ landing.navOpenDashboard }}</span>
          </RouterLink>
          <RouterLink
            to="/editor"
            data-test-id="landing-nav-editor"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style="background: var(--color-accent); color: var(--color-accent-foreground);"
          >
            <span>{{ landing.navOpenEditor }}</span>
            <icon-lucide-arrow-right class="size-3.5" aria-hidden="true" />
          </RouterLink>
        </div>
      </header>

      <!-- Hero -->
      <section
        id="hero"
        data-test-id="landing-hero"
        class="hero-fade-up grid grid-cols-1 items-center gap-12 pt-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
      >
        <div class="flex flex-col items-start gap-6">
          <span
            data-test-id="landing-hero-eyebrow"
            class="inline-flex items-center gap-2 rounded-full border border-accent-rim bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent"
          >
            <span
              class="size-1.5 rounded-full"
              style="background: var(--color-accent);"
              aria-hidden="true"
            />
            {{ landing.heroEyebrow }}
          </span>

          <h1
            data-test-id="landing-hero-title"
            class="text-balance text-[clamp(2.6rem,5.5vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-surface-strong"
            style="font-family: var(--font-display);"
          >
            <span class="block">{{ landing.heroTitleLine1 }}</span>
            <span
              class="block bg-clip-text text-transparent"
              style="background-image: linear-gradient(135deg, var(--color-accent), var(--color-brand) 50%, var(--color-rim));"
            >
              {{ landing.heroTitleHighlight }}
            </span>
            <span class="block">{{ landing.heroTitleLine2 }}</span>
          </h1>

          <p
            data-test-id="landing-hero-subtitle"
            class="max-w-xl text-pretty text-base leading-relaxed text-muted md:text-lg"
          >
            {{ landing.heroSubtitle }}
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <RouterLink
              to="/editor"
              data-test-id="landing-hero-cta-primary"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all shell-cta"
            >
              <span>{{ landing.heroCtaPrimary }}</span>
              <icon-lucide-arrow-right class="size-4" aria-hidden="true" />
            </RouterLink>
            <RouterLink
              to="/boards"
              data-test-id="landing-hero-cta-secondary"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors shell-cta-ghost"
            >
              <icon-lucide-layout-grid class="size-4" aria-hidden="true" />
              <span>{{ landing.heroCtaSecondary }}</span>
            </RouterLink>
          </div>

          <ul
            data-test-id="landing-hero-badges"
            class="flex flex-wrap items-center gap-2 pt-2"
          >
            <li
              class="inline-flex items-center gap-2 rounded-full border border-border bg-canvas-elevated px-3 py-1 text-[11px] text-muted"
            >
              <icon-lucide-cpu class="size-3" aria-hidden="true" />
              {{ landing.heroBadgeWebgl }}
            </li>
            <li
              class="inline-flex items-center gap-2 rounded-full border border-border bg-canvas-elevated px-3 py-1 text-[11px] text-muted"
            >
              <icon-lucide-radio class="size-3" aria-hidden="true" />
              {{ landing.heroBadgeRealtime }}
            </li>
            <li
              class="inline-flex items-center gap-2 rounded-full border border-border bg-canvas-elevated px-3 py-1 text-[11px] text-muted"
            >
              <icon-lucide-github class="size-3" aria-hidden="true" />
              {{ landing.heroBadgeOpen }}
            </li>
          </ul>
        </div>

        <!-- Hero canvas mock -->
        <div
          aria-hidden="true"
          class="hero-float relative isolate aspect-[5/4] w-full overflow-hidden rounded-[28px] border border-border bg-panel shadow-pop"
        >
          <div
            class="absolute inset-0"
            style="
              background:
                radial-gradient(circle at 20% 20%, var(--color-accent-soft), transparent 55%),
                radial-gradient(circle at 80% 30%, rgb(164 139 255 / 0.22), transparent 50%),
                radial-gradient(circle at 50% 90%, rgb(52 210 255 / 0.18), transparent 50%),
                linear-gradient(160deg, var(--color-canvas) 10%, var(--color-canvas-deep) 100%);
            "
          />
          <div class="absolute inset-0">
            <div class="absolute left-6 top-6 flex items-center gap-1.5">
              <span class="size-2.5 rounded-full" style="background: #ff5f56;" />
              <span class="size-2.5 rounded-full" style="background: #ffbd2e;" />
              <span class="size-2.5 rounded-full" style="background: #27c93f;" />
            </div>
            <div
              class="absolute left-1/2 top-5 -translate-x-1/2 rounded-full border border-border bg-canvas-elevated px-2.5 py-0.5 text-[10px] text-muted"
            >
              Inkly · Landing.pen
            </div>
          </div>

          <!-- Floating cards inside hero mock -->
          <div
            class="absolute inset-x-8 top-16 flex flex-wrap gap-3"
          >
            <div
              class="flex flex-1 min-w-[180px] flex-col gap-2 rounded-2xl border border-border bg-canvas-elevated p-3 shadow-soft"
            >
              <span class="shell-eyebrow text-[9px]">Components</span>
              <div class="flex items-center gap-2">
                <span
                  class="size-7 rounded-md"
                  style="background: linear-gradient(135deg, var(--color-accent), var(--color-brand));"
                />
                <span
                  class="size-7 rounded-md"
                  style="background: linear-gradient(135deg, var(--color-rim), var(--color-accent));"
                />
                <span
                  class="size-7 rounded-md border border-border"
                />
              </div>
              <div class="h-1.5 w-3/4 rounded-full bg-border" />
              <div class="h-1.5 w-2/5 rounded-full bg-border" />
            </div>

            <div
              class="flex flex-1 min-w-[160px] flex-col gap-2 rounded-2xl border border-border bg-canvas-elevated p-3 shadow-soft"
            >
              <span class="shell-eyebrow text-[9px]">Cursors</span>
              <ul class="flex flex-col gap-1.5">
                <li class="flex items-center gap-2">
                  <span
                    class="size-2 rounded-full"
                    style="background: var(--color-accent);"
                  />
                  <span class="text-[10px] text-surface">Tanaka</span>
                </li>
                <li class="flex items-center gap-2">
                  <span
                    class="size-2 rounded-full"
                    style="background: var(--color-brand);"
                  />
                  <span class="text-[10px] text-surface">Olivia</span>
                </li>
                <li class="flex items-center gap-2">
                  <span
                    class="size-2 rounded-full"
                    style="background: var(--color-rim);"
                  />
                  <span class="text-[10px] text-surface">Marc</span>
                </li>
              </ul>
            </div>
          </div>

          <div
            class="absolute inset-x-8 bottom-8 flex gap-3"
          >
            <div
              class="flex flex-[2] min-w-0 flex-col gap-2 rounded-2xl border border-border bg-canvas-elevated p-3 shadow-soft"
            >
              <div class="flex items-center justify-between">
                <span class="shell-eyebrow text-[9px]">Auto-layout</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[9px]"
                  style="background: var(--color-accent-soft); color: var(--color-accent);"
                >
                  120fps
                </span>
              </div>
              <div class="flex h-12 items-end gap-1">
                <span class="block flex-1 rounded-t" style="height: 30%; background: var(--color-accent);" />
                <span class="block flex-1 rounded-t" style="height: 55%; background: var(--color-accent);" />
                <span class="block flex-1 rounded-t" style="height: 70%; background: var(--color-brand);" />
                <span class="block flex-1 rounded-t" style="height: 45%; background: var(--color-accent);" />
                <span class="block flex-1 rounded-t" style="height: 88%; background: var(--color-rim);" />
                <span class="block flex-1 rounded-t" style="height: 60%; background: var(--color-accent);" />
              </div>
            </div>

            <div
              class="flex flex-1 flex-col items-start justify-between gap-2 rounded-2xl border border-border bg-canvas-elevated p-3 shadow-soft"
            >
              <span class="shell-eyebrow text-[9px]">Latency</span>
              <span
                class="text-2xl font-semibold text-surface"
                style="font-family: var(--font-display);"
              >
                7ms
              </span>
              <span class="text-[10px] text-muted">p99 select→paint</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section
        id="features"
        data-test-id="landing-features"
        class="flex flex-col gap-10"
      >
        <header class="flex flex-col items-start gap-3">
          <span class="shell-eyebrow">{{ landing.featuresEyebrow }}</span>
          <h2
            class="max-w-3xl text-balance text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.02em] text-surface-strong"
            style="font-family: var(--font-display);"
          >
            {{ landing.featuresHeading }}
          </h2>
          <p class="max-w-2xl text-base text-muted">{{ landing.featuresIntro }}</p>
        </header>

        <ul
          class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-test-id="landing-features-grid"
        >
          <li
            v-for="(feature, idx) in features"
            :key="feature.title"
            :data-test-id="`landing-feature-${idx}`"
            class="group flex flex-col gap-3 rounded-2xl border border-border bg-panel p-6 shadow-soft transition-colors hover:border-border-strong"
          >
            <span
              class="grid size-10 place-items-center rounded-xl text-accent"
              style="background: var(--color-accent-soft);"
              aria-hidden="true"
            >
              <component :is="feature.icon" class="size-5" />
            </span>
            <h3
              class="text-lg font-semibold text-surface-strong"
              style="font-family: var(--font-display);"
            >
              {{ feature.title }}
            </h3>
            <p class="text-sm leading-relaxed text-muted">{{ feature.body }}</p>
          </li>
        </ul>
      </section>

      <!-- Metrics -->
      <section
        id="metrics"
        data-test-id="landing-metrics"
        class="flex flex-col gap-8 rounded-[28px] border border-border bg-panel p-8 shadow-card md:p-10"
      >
        <header class="flex flex-col items-start gap-2 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-col gap-2">
            <span class="shell-eyebrow">{{ landing.metricsEyebrow }}</span>
            <h2
              class="text-balance text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold tracking-[-0.02em] text-surface-strong"
              style="font-family: var(--font-display);"
            >
              {{ landing.metricsHeading }}
            </h2>
          </div>
        </header>

        <ul
          class="grid grid-cols-2 gap-6 md:grid-cols-4"
          data-test-id="landing-metrics-grid"
        >
          <li
            v-for="(metric, idx) in metrics"
            :key="metric.label"
            :data-test-id="`landing-metric-${idx}`"
            class="flex flex-col gap-2 border-l-2 pl-4"
            style="border-color: var(--color-accent);"
          >
            <span
              class="text-3xl font-semibold tracking-tight text-surface-strong md:text-4xl"
              style="font-family: var(--font-display);"
            >
              {{ metric.value }}
            </span>
            <span class="text-xs uppercase tracking-[0.2em] text-muted">{{ metric.label }}</span>
          </li>
        </ul>
      </section>

      <!-- Workflow -->
      <section
        id="workflow"
        data-test-id="landing-workflow"
        class="flex flex-col gap-10"
      >
        <header class="flex flex-col items-start gap-3">
          <span class="shell-eyebrow">{{ landing.workflowEyebrow }}</span>
          <h2
            class="max-w-3xl text-balance text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.02em] text-surface-strong"
            style="font-family: var(--font-display);"
          >
            {{ landing.workflowHeading }}
          </h2>
        </header>

        <ol
          class="grid grid-cols-1 gap-4 md:grid-cols-3"
          data-test-id="landing-workflow-grid"
        >
          <li
            v-for="(step, idx) in steps"
            :key="step.title"
            :data-test-id="`landing-step-${idx}`"
            class="relative flex flex-col gap-4 rounded-2xl border border-border bg-panel p-6 shadow-soft"
          >
            <span
              class="text-[11px] font-mono tracking-[0.2em] text-accent"
              aria-hidden="true"
            >{{ step.tag }}</span>
            <h3
              class="text-xl font-semibold text-surface-strong"
              style="font-family: var(--font-display);"
            >
              {{ step.title }}
            </h3>
            <p class="text-sm leading-relaxed text-muted">{{ step.body }}</p>
          </li>
        </ol>
      </section>

      <!-- CTA -->
      <section
        id="cta"
        data-test-id="landing-cta"
        class="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-[32px] border border-border bg-panel px-6 py-16 text-center shadow-pop md:px-12"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 -z-10"
          style="
            background:
              radial-gradient(circle at 20% 30%, var(--color-accent-soft), transparent 60%),
              radial-gradient(circle at 80% 70%, rgb(164 139 255 / 0.16), transparent 55%);
          "
        />
        <span class="shell-eyebrow">{{ landing.ctaEyebrow }}</span>
        <h2
          class="max-w-2xl text-balance text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.02em] text-surface-strong"
          style="font-family: var(--font-display);"
        >
          {{ landing.ctaHeading }}
        </h2>
        <p class="max-w-xl text-pretty text-base text-muted">{{ landing.ctaBody }}</p>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <RouterLink
            to="/editor"
            data-test-id="landing-cta-primary"
            class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shell-cta"
          >
            <span>{{ landing.ctaPrimary }}</span>
            <icon-lucide-arrow-right class="size-4" aria-hidden="true" />
          </RouterLink>
          <RouterLink
            to="/boards"
            data-test-id="landing-cta-secondary"
            class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors shell-cta-ghost"
          >
            <icon-lucide-layout-grid class="size-4" aria-hidden="true" />
            <span>{{ landing.ctaSecondary }}</span>
          </RouterLink>
        </div>
      </section>

      <!-- Footer -->
      <footer
        data-test-id="landing-footer"
        class="flex flex-col gap-6 border-t border-border pt-10 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span
              class="grid size-7 place-items-center rounded-md text-base font-bold"
              style="background: linear-gradient(135deg, var(--color-accent), var(--color-brand)); color: var(--color-accent-foreground);"
              aria-hidden="true"
            >
              I
            </span>
            <span
              class="text-sm font-semibold text-surface"
              style="font-family: var(--font-display);"
            >Inkly</span>
          </div>
          <p class="max-w-md text-xs text-muted">{{ landing.footerTagline }}</p>
        </div>

        <nav
          aria-label="Footer"
          class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted"
        >
          <a
            href="#features"
            class="transition-colors hover:text-surface"
          >{{ landing.footerProduct }}</a>
          <a
            href="https://github.com/cardene777/inkly"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-surface"
          >{{ landing.footerCompany }}</a>
          <a
            href="https://inkly.dev"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-surface"
          >{{ landing.footerResources }}</a>
          <RouterLink to="/account" class="transition-colors hover:text-surface">
            {{ landing.footerLegal }}
          </RouterLink>
        </nav>

        <p class="text-xs text-muted">{{ landing.footerCopyright({ year: currentYear }) }}</p>
      </footer>
    </div>
  </div>
</template>
