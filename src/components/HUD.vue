<template>
  <div class="main-hud game-ui-hud-root">
    <!-- Painel com vida e energia -->
    <div class="panel-frame game-ui-hud-panel">
      <!-- Vida -->
      <div class="stat vida">
        <div class="icon-container">
          <img src="/icons/life-icon.png" alt="Vida" class="icon" />
          <span class="lives-count">{{ gameState.player.lives }}</span>
        </div>
        <div class="bar-container segmented">
          <div
            v-for="i in maxBarSegments"
            :key="'vida-' + i"
            class="segment"
            :class="{ filled: i <= filledHealthSegments }"
          ></div>
          <span class="bar-label">
            {{ Math.floor(gameState.player.health) }}/{{ Math.floor(gameState.player.maxHealth) }}
          </span>
        </div>
      </div>

      <!-- Energia -->
      <div class="stat energia">
        <div class="icon-container">
          <img src="/icons/stam-icon.png" alt="Energia" class="icon" />
        </div>
        <div class="bar-container segmented">
          <div
            v-for="i in maxBarSegments"
            :key="'energia-' + i"
            class="segment"
            :class="{ filled: i <= filledStaminaSegments }"
          ></div>
          <span class="bar-label">
            {{ Math.floor(gameState.player.stamina) }}/{{ Math.floor(gameState.player.maxStamina) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Botões no lado direito central -->
    <div class="hud-buttons">
      <button class="menu-button" @click="togglePauseMenu" :class="{ active: pauseMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <button class="map-button" @click="handleMapClick">
        <img src="/icons/map-icon.png" alt="Mapa" class="button-icon" />
      </button>

      <button class="bag-button" @click="toggleBag">
        <img src="/icons/bag-icon.png" alt="Mochila" class="button-icon" />
      </button>
    </div>

    <Inventory v-if="inventoryOpen" />

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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

const maxBarSegments = 10

const filledHealthSegments = computed(() => {
  return Math.round((gameState.player.health / gameState.player.maxHealth) * maxBarSegments)
})

const filledStaminaSegments = computed(() => {
  return Math.round((gameState.player.stamina / gameState.player.maxStamina) * maxBarSegments)
})
</script>

<style scoped>
.main-hud {
  position: fixed;
  bottom: 10px;
  left: 5px;
  z-index: 1000;
  font-size: 6px;
  letter-spacing: 0.5px;
  font-family: var(--game-ui-font);
}

.panel-frame {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-container {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  margin-left: 20px;
  z-index: 10;
}

.lives-count {
  position: absolute;
  top: 60%;
  left: 80%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: var(--game-cream);
  text-shadow: 1px 1px 2px #000;
  font-weight: bold;
  z-index: 11;
}

.bar-container {
  position: relative;
  width: 280px;
  height: 34px;
  background: var(--game-bar-bg);
  border: 3px solid var(--game-bar-border);
  overflow: hidden;
  box-shadow: var(--game-shadow-inset), 0 2px 6px rgba(0, 0, 0, 0.45);
  border-radius: 4px;
}

.bar-label {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: var(--game-gold-bright);
  text-shadow: 2px 2px 0 #000;
  font-weight: bold;
  line-height: 24px;
  letter-spacing: 1px;
}

.bar-container.segmented {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5px;
  padding: 1px;
}

.segment {
  flex: none;
  width: 26px;
  height: 28px;
  background: var(--game-bar-empty);
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow: inset 0 0 4px #000;
}

.vida .segment.filled {
  background: linear-gradient(to bottom, var(--game-life-start), var(--game-life-end));
}

.energia .segment.filled {
  background: linear-gradient(
    to bottom,
    var(--game-stamina-start),
    var(--game-stamina-end)
  );
}

.moedas .bar-label {
  position: static;
  transform: none;
  font-size: 18px;
  margin-left: 10px;
}

.hud-buttons {
  position: fixed;
  right: 10px;
  top: -150%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-button,
.map-button,
.bag-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 122px;
  height: 122px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.map-button:hover img,
.bag-button:hover img,
.menu-button:hover {
  transform: scale(1.1);
  transition: transform 0.2s;
}

.map-button:active img,
.bag-button:active img,
.menu-button:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

.button-icon {
  width: 122px;
  height: 122px;
  image-rendering: pixelated;
  z-index: 12;
}

.menu-button {
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0);
  padding: 20px;
  z-index: 12;
}

.menu-button span {
  display: block;
  width: 60px;
  height: 8px;
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(
    ellipse at center,
    rgba(30, 18, 8, 0.55) 0%,
    var(--game-overlay-scrim) 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;
  animation: fadeIn 0.3s ease-in-out;
  backdrop-filter: blur(2px);
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