<template>
  <div class="classe-screen">
    <div class="bg-texture" aria-hidden="true" />

    <div class="content">
      <h1 class="title">{{ texts.classTitle }}</h1>
      <p class="subtitle">{{ texts.classSubtitle }}</p>

      <input
        v-model="playerName"
        type="text"
        :placeholder="texts.placeholder"
        class="name-input"
        name="heroName"
        autocomplete="off"
        @keydown.enter.prevent="onEnter"
      />

      <div class="class-grid">
        <button
          v-for="classId in classOrder"
          :key="classId"
          type="button"
          class="class-card"
          :class="{ 'class-card--active': selectedClass === classId }"
          :style="{ '--class-accent': classes[classId].accent }"
          @click="selectClass(classId)"
        >
          <div class="class-card__portrait">
            <img
              :src="classes[classId].preview"
              :alt="classes[classId].name"
              class="class-card__sprite"
            />
          </div>
          <div class="class-card__body">
            <h2>{{ classes[classId].name }}</h2>
            <p>{{ classes[classId].description }}</p>
          </div>
        </button>
      </div>

      <div v-if="activeClass" class="class-detail">
        <div class="class-detail__chart">
          <h3>{{ texts.statsTitle }}</h3>
          <PentagonChart
            :stats="activeClass.chartStats"
            :labels="chartLabels"
            :accent="activeClass.accent"
          />
        </div>
        <div class="class-detail__summary">
          <h3>{{ activeClass.name }}</h3>
          <p>{{ activeClass.description }}</p>
          <ul class="class-detail__stats">
            <li v-for="(label, key) in chartLabels" :key="key">
              <span>{{ label }}</span>
              <strong>{{ activeClass.chartStats[key] }}/10</strong>
            </li>
          </ul>
        </div>
      </div>

      <div class="actions">
        <button
          type="button"
          class="start-btn"
          :disabled="!canStart"
          @click="confirmarClasse"
        >
          {{ texts.start }}
        </button>
      </div>
    </div>

    <audio ref="clickSound" class="click-sound" src="/sounds/click.wav" preload="auto" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGameState } from '@/stores/gameState';
import { useLanguageStore } from '@/stores/language';
import { CLASS_ORDER, CLASSES, CHART_LABELS } from '@/data/classes.js';
import PentagonChart from '@/components/PentagonChart.vue';

const playerName = ref('');
const selectedClass = ref('Guerreiro');
const clickSound = ref(null);
const router = useRouter();
const gameState = useGameState();
const languageStore = useLanguageStore();
const { texts } = storeToRefs(languageStore);

const classOrder = CLASS_ORDER;
const classes = CLASSES;
const chartLabels = CHART_LABELS;

const activeClass = computed(() => classes[selectedClass.value] || null);
const canStart = computed(() => playerName.value.trim().length > 0 && Boolean(selectedClass.value));

function selectClass(classId) {
  selectedClass.value = classId;
}

function onEnter() {
  if (canStart.value) confirmarClasse();
}

onMounted(() => {
  const hasCompletedClassSelection = localStorage.getItem('hasCompletedClassSelection');
  if (hasCompletedClassSelection === 'true') {
    router.push('/map').catch((err) => {
      console.error('Erro ao redirecionar para /map:', err);
    });
    return;
  }

  gameState.initializePlayerName();

  if (gameState.player.name && gameState.player.name.trim()) {
    router.push('/cutscene').catch((err) => {
      console.error('Erro ao redirecionar:', err);
    });
    return;
  }

  playerName.value = gameState.player.name || '';
  selectedClass.value = gameState.player.classe || 'Guerreiro';
});

watch(playerName, (newName) => {
  gameState.setPlayerName(newName);
});

function confirmarClasse() {
  const nome = playerName.value.trim();
  if (!nome) return;

  if (clickSound.value) {
    clickSound.value.play().catch((e) => console.error('Erro ao tocar som:', e));
  }

  gameState.setPlayerClass(selectedClass.value);
  localStorage.setItem('hasCompletedClassSelection', 'true');

  router.push('/cutscene').catch((err) => {
    console.error('Erro ao redirecionar:', err);
  });
}
</script>

<style scoped>
.classe-screen {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(circle at top, rgba(92, 74, 110, 0.22), transparent 42%),
    linear-gradient(180deg, #120a06 0%, #1a0f07 45%, #0d0704 100%);
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fceabb;
  padding: 1.5rem 1rem 2.5rem;
  box-sizing: border-box;
}

.bg-texture {
  position: absolute;
  inset: 0;
  background-image: url('@/assets/class-bg.png');
  background-size: cover;
  background-position: center;
  opacity: 0.22;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 2;
  width: min(1080px, 100%);
  pointer-events: auto;
}

.title {
  margin: 0 0 8px;
  text-align: center;
  font-size: clamp(2rem, 4vw, 2.8rem);
  text-shadow: 2px 2px #000;
}

.subtitle {
  margin: 0 0 22px;
  text-align: center;
  color: rgba(245, 230, 200, 0.82);
  font-size: clamp(0.95rem, 2vw, 1.1rem);
}

.name-input {
  display: block;
  margin: 0 auto 24px;
  padding: 14px 24px;
  font-size: 1rem;
  border: 2px solid #e6b800;
  border-radius: 10px;
  width: min(360px, 100%);
  text-align: center;
  background-color: #fff8dc;
  color: #2c1a00;
  box-shadow: inset -3px -3px #e6b800, inset 3px 3px #fffbcc;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}

.class-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 3px solid rgba(26, 15, 7, 0.9);
  background:
    linear-gradient(165deg, rgba(60, 38, 24, 0.96), rgba(26, 15, 7, 0.98));
  color: #f5e6c8;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  box-shadow: var(--game-shadow-out);
}

.class-card:hover,
.class-card--active {
  transform: translateY(-2px);
  border-color: var(--class-accent, var(--game-border-gold));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--class-accent, #c9a227) 55%, transparent),
    var(--game-shadow-modal);
}

.class-card__portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border-radius: 10px;
  background:
    radial-gradient(circle at center, rgba(255, 230, 200, 0.12), transparent 65%),
    rgba(0, 0, 0, 0.28);
  border: 2px solid rgba(255, 230, 200, 0.08);
}

.class-card__sprite {
  width: 96px;
  height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
}

.class-card__body h2 {
  margin: 0 0 6px;
  font-size: 1.2rem;
  color: var(--class-accent, #f5e6c8);
}

.class-card__body p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(245, 230, 200, 0.82);
}

.class-detail {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  margin-bottom: 22px;
  border-radius: 14px;
  border: 4px solid var(--game-border-gold);
  background: linear-gradient(165deg, rgba(44, 24, 16, 0.94), rgba(18, 10, 4, 0.96));
  box-shadow: var(--game-shadow-modal);
}

.class-detail__chart,
.class-detail__summary {
  min-width: 0;
}

.class-detail h3 {
  margin: 0 0 12px;
  text-align: center;
  color: #f5e6c8;
}

.class-detail__summary p {
  margin: 0 0 14px;
  line-height: 1.5;
  color: rgba(245, 230, 200, 0.84);
}

.class-detail__stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.class-detail__stats li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(201, 162, 39, 0.22);
}

.actions {
  display: flex;
  justify-content: center;
}

.start-btn {
  padding: 12px 50px;
  background: #e6b800;
  color: #2c1a00;
  border: none;
  border-radius: 10px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 0 10px #fcd748;
}

.start-btn:hover {
  background: #ffd700;
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.click-sound {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 760px) {
  .class-detail {
    grid-template-columns: 1fr;
  }
}
</style>
