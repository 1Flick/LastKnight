<template>
  <div class="main-hud game-ui-hud-root">
    <!-- Centro inferior: vida (anel) | inventário | stamina (anel), estilo Trove -->
    <div class="hud-bottom-cluster">
      <div class="orb orb--health" role="status" aria-label="Vida">
        <svg class="orb-svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient :id="orbGradIdHp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff6b6b" />
              <stop offset="100%" stop-color="#8b1515" />
            </linearGradient>
          </defs>
          <circle class="orb-track" cx="50" cy="50" :r="ringR" fill="none" />
          <circle
            class="orb-arc orb-arc--health"
            cx="50"
            cy="50"
            :r="ringR"
            fill="none"
            :stroke="`url(#${orbGradIdHp})`"
            :stroke-dasharray="ringCircumference"
            :stroke-dashoffset="healthRingOffset"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div class="orb-core">
          <span class="orb-pct">{{ healthPercent }}%</span>
          <span class="orb-meta">{{ gameState.player.lives }} ♥</span>
        </div>
      </div>

      <button
        type="button"
        class="hud-bag-center"
        @click="toggleBag"
        aria-label="Abrir inventário"
      >
        <img src="/icons/bag-icon.png" alt="" class="hud-bag-center-icon" />
      </button>

      <div class="orb orb--stamina" role="status" aria-label="Energia">
        <svg class="orb-svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient :id="orbGradIdSt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#9feb6a" />
              <stop offset="100%" stop-color="#2d5016" />
            </linearGradient>
          </defs>
          <circle class="orb-track" cx="50" cy="50" :r="ringR" fill="none" />
          <circle
            class="orb-arc orb-arc--stamina"
            cx="50"
            cy="50"
            :r="ringR"
            fill="none"
            :stroke="`url(#${orbGradIdSt})`"
            :stroke-dasharray="ringCircumference"
            :stroke-dashoffset="staminaRingOffset"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div class="orb-core">
          <span class="orb-pct">{{ staminaPercent }}%</span>
          <span class="orb-meta orb-meta--dim">STA</span>
        </div>
      </div>
    </div>

    <!-- Menu + mapa à direita -->
    <div class="hud-buttons hud-buttons--side">
      <button type="button" class="menu-button" @click="togglePauseMenu" :class="{ active: pauseMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <button type="button" class="map-button" @click="handleMapClick">
        <img src="/icons/map-icon.png" alt="Mapa" class="button-icon" />
      </button>
    </div>

    <Teleport to="body">
      <div v-if="inventoryOpen" class="inventory-shell">
        <div
          class="inventory-backdrop"
          aria-hidden="true"
          @click.self="inventoryOpen = false"
        />
        <Inventory @update:show="onInventoryShow" />
      </div>
    </Teleport>

    <!-- Menu de Pausa -->
    <div v-if="pauseMenuOpen" class="pause-menu-overlay">
      <div class="pause-menu">
        <h2 class="pause-title">Menu</h2>
        <div class="pause-options">
          <button class="pause-option" @click="continuarJogo">Continuar</button>
          <button class="pause-option" @click="irParaOpcoes">Opções</button>
          <button class="pause-option-sair" @click="voltarAoMenu">Sair</button>
        </div>
      </div>
    </div>

    <!-- Opções como overlay -->
<Options v-if="optionsOverlayOpen" @close="optionsOverlayOpen = false" />

    <!-- Mensagem de recompensa -->
    <div v-if="tossRewardMessage" class="reward-message game-ui-toast--reward">
      {{ tossRewardMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, useId } from 'vue'
import { useRouter } from 'vue-router'
import Inventory from '@/components/Inventory.vue'
import Options from '@/components/Options.vue'
import { useGameState } from '@/stores/gameState'

const audioManager = {
  mapOpenSound: new Audio('/sounds/map.mp3'),
  bagOpenSound: new Audio('/sounds/zipper.mp3'),
  menuToggleSound: new Audio('/sounds/click.wav'),
  buttonClickSound: new Audio('/sounds/click.wav'),
}
audioManager.mapOpenSound.volume = 0.5
audioManager.bagOpenSound.volume = 0.5
audioManager.menuToggleSound.volume = 0.5
audioManager.buttonClickSound.volume = 0.5

defineProps(['potions', 'coins', 'tossRewardMessage'])
const gameState = useGameState()
const router = useRouter()

const orbGradIdHp = `hud-orb-hp-${useId()}`
const orbGradIdSt = `hud-orb-st-${useId()}`

const inventoryOpen = ref(false)
const pauseMenuOpen = ref(false)
const optionsOverlayOpen = ref(false)

const startAudioOnInteraction = () => {
  try {
    [
      audioManager.bagOpenSound,
      audioManager.mapOpenSound,
      audioManager.menuToggleSound,
      audioManager.buttonClickSound
    ].forEach((sound) => {
      sound.play().then(() => sound.pause()).catch(() => {})
    })
  } catch (error) {
    console.error(error)
  }
  document.removeEventListener('click', startAudioOnInteraction)
  document.removeEventListener('keydown', startAudioOnInteraction)
}

onMounted(() => {
  document.addEventListener('click', startAudioOnInteraction)
  document.addEventListener('keydown', startAudioOnInteraction)
})

onUnmounted(() => {
  document.removeEventListener('click', startAudioOnInteraction)
  document.removeEventListener('keydown', startAudioOnInteraction)
  Object.values(audioManager).forEach(sound => sound.pause())
})

watch(inventoryOpen, (newValue) => {
  if (newValue) {
    audioManager.bagOpenSound.currentTime = 0
    audioManager.bagOpenSound.play().catch(() => {})
  }
})

const toggleBag = () => {
  if (pauseMenuOpen.value) return
  inventoryOpen.value = !inventoryOpen.value
}

const onInventoryShow = (open) => {
  if (!open) inventoryOpen.value = false
}

const togglePauseMenu = () => {
  pauseMenuOpen.value = !pauseMenuOpen.value
  if (pauseMenuOpen.value) inventoryOpen.value = false
  audioManager.menuToggleSound.currentTime = 0
  audioManager.menuToggleSound.play().catch(() => {})
}

const continuarJogo = () => {
  audioManager.buttonClickSound.currentTime = 0
  audioManager.buttonClickSound.play().catch(() => {})
  pauseMenuOpen.value = false
}

const irParaOpcoes = () => {
  audioManager.buttonClickSound.currentTime = 0
  audioManager.buttonClickSound.play().catch(() => {})
  optionsOverlayOpen.value = true
}

const voltarAoMenu = () => {
  audioManager.buttonClickSound.currentTime = 0
  audioManager.buttonClickSound.play().catch(() => {})
  router.push('/')
}

const handleMapClick = () => {
  if (pauseMenuOpen.value) return
  audioManager.mapOpenSound.currentTime = 0
  audioManager.mapOpenSound.play().catch(() => {})
  setTimeout(() => {
    router.push('/map')
  }, 150)
}

/** Anel SVG (viewBox 100×100), mesmo raio dos dois orbes */
const ringR = 38
const ringCircumference = 2 * Math.PI * ringR

const healthPercent = computed(() => {
  const max = gameState.player.maxHealth || 1
  return Math.min(100, Math.max(0, Math.round((gameState.player.health / max) * 100)))
})

const staminaPercent = computed(() => {
  const max = gameState.player.maxStamina || 1
  return Math.min(100, Math.max(0, Math.round((gameState.player.stamina / max) * 100)))
})

const healthRingOffset = computed(() => {
  const p = healthPercent.value / 100
  return ringCircumference * (1 - p)
})

const staminaRingOffset = computed(() => {
  const p = staminaPercent.value / 100
  return ringCircumference * (1 - p)
})
</script>

<style scoped>
.main-hud {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  font-family: var(--game-ui-font);
  --orb-size: clamp(76px, 19vmin, 132px);
  --hud-btn-size: clamp(44px, 11vmin, 104px);
  --hud-bag-size: clamp(56px, 14vmin, 104px);
}

/* Faixa inferior central — Trove-like */
.hud-bottom-cluster {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 3.5vmin, 28px);
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}

.orb {
  position: relative;
  width: var(--orb-size);
  height: var(--orb-size);
  flex-shrink: 0;
}

.orb-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.orb-track {
  stroke: rgba(12, 8, 6, 0.92);
  stroke-width: 9;
}

.orb-arc {
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.28s ease-out;
}

.orb-core {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.orb-pct {
  font-size: clamp(17px, 4.2vmin, 28px);
  font-weight: 800;
  color: var(--game-cream);
  text-shadow:
    0 1px 0 #000,
    0 -1px 0 rgba(0, 0, 0, 0.85),
    2px 2px 4px rgba(0, 0, 0, 0.9);
  line-height: 1;
}

.orb-meta {
  margin-top: 4px;
  font-size: clamp(11px, 2.6vmin, 14px);
  font-weight: 700;
  color: var(--game-gold-bright);
  text-shadow: 1px 1px 2px #000;
}

.orb-meta--dim {
  font-size: clamp(10px, 2.2vmin, 12px);
  letter-spacing: 0.12em;
  opacity: 0.85;
}

.hud-bag-center {
  pointer-events: auto;
  flex-shrink: 0;
  width: var(--hud-bag-size);
  height: var(--hud-bag-size);
  padding: clamp(6px, 1.6vmin, 12px);
  border: 4px solid var(--game-border-gold);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 30%,
    rgba(80, 52, 28, 0.95) 0%,
    rgba(26, 15, 7, 0.98) 55%,
    #120a05 100%
  );
  box-shadow:
    inset 0 2px 10px rgba(255, 220, 160, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.hud-bag-center:hover {
  transform: scale(1.06);
  transition: transform 0.18s ease;
}

.hud-bag-center:active {
  transform: scale(0.96);
}

.hud-bag-center-icon {
  width: 72%;
  height: 72%;
  object-fit: contain;
  image-rendering: pixelated;
}

/* Menu + mapa: canto superior direito (fora do cluster inferior) */
.hud-buttons--side {
  position: fixed;
  top: max(10px, env(safe-area-inset-top, 0px));
  right: max(10px, env(safe-area-inset-right, 0px));
  bottom: auto;
  transform: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(8px, 2vmin, 14px);
  z-index: 1001;
  pointer-events: auto;
}

.inventory-shell {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px))
    max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  pointer-events: auto;
  box-sizing: border-box;
}

.inventory-backdrop {
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: auto;
}

.menu-button,
.map-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  width: var(--hud-btn-size);
  height: var(--hud-btn-size);
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}

.map-button:hover img,
.menu-button:hover {
  transform: scale(1.1);
  transition: transform 0.2s;
}

.map-button:active img,
.menu-button:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

.button-icon {
  width: 78%;
  height: 78%;
  max-width: var(--hud-btn-size);
  max-height: var(--hud-btn-size);
  object-fit: contain;
  image-rendering: pixelated;
  z-index: 12;
}

.menu-button {
  flex-direction: column;
  gap: clamp(6px, 1.5vmin, 10px);
  background: rgba(0, 0, 0, 0);
  padding: clamp(8px, 2vmin, 20px);
  z-index: 12;
}

.menu-button span {
  display: block;
  width: min(60px, 52%);
  height: clamp(5px, 1.2vmin, 8px);
  background-color: var(--game-gold-bright);
  border-radius: 4px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
  transition: all 0.3s ease;
}

.menu-button.active span:nth-child(1) {
  transform: rotate(45deg) translate(12px, 12px);
}

.menu-button.active span:nth-child(2) {
  opacity: 0;
}

.menu-button.active span:nth-child(3) {
  transform: rotate(-45deg) translate(14px, -14px);
}

.pause-menu-overlay {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  width: auto;
  height: auto;
  min-height: 100dvh;
  background: radial-gradient(
    ellipse at center,
    rgba(30, 18, 8, 0.55) 0%,
    var(--game-overlay-scrim) 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10020;
  animation: fadeIn 0.3s ease-in-out;
  backdrop-filter: blur(2px);
  box-sizing: border-box;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pause-menu {
  background: linear-gradient(
    165deg,
    var(--game-honey-light) 0%,
    var(--game-honey) 45%,
    var(--game-honey-shadow) 100%
  );
  border: 6px solid var(--game-wood-dark);
  border-radius: 10px;
  padding: 30px;
  width: 400px;
  box-shadow: inset -6px -6px var(--game-honey-shadow),
    inset 6px 6px var(--game-honey-light), var(--game-shadow-out);
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.8); }
  to { transform: scale(1); }
}

.pause-title {
  font-size: 40px;
  color: var(--game-wood-dark);
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 2px 2px var(--game-honey-shadow);
  font-family: var(--game-ui-font);
}

.pause-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.pause-option-sair {
  font-family: var(--game-ui-font);
  background-color: var(--game-danger);
  color: #ffe8e8;
  border: 4px solid var(--game-danger-dark);
  padding: 15px;
  font-size: 24px;
  text-align: center;
  cursor: pointer;
  box-shadow: inset -6px -6px #8b1515, inset 6px 6px #ff6b6b;
  font-weight: bold;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
}

.pause-option-sair:hover {
  background-color: #e04545;
  color: #fff;
  box-shadow: inset -6px -6px #6b1010, inset 6px 6px #ff9090;
}

.pause-option-sair:active {
  transform: translateY(2px);
  box-shadow: inset -3px -3px #9b2020, inset 3px 3px #ff7a7a;
}

.pause-option {
  font-family: var(--game-ui-font);
  background-color: var(--game-honey);
  color: var(--game-wood-dark);
  border: 4px solid var(--game-wood-dark);
  padding: 15px;
  font-size: 24px;
  text-align: center;
  cursor: pointer;
  box-shadow: inset -6px -6px var(--game-honey-shadow),
    inset 6px 6px var(--game-honey-light);
  font-weight: bold;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
}

.pause-option:hover {
  background-color: #f4b76a;
  color: #3e1e14;
  box-shadow: inset -6px -6px #c96a32, inset 6px 6px #ffd9a1;
}

.pause-option:active {
  transform: translateY(2px);
  box-shadow: inset -3px -3px var(--game-honey-shadow),
    inset 3px 3px var(--game-honey-light);
}

/* Visual principal em game-ui-toast--reward (medieval-theme.css) */
.reward-message {
  pointer-events: none;
}
</style>