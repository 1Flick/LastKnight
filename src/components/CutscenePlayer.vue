<template>
  <div>
    <!-- Start Cutscene Button -->
    <div v-if="!isCutsceneStarted && !hasSeenCutscene" class="start-cutscene-container">
      <button @click="startCutscene" class="elden-start-button" @mousedown="playClickSound">
        <span class="button-glow"></span>
        Iniciar Cutscene
      </button>
    </div>

    <!-- Cutscene Content -->
    <div v-if="isCutsceneStarted && !hasSeenCutscene" class="elden-ring-container" :style="{ backgroundImage: `url(${currentSceneData?.backgroundImage})` }" :class="{ 'fade-in': isMounted, 'fade-out': isFadingOut }" v-show="isVisible">
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
      <div class="background-zoom" :style="{ backgroundImage: `url(${currentSceneData?.backgroundImage})` }"></div>
      
      <!-- Dialog box with Elden Ring styling -->
      <div class="elden-dialog-box" v-if="showDialog">
        <div class="dialog-text-container">
          <p class="elden-text">{{ displayedText }}</p>
        </div>
      </div>
      
      <!-- Skip button with Elden Ring styling -->
      <button @click="skipCutscene" class="elden-skip-button" @mousedown="playClickSound">
        <span class="button-glow"></span>
        Pular Cutscene
      </button>
      
      <!-- Audio elements -->
      <audio ref="bgAudio" loop>
        <source src="/audio/cutscene/cutscene_music.mp3" type="audio/mp3" />
      </audio>
      <audio ref="narrationAudio">
        <source :src="currentSceneData?.narration || ''" type="audio/mp3" />
      </audio>
      <audio ref="sfxAudio">
        <source :src="currentSceneData?.sfx || ''" type="audio/mp3" />
      </audio>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import clickSound from '/sounds/click.wav';

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
const hasSeenCutscene = ref(false);

const cutscenes = {
  inicio: [
    { 
      speaker: 'Narrador', 
      text: 'A Calmaria Antes da Tempestade. O sol brilha sobre o Castelo de Albadia, dourando suas torres e fazendo dançar os estandartes reais ao vento no pátio.', 
      backgroundImage: '/img/cutscene/cena1_part1.png', 
      narration: '/audio/cutscene/cena1_part1.mp3'
    },
    { 
      speaker: 'Narrador', 
      text: 'Cavaleiros treinam com precisão. Entre eles, o jovem Bob se esforça para acompanhar — seus golpes são desajeitados, a respiração, ofegante. O reino vive um momento de paz e orgulho: forte, unido e protegido', 
      backgroundImage: '/img/cutscene/cena1_part2.png', 
      narration: '/audio/cutscene/cena1_part2.mp3'
    },
    { 
      speaker: 'Narrador', 
      text: 'A Invasão Súbita. Um estrondo sacode o castelo. Das sombras, surge Magnus — imponente e envolto em trevas. Com um gesto, ele lança os cavaleiros ao chão. Bob, atordoado, tenta se levantar. Do alto, a Princesa Julie observa, paralisada.', 
      backgroundImage: '/img/cutscene/cena2_part1.png', 
      narration: '/audio/cutscene/cena2_part1.mp3'
    },
    { 
      speaker: 'Narrador', 
      text: 'Magnus a encara, avança como um vulto e desaparece com ela, deixando caos e terror para trás.', 
      backgroundImage: '/img/cutscene/cena2_part2.png', 
      narration: '/audio/cutscene/cena2_part2.mp3'
    },
    { 
      speaker: 'Narrador', 
      text: 'O Desespero e a Fuga, num aposento sombrio, Julie está amarrada e silenciada. Seus olhos, porém, ainda brilham com coragem. Magnus a observa nas sombras, com um sorriso triunfante.', 
      backgroundImage: '/img/cutscene/cena3.png', 
      narration: '/audio/cutscene/cena3.mp3'
    },
    { 
      speaker: 'Narrador', 
      text: 'Em um castelo distante, um novo herói desperta para enfrentar o destino que o aguarda. No pátio do castelo a figura protagonista surge em silêncio. Seus olhos revelam confusão, mas também uma chama de determinação recém-acesa. À sua frente, um novo caminho se abre. Entao uma nova jornada começa.', 
      backgroundImage: '/img/cutscene/cena4.png', 
      narration: '/audio/cutscene/cena4.mp3'
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
      setTimeout(() => {
        nextScene();
      }, 3000);
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
  } else {
    isFadingOut.value = true;
    saveCutsceneState();
    setTimeout(() => {
      isVisible.value = false;
      router.push('/tutorial');
    }, 2000);
  }
}

function playAudio() {
  if (bgAudio.value && bgAudio.value.paused) {
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

function skipCutscene() {
  playClickSound();
  saveCutsceneState();
  isFadingOut.value = true;
  setTimeout(() => {
    isVisible.value = false;
    router.push('/tutorial');
  }, 1500);
}

function saveCutsceneState() {
  localStorage.setItem('hasSeenCutscene', 'true');
}

function checkCutsceneState() {
  const seen = localStorage.getItem('hasSeenCutscene');
  if (seen === 'true') {
    hasSeenCutscene.value = true;
    router.push('/tutorial');
  }
}

onMounted(() => {
  checkCutsceneState();
  nextTick(() => {
    if (!hasSeenCutscene.value) {
      isMounted.value = true;
    }
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

.elden-ring-container {
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

.elden-ring-container.fade-in {
  opacity: 0;
  transform: scale(0.98);
  animation: eldenFadeIn 1s ease forwards;
}

.elden-ring-container.fade-out {
  opacity: 1;
  transform: scale(1);
  animation: eldenFadeOut 1s ease forwards;
}

@keyframes eldenFadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes eldenFadeOut {
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
  z-index: 5;
}

.letterbox-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.3));
}

.letterbox-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3));
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
  background: rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  animation: particleFloat linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* Dialog box with Elden Ring styling */
.elden-dialog-box {
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
    inset 0 0 20px rgba(139, 115, 85, 0.1),
    0 0 60px rgba(139, 115, 85, 0.2);
  backdrop-filter: blur(2px);
}

.dialog-text-container {
  position: relative;
}

.elden-text {
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

/* Start and Skip buttons with Elden Ring styling */
.elden-start-button,
.elden-skip-button {
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
}

.elden-start-button {
  margin: auto;
}

.elden-skip-button {
  position: absolute;
  top: 20px;
  left: 10px;
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

.elden-start-button:hover,
.elden-skip-button:hover {
  transform: scale(1.05);
  background: linear-gradient(135deg, rgba(60, 45, 30, 0.9), rgba(40, 30, 20, 0.9));
  box-shadow: 
    0 0 25px rgba(212, 175, 55, 0.4),
    inset 0 0 15px rgba(212, 175, 55, 0.2);
  color: #f4e4bc;
  border-color: #d4af37;
}

.elden-start-button:hover .button-glow,
.elden-skip-button:hover .button-glow {
  left: 100%;
}

.elden-start-button:active,
.elden-skip-button:active {
  transform: scale(0.98);
}

/* Additional atmospheric effects */
.elden-ring-container::before {
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
  .elden-dialog-box {
    bottom: 60px;
    padding: 20px 25px;
    max-width: 90%;
  }
  
  .elden-text {
    font-size: 18px;
  }
  
  .elden-start-button,
  .elden-skip-button {
    padding: 12px 20px;
    font-size: 14px;
  }
  
  .elden-skip-button {
    top: 15px;
    left: 15px;
  }
  
  .letterbox-top,
  .letterbox-bottom {
    height: 40px;
  }
}
</style>