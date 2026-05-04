<template>
  <div class="menu-container fade-in">
    <img src="@/assets/menu-bg.jpg" class="background-image" alt="Background" />
    <img src="@/assets/Logo.png" alt="Logo Last Knight" class="game-logo" />

    <div class="menu" v-if="!showOptions">
      <div class="menu-button story" @click="goToStory">{{ texts[language].story }}</div>
      <div class="menu-button options" @click="openOptions">{{ texts[language].options }}</div>
      <div class="menu-button credits" @click="goTo('creditsscreen')">{{ texts[language].credits }}</div>
    </div>

    <div class="btn-fullscreen" @click="toggleFullscreen">
      <img src="@/assets/fullscreen-icon.png" alt="Fullscreen" class="fullscreen-icon" />
    </div>

    <div class="btn-sound" @click="toggleMute">
      <img :src="isMuted ? 'icons/music-icon.png' : 'icons/mute-music-icon.png'" alt="Sound Toggle" class="sound-icon" />
    </div>

    <!-- OVERLAY DE OPÇÕES -->
    <Options v-if="showOptions" @close="showOptions = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Options from './Options.vue' // importe aqui

const router = useRouter()

const showOptions = ref(false) // controla o overlay

const texts = {
  pt: { story: "HISTÓRIA", endless: "INFINITO", options: "OPÇÕES", credits: "CRÉDITOS" },
  en: { story: "STORY", endless: "ENDLESS", options: "OPTIONS", credits: "CREDITS" }
}

const language = ref('pt')
const isMuted = ref(localStorage.getItem('isMuted') === 'true')
let clickSound
let backgroundMusic

onMounted(() => {
  const savedLang = localStorage.getItem('language')
  if (savedLang && ['pt', 'en'].includes(savedLang)) {
    language.value = savedLang
  }

  clickSound = new Audio('/sounds/click.wav')
  clickSound.volume = isMuted.value ? 0 : 1
  clickSound.onerror = () => console.error('Failed to load click sound')

  backgroundMusic = new Audio('/audio/musica-menu.ogg')
  backgroundMusic.loop = true
  backgroundMusic.volume = isMuted.value ? 0 : 0
  backgroundMusic.onerror = () => console.error('Failed to load background music')

  const tryPlayMusic = () => {
    if (!isMuted.value) {
      backgroundMusic.play().then(() => fadeInMusic())
        .catch(err => console.warn('Erro ao tocar música após clique:', err))
    }
    document.removeEventListener('click', tryPlayMusic)
  }

  document.addEventListener('click', tryPlayMusic)
})

function playClick() {
  if (!isMuted.value && clickSound) {
    clickSound.currentTime = 0
    clickSound.play()
  }
}

function goTo(route) {
  playClick()
  fadeOutMusic(() => router.push(`/${route}`))
}

function goToStory() {
  playClick()
  const hasClass = localStorage.getItem('playerClass')
  fadeOutMusic(() => router.push(hasClass ? '/map' : '/class'))
}

function toggleFullscreen() {
  playClick()
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.error)
  } else {
    document.exitFullscreen().catch(console.error)
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  localStorage.setItem('isMuted', isMuted.value)
  if (clickSound) clickSound.volume = isMuted.value ? 0 : 1
  if (backgroundMusic) {
    backgroundMusic.volume = isMuted.value ? 0 : 0.4
    if (isMuted.value) {
      backgroundMusic.pause()
      backgroundMusic.currentTime = 0
    } else {
      backgroundMusic.play().catch(err => console.warn('Erro ao retomar música:', err))
    }
  }
}

function fadeOutMusic(callback) {
  if (!backgroundMusic || isMuted.value) return callback()
  const fadeInterval = setInterval(() => {
    if (backgroundMusic.volume > 0.05) {
      backgroundMusic.volume -= 0.05
    } else {
      backgroundMusic.pause()
      clearInterval(fadeInterval)
      callback()
    }
  }, 50)
}

function fadeInMusic() {
  if (!backgroundMusic || isMuted.value) return
  backgroundMusic.volume = 0
  const fadeInterval = setInterval(() => {
    if (backgroundMusic.volume < 0.4) {
      backgroundMusic.volume += 0.02
    } else {
      backgroundMusic.volume = 0.4
      clearInterval(fadeInterval)
    }
  }, 100)
}

function openOptions() {
  playClick()
  showOptions.value = true
}
onUnmounted(() => {
  if (backgroundMusic) {
    backgroundMusic.pause()
    backgroundMusic.currentTime = 0
    backgroundMusic.src = ''
  }
  if (clickSound) {
    clickSound.pause()
    clickSound.currentTime = 0
    clickSound.src = ''
  }
  document.removeEventListener('click', tryPlayMusic)
})
</script>


<style scoped>
.fade-in {
  animation: fadeIn 1.5s ease-in;
}
@keyframes fadeIn {
  0% { opacity: 0; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}

/* CONTAINER */
.menu-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* BACKGROUND */
.background-image {
  position: fixed;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  filter: blur(1px);
}

/* LOGO ANIMADA */
.game-logo {
  width: 450px;
  margin: 20px auto 20px;
  display: block;
  animation: pulseGlow 3s ease-in-out infinite;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
}

@keyframes pulseGlow {
  0% {
    transform: scale(1) rotate(0deg);
    filter: brightness(1) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
  }
  50% {
    transform: scale(1.05) rotate(2deg);
    filter: brightness(1.2) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 10px rgba(249, 231, 159, 0.7));
  }
  100% {
    transform: scale(1) rotate(0deg);
    filter: brightness(1) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
  }
}

/* BOTÕES */
.menu {
  display: grid;
  gap: 20px;
  justify-content: center;
  margin-top: 20px;
}

.menu-button {
  background-color: #e0a867;
  color: #5c2c1d;
  border: 4px solid #5c2c1d;
  padding: 10px 40px;
  width: 200px;
  height: 30px;
  font-size: 30px;
  text-align: center;
  cursor: pointer;
  position: relative;
  image-rendering: pixelated;
  box-shadow: inset -6px -6px #d17844, inset 6px 6px #ffcb8e;
  font-weight: bold;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
}

.menu-button:hover {
  background-color: #f4b76a;
  color: #3e1e14;
  box-shadow: inset -6px -6px #c96a32, inset 6px 6px #ffd9a1;
}

.menu-button:active {
  transform: translateY(2px);
  box-shadow: inset -3px -3px #d17844, inset 3px 3px #ffcb8e;
}

/* BOTÃO FULLSCREEN */
.btn-fullscreen {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: #e0a867;
  border: 3px solid #5c2c1d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset -4px -4px #d17844, inset 4px 4px #ffcb8e;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
  z-index: 10;
}

.btn-fullscreen:hover {
  background-color: #f4b76a;
  box-shadow: inset -4px -4px #c96a32, inset 4px 4px #ffd9a1;
}

.btn-fullscreen:active {
  transform: translateY(2px);
  box-shadow: inset -2px -2px #d17844, inset 2px 2px #ffcb8e;
}

.fullscreen-icon {
  width: 24px;
  height: 24px;
}

/* BOTÃO DE SOM */
.btn-sound {
  position: fixed;
  bottom: 85px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: #e0a867;
  border: 3px solid #5c2c1d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset -4px -4px #d17844, inset 4px 4px #ffcb8e;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
  z-index: 10;
}

.btn-sound:hover {
  background-color: #f4b76a;
  box-shadow: inset -4px -4px #c96a32, inset 4px 4px #ffd9a1;
}

.btn-sound:active {
  transform: translateY(2px);
  box-shadow: inset -2px -2px #d17844, inset 2px 2px #ffcb8e;
}

.sound-icon {
  width: 24px;
  height: 24px;
}
</style>
