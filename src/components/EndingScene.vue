<template>
  <div>
    <!-- Start Cutscene Button -->
    <div v-if="!isCutsceneStarted" class="start-cutscene-container">
      <button @click="startCutscene" class="game-start-button" @mousedown="playClickSound">
        <span class="button-glow"></span>
        Iniciar Cutscene
      </button>
    </div>

    <!-- Cutscene Content -->
    <div v-if="isCutsceneStarted" class="game-container" :style="{ backgroundImage: `url(${isCreditsScene ? creditsBackground : currentSceneData?.backgroundImage})` }" :class="{ 'fade-in': isMounted, 'fade-out': isFadingOut }" v-show="isVisible">
      <!-- Letterbox effect -->
      <div class="letterbox-top"></div>
      <div class="letterbox-bottom"></div>
      
      <!-- Vignette overlay -->
      <div class="vignette-overlay"></div>
      
      <!-- Particles effect -->
      <div class="particles-container">
        <div v-for="n in 50" :key="n" class="particle" :style="getParticleStyle(n)"></div>
      </div>
      
      <!-- Background zoom effect -->
      <div class="background-zoom" :style="{ backgroundImage: `url(${isCreditsScene ? creditsBackground : currentSceneData?.backgroundImage})` }"></div>
      
      <!-- Dialog box with game styling -->
      <div class="game-dialog-box" v-if="showDialog && !isChoiceScene && !isCreditsScene">
        <div class="dialog-text-container">
          <p class="game-text">{{ displayedText }}</p>
        </div>
      </div>

      <!-- Choice buttons for moral decision -->
      <div v-if="isChoiceScene && !isCreditsScene" class="choice-container">
        <button @click="makeChoice('sacrificeSelf')" class="game-choice-button" @mousedown="playClickSound">
          <span class="button-glow"></span>
          Trocar a Vida pela Princesa
        </button>
        <button @click="makeChoice('bothDie')" class="game-choice-button" @mousedown="playClickSound">
          <span class="button-glow"></span>
          Os dois Morrem
        </button>
        <button v-if="gameState.player.hasForbiddenPotion" @click="makeChoice('useForbiddenPotion')" class="game-choice-button" @mousedown="playClickSound">
          <span class="button-glow"></span>
          Usar Poção Proibida
        </button>
      </div>
      
      <!-- Credits sequence -->
      <div v-if="isCreditsScene" class="credits-container">
        <div class="credits-text">
          <h1 class="game-text credits-title">Créditos</h1>
          <p class="game-text">Leonardo Fratoni Borges da Silva</p>
          <p class="game-text">Eduardo Viana Marques</p>
          <p class="game-text">Pedro Lucas Gomes Braido</p>
          <p class="game-text">Matheus Costa e Silva</p>
          <p class="game-text">Lucas Leonardo Reche</p>
          <p class="game-text">Agradecimentos Especiais</p>
          <p class="game-text">Unicesumar Maringá</p>
          <p class="game-text">Hugo Fumero</p>
          <p class="game-text">ESOFT 3 Semestre A</p>
          <p class="game-text">Comunidade de Albadia</p>
          <p class="game-text">Obrigado por Jogar!</p>
        </div>
        <!-- Exit button -->
        <button @click="exitCredits" class="game-choice-button exit-button" @mousedown="playClickSound">
          <span class="button-glow"></span>
          Sair
        </button>
      </div>
      
      <!-- Audio elements -->
      <audio ref="bgAudio" loop>
        <source :src="currentSceneData?.bgMusic || '/audio/cutscene/final_music.mp3'" type="audio/mp3" />
      </audio>
      <audio ref="narrationAudio">
        <source :src="currentSceneData?.narration || ''" type="audio/mp3" />
      </audio>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useGameState } from '@/stores/gameState';
import clickSound from '/sounds/click.wav';

const gameState = useGameState();
const router = useRouter();
const bgAudio = ref(null);
const narrationAudio = ref(null);
const sfxAudio = ref(null);
const clickAudio = ref(new Audio(clickSound));
const isMounted = ref(false);
const isFadingOut = ref(false);
const isVisible = ref(true);
const showDialog = ref(true);
const displayedText = ref('');
const typing = ref(false);
const currentSceneIndex = ref(0);
const isCutsceneStarted = ref(false);
const isChoiceScene = ref(false);  
const isCreditsScene = ref(false);
const creditsBackground = ref('/img/cutscene/default_credits.png'); // Fundo padrão para créditos

const cutscenes = {
  inicio: [
    { 
      speaker: 'Narrador', 
      text: 'O Destino Pende na Balança. As sombras se alongam, e o eco de uma nova escolha inevitável ressoa pelas muralhas. Um herói, uma princesa, um sacrifício: o quê será selado sob o peso desta decisão?', 
      backgroundImage: '/img/cutscene/final_scene.png', 
      narration: '/audio/cutscene/cena_final.mp3',
      bgMusic: '/audio/cutscene/final_music.mp3'
    },
  ]
};

const currentSceneData = computed(() => cutscenes.inicio[currentSceneIndex.value]);

let typingInterval = null;

function getParticleStyle(index) {
  const delay = Math.random() * 10;
  const duration = 15 + Math.random() * 10;
  const left = Math.random() * 100;
  const size = 1 + Math.random() * 3;
  
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
  };
}

function ensureAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && bgAudio.value) {
    const context = new AudioContext();
    if (context.state === 'suspended') {
      return context.resume().then(() => {
        bgAudio.value.play().catch(error => console.error('Erro ao retomar música:', error));
      });
    }
  }
  return Promise.resolve();
}

function typeText() {
  typing.value = true;
  displayedText.value = '';
  let i = 0;
  typingInterval = setInterval(() => {
    if (i < currentSceneData.value.text.length) {
      displayedText.value += currentSceneData.value.text[i];
      i++;
    } else {
      clearInterval(typingInterval);
      typing.value = false;
      if (currentSceneIndex.value < cutscenes.inicio.length - 1) {
        setTimeout(() => {
          nextScene();
        }, 3000);
      } else {
        setTimeout(() => {
          isChoiceScene.value = true;
          showDialog.value = false;
        }, 5000);
      }
    }
  }, 80);
}

function nextScene() {
  if (currentSceneIndex.value < cutscenes.inicio.length - 1) {
    isFadingOut.value = true;
    setTimeout(() => {
      currentSceneIndex.value++;
      isMounted.value = false;
      playAudio();
      setTimeout(() => {
        isFadingOut.value = false;
        isMounted.value = true;
        typeText();
      }, 1000);
    }, 1000);
  }
}

function playAudio() {
  if (bgAudio.value && bgAudio.value.paused) {
    bgAudio.value.src = currentSceneData.value.bgMusic || '/audio/cutscene/final_music.mp3';
    bgAudio.value.volume = 0.2;
    bgAudio.value.play().catch(error => console.error('Erro ao reproduzir música de fundo:', error));
  }
  if (narrationAudio.value && currentSceneData.value.narration) {
    narrationAudio.value.pause();
    narrationAudio.value.currentTime = 0;
    narrationAudio.value.src = currentSceneData.value.narration;
    narrationAudio.value.load();
    narrationAudio.value.volume = 1;
    narrationAudio.value.play().catch(error => console.error('Erro ao reproduzir narração:', error));
  }
  if (sfxAudio.value && currentSceneData.value.sfx) {
    sfxAudio.value.pause();
    sfxAudio.value.currentTime = 0;
    sfxAudio.value.src = currentSceneData.value.sfx;
    sfxAudio.value.load();
    sfxAudio.value.volume = 0.6;
    sfxAudio.value.play().catch(error => console.error('Erro ao reproduzir efeito sonoro:', error));
  }
}

function playClickSound() {
  if (clickAudio.value) {
    clickAudio.value.currentTime = 0;
    clickAudio.value.play().catch(error => console.error('Erro ao reproduzir som de clique:', error));
  }
}

function startCutscene() {
  playClickSound();
  isCutsceneStarted.value = true;
  ensureAudioContext().then(() => {
    if (bgAudio.value) {
      bgAudio.value.volume = 0.2;
      bgAudio.value.load();
      bgAudio.value.play().catch(error => {
        console.error('Erro ao reproduzir música de fundo:', error);
        console.log('Caminho do arquivo de música:', bgAudio.value.src);
      });
    }
    playAudio();
    typeText();
  });
}

function makeChoice(choice) {
  playClickSound();
  isFadingOut.value = true;
  // Pausar apenas narração e efeitos sonoros, mantendo música de fundo
  if (narrationAudio.value) {
    narrationAudio.value.pause();
    narrationAudio.value.currentTime = 0;
  }
  if (sfxAudio.value) {
    sfxAudio.value.pause();
    sfxAudio.value.currentTime = 0;
  }
  // Define o fundo dos créditos com base na escolha
  switch (choice) {
    case 'sacrificeSelf':
      creditsBackground.value = '/img/cutscene/bob_morte.png';
      gameState.triggerEnding('sacrifice_self');
      gameState.takeDamage(gameState.player.maxHealth);
      break;
    case 'bothDie':
      creditsBackground.value = '/img/cutscene/ambos_morte.png';
      gameState.triggerEnding('both_die');
      gameState.takeDamage(gameState.player.maxHealth);
      break;
    case 'useForbiddenPotion':
      creditsBackground.value = '/img/cutscene/final_feliz.png';
      gameState.triggerEnding('forbidden_potion_ending');
      gameState.useItem('potion_forbidden');
      gameState.removeItemFromInventory('potion_forbidden', 1);
      gameState.player.hasForbiddenPotion = false;
      gameState.player.health = gameState.player.maxHealth;
      console.log('Poção Proibida usada: Jogador e Princesa sobrevivem!');
      break;
  }
  setTimeout(() => {
    isVisible.value = false;
    setTimeout(() => {
      isFadingOut.value = false;
      isVisible.value = true;
      isChoiceScene.value = false;
      isCreditsScene.value = true;
      isMounted.value = true;
      // Garantir que a música continue tocando
      if (bgAudio.value && bgAudio.value.paused) {
        bgAudio.value.play().catch(error => console.error('Erro ao retomar música nos créditos:', error));
      }
    }, 1000);
  }, 1500);
}

function exitCredits() {
  playClickSound();
  isFadingOut.value = true;
  // Pausar a música apenas ao sair
  if (bgAudio.value) {
    bgAudio.value.pause();
    bgAudio.value.currentTime = 0;
  }
  setTimeout(() => {
    isVisible.value = false;
    router.push('/');
  }, 1500);
}

onMounted(() => {
  nextTick(() => {
    isMounted.value = true;
  });
});

onUnmounted(() => {
  if (typingInterval) clearInterval(typingInterval);
  if (router.currentRoute.value.path !== '/level/cutscene') {
    if (bgAudio.value) {
      bgAudio.value.pause();
      bgAudio.value.currentTime = 0;
    }
    if (narrationAudio.value) {
      narrationAudio.value.pause();
      narrationAudio.value.currentTime = 0;
    }
    if (sfxAudio.value) {
      sfxAudio.value.pause();
      sfxAudio.value.currentTime = 0;
    }
  }
});

watch(() => router.currentRoute.value.path, (newPath) => {
  if (newPath !== '/level/cutscene') {
    isFadingOut.value = true;
    setTimeout(() => {
      isVisible.value = false;
      isFadingOut.value = false;
    }, 1500);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Uncial+Antiqua&display=swap');

.start-cutscene-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #0a0a0a;
}

.game-container {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100vh;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  opacity: 1;
  transition: opacity 1s ease, transform 1s ease;
  background-color: #0a0a0a;
}

.game-container.fade-in {
  opacity: 0;
  transform: scale(0.98);
  animation: gameFadeIn 2s ease-in-out forwards;
}

.game-container.fade-out {
  opacity: 1;
  transform: scale(1);
  animation: gameFadeOut 1s ease-in-out forwards;
}

@keyframes gameFadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes gameFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.02);
  }
}

/* Letterbox effect */
.letterbox-top,
.letterbox-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.7));
  z-index: 10;
}

.letterbox-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.2));
}

.letterbox-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2));
}

/* Vignette overlay */
.vignette-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%);
  z-index: 2;
  pointer-events: none;
}

/* Background zoom effect */
.background-zoom {
  position: absolute;
  top: -10%;
  left: -10%;
  right: -10%;
  bottom: -10%;
  background-size: cover;
  background-position: center;
  animation: backgroundZoom 20s ease-in-out infinite alternate;
  z-index: 1;
}

@keyframes backgroundZoom {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.05);
  }
}

/* Particles */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 3;
}

.particle {
  position: absolute;
  background: rgba(255, 215, 55, 0.3);
  border-radius: 50%;
  animation: particleFloat linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* Dialog box */
.game-dialog-box {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(20, 15, 10, 0.95), rgba(40, 30, 20, 0.95));
  border: 3px solid #8b7355;
  border-radius: 0;
  padding: 30px 40px;
  max-width: 80%;
  min-width: 60%;
  z-index: 10;
  box-shadow: 
    0 0 30px rgba(0, 0, 0, 0.8),
    inset 0 0 10px rgba(139, 115, 85, 0.1),
    0 0 60px rgba(139, 115, 55, 0.2);
  backdrop-filter: blur(5px);
}

.dialog-text-container {
  position: relative;
}

.game-text {
  font-family: 'Cinzel', 'Uncial Antiqua', serif;
  font-size: 22px;
  font-weight: 500;
  color: #f4e4bc;
  text-align: center;
  line-height: 1.6;
  margin: 0;
  text-shadow: 
    2px 2px 4px rgba(0, 0, 0, 0.8),
    0 0 10px rgba(244, 228, 188, 0.3),
    0 0 20px rgba(139, 115, 85, 0.2);
  letter-spacing: 0.5px;
}

/* Credits container */
.credits-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  overflow: hidden;
}

.credits-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  animation: creditsScroll 40s linear forwards; /* Aumentado de 20s para 40s */
  padding: 100vh 0;
}

@keyframes creditsScroll {
  0% {
    transform: translateY(100vh);
  }
  100% {
    transform: translateY(-100%);
  }
}

.credits-title {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 40px;
}

/* Exit button */
.exit-button {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

/* Choice buttons */
.choice-container {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
}

.game-choice-button {
  position: relative;
  padding: 15px 25px;
  background: linear-gradient(135deg, rgba(40, 30, 20, 0.9), rgba(20, 15, 10, 0.9));
  color: #d4af37;
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: 500;
  border: 2px solid #8b7355;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  overflow: hidden;
  box-shadow: 
    0 0 15px rgba(0, 0, 0, 0.6),
    inset 0 0 10px rgba(212, 175, 55, 0.1);
  min-width: 300px;
  text-align: center;
}

.game-choice-button:hover {
  transform: scale(1.05);
  background: linear-gradient(135deg, rgba(60, 45, 30, 0.9), rgba(40, 30, 20, 0.9));
  box-shadow: 
    0 0 25px rgba(212, 175, 55, 0.4),
    inset 0 0 15px rgba(212, 175, 55, 0.2);
  color: #f4e4bc;
  border-color: #d4af37;
}

.game-choice-button:hover .button-glow {
  left: 100%;
}

.game-choice-button:active {
  transform: scale(0.98);
}

/* Start button */
.game-start-button {
  position: relative;
  padding: 15px 25px;
  background: linear-gradient(135deg, rgba(40, 30, 20, 0.9), rgba(20, 15, 10, 0.9));
  color: #d4af37;
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: 500;
  border: 2px solid #8b7355;
  border-radius: 0;
  cursor: pointer;
  z-index: 20;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  overflow: hidden;
  box-shadow: 
    0 0 15px rgba(0, 0, 0, 0.6),
    inset 0 0 10px rgba(212, 175, 55, 0.1);
  margin: auto;
}

.button-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
  transition: left 0.5s ease;
}

.game-start-button:hover {
  transform: scale(1.05);
  background: linear-gradient(135deg, rgba(60, 45, 30, 0.9), rgba(40, 30, 20, 0.9));
  box-shadow: 
    0 0 25px rgba(212, 175, 55, 0.4),
    inset 0 0 15px rgba(212, 175, 55, 0.2);
  color: #f4e4bc;
  border-color: #d4af37;
}

.game-start-button:hover .button-glow {
  left: 100%;
}

.game-start-button:active {
  transform: scale(0.98);
}

/* Additional atmospheric effects */
.game-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(45deg, transparent 48%, rgba(139, 115, 85, 0.02) 50%, transparent 52%),
    linear-gradient(-45deg, transparent 48%, rgba(139, 115, 85, 0.02) 50%, transparent 52%);
  background-size: 20px 20px;
  z-index: 4;
  pointer-events: none;
  opacity: 0.3;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .game-dialog-box {
    bottom: 60px;
    padding: 20px 25px;
    max-width: 90%;
  }
  
  .game-text {
    font-size: 18px;
  }
  
  .game-start-button,
  .game-choice-button {
    padding: 12px 20px;
    font-size: 14px;
  }
  
  .letterbox-top,
  .letterbox-bottom {
    height: 40px;
  }
  
  .choice-container {
    bottom: 60px;
    gap: 15px;
  }
  
  .game-choice-button {
    min-width: 250px;
  }
  
  .credits-title {
    font-size: 28px;
  }
}
</style>