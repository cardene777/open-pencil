<script setup lang="ts">
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())

const features = [
  {
    title: 'Native .fig support',
    body: 'Open and edit Figma files directly — no import, no conversion.'
  },
  {
    title: 'Real-time collaboration',
    body: 'Peer-to-peer via WebRTC. No server, no account required.'
  },
  {
    title: 'AI-powered design',
    body: 'Connect any LLM (OpenRouter / Anthropic / OpenAI / Google AI). 90+ tools.'
  },
  {
    title: 'Programmable',
    body: 'Headless CLI, MCP server, Figma Plugin API via `eval`, Vue SDK.'
  },
  {
    title: 'Lightweight desktop',
    body: '~7 MB Tauri v2 app for macOS, Windows, Linux. Also runs as PWA.'
  },
  {
    title: 'Open source',
    body: 'MIT licensed. Self-host or use the hosted version at app.inkly.dev.'
  }
]
</script>

<template>
  <main class="landing">
    <header class="landing__header">
      <div class="landing__brand">Pencil Editor</div>
      <nav class="landing__nav">
        <a href="https://github.com/cardene777/open-pencil" target="_blank" rel="noopener">GitHub</a>
        <a href="https://inkly.dev" target="_blank" rel="noopener">Docs</a>
      </nav>
    </header>

    <section class="hero">
      <h1 class="hero__title">
        Open-source design editor<br />
        <span class="hero__accent">with native .fig support</span>
      </h1>
      <p class="hero__lead">
        Edit Figma files directly. Collaborate in real-time. Build with AI.
        All open source, all yours.
      </p>
      <div class="hero__cta">
        <router-link to="/editor" class="btn btn--primary">Launch Editor</router-link>
        <router-link to="/dashboard" class="btn btn--ghost">Open Dashboard</router-link>
      </div>
    </section>

    <section class="features">
      <h2 class="features__title">Features</h2>
      <div class="features__grid">
        <article v-for="feature in features" :key="feature.title" class="feature">
          <h3 class="feature__title">{{ feature.title }}</h3>
          <p class="feature__body">{{ feature.body }}</p>
        </article>
      </div>
    </section>

    <footer class="landing__footer">
      <p>© {{ year }} Pencil Editor · MIT License</p>
    </footer>
  </main>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d1017 0%, #161b27 100%);
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.landing__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.landing__brand {
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}

.landing__nav {
  display: flex;
  gap: 1.5rem;
}

.landing__nav a {
  color: rgba(232, 234, 237, 0.7);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.landing__nav a:hover {
  color: #e8eaed;
}

.hero {
  text-align: center;
  padding: 6rem 2rem 5rem;
  max-width: 800px;
  margin: 0 auto;
}

.hero__title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
}

.hero__accent {
  background: linear-gradient(135deg, #7c8cff 0%, #b08cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero__lead {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: rgba(232, 234, 237, 0.7);
  line-height: 1.6;
  margin: 0 0 2.5rem;
}

.hero__cta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.75rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 8px;
  text-decoration: none;
  transition: transform 0.15s, background 0.2s, border-color 0.2s;
  border: 1px solid transparent;
}

.btn--primary {
  background: linear-gradient(135deg, #7c8cff 0%, #b08cff 100%);
  color: #0d1017;
}

.btn--primary:hover {
  transform: translateY(-1px);
}

.btn--ghost {
  background: transparent;
  color: #e8eaed;
  border-color: rgba(255, 255, 255, 0.15);
}

.btn--ghost:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.04);
}

.features {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 2rem 6rem;
}

.features__title {
  font-size: 1.75rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 3rem;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.feature {
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
}

.feature:hover {
  border-color: rgba(124, 140, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.feature__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: #f5f6f7;
}

.feature__body {
  font-size: 0.95rem;
  color: rgba(232, 234, 237, 0.65);
  line-height: 1.55;
  margin: 0;
}

.landing__footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(232, 234, 237, 0.4);
  font-size: 0.85rem;
}
</style>
