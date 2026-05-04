<template>
  <div class="background-container" :style="{ backgroundImage: `url(${bgImage})` }" :class="{ 'fade-in': isMounted, 'fade-out': isFadingOut }" v-show="isVisible">
    <div class="dark-overlay"></div>
    <div class="water-effect"></div>
    <div class="fog-layer"></div>
    <div class="dialog-box" v-if="showDialog && !showDamageScreen && !showSuccessScreen">
      <p v-if="isFirstVisit">{{ displayedText }}</p>
      <div class="dialog-actions" v-if="!typing || !isFirstVisit">
        <button @click="atravessar" aria-label="Tentar atravessar o rio" @mousedown="playClickSound">Tentar Atravessar</button>
        <button @click="voltar" aria-label="Voltar para Albadia" @mousedown="playClickSound">Voltar para Albadia</button>
      </div>
    </div>
    <div class="success-screen" v-if="showSuccessScreen" :style="{ opacity: showSuccessScreen ? 1 : 0 }">
      <p>{{ successMessage }}</p>
    </div>
    <div class="damage-screen" v-if="showDamageScreen" :style="{ opacity: showDamageScreen ? 1 : 0 }">
      <p>{{ notificationMessage }}</p>
    </div>
    <audio ref="bgAudio" loop>
      <source src="/sounds/river/river-sound.wav" type="audio/wav" />
    </audio>
  </div>
</template>

<script setup>
import bgImage from '@/assets/backviews/rio-bg.gif';
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useGameState } from '@/stores/gameState.js'; // Import useGameState instead of gameState and actions

const router = useRouter();
const gameState = useGameState(); // Initialize the Pinia store

const showDialog = ref(true);
const displayedText = ref('');
const typing = ref(false);
const notificationMessage = ref('');
const bgAudio = ref(null);
const clickAudio = ref(new Audio('/sounds/river/click.wav'));
const jumpAudio = ref(new Audio('/sounds/river/river-drop.mp3'));
const loseLifeAudio = ref(new Audio('/sounds/river/river-dead.mp3'));
const isMounted = ref(false);
const isFadingOut = ref(false);
const isVisible = ref(true);
const hasPassedRiver = ref(false);
const showSuccessScreen = ref(false);
const successMessage = ref('');
const showDamageScreen = ref(false);

const line =
  'Ao chegar à margem do Rio das Almas Perdidas, uma névoa gélida e espessa envolve teus pés. As águas negras parecem observar-te... famintas.';

const playerHealth = computed(() => gameState.player.health);
const playerLives = computed(() => gameState.player.lives);
const hasBlessing = computed(() => gameState.player.hasRiverBlessing === true);
const isFirstVisit = computed(() => !gameState.levelsCompleted.includes('rio'));

let interval = null;

function typeText() {
  if (!isFirstVisit.value) {
    typing.value = false;
    return;
  }
  typing.value = true;
  displayedText.value = '';
  let i = 0;
  interval = setInterval(() => {
    if (i < line.length) {
      displayedText.value += line[i];
      i++;
    } else {
      clearInterval(interval);
      typing.value = false;
    }
  }, 45);
}

function atravessar() {
  playJumpSound();
  showDialog.value = false; // Remove o painel de diálogo
  if (!hasBlessing.value) {
    const damage = 35;
    gameState.takeDamage(damage); // Use gameState instead of actions
    showDamageScreen.value = true; // Mostra a tela de dano
    if (gameState.player.health > 0) {
      notificationMessage.value = `As águas negras gelam seus ossos! Você sente sua vitalidade diminuir... Saúde atual: ${playerHealth.value}. Vidas restantes: ${playerLives.value}`;
      setTimeout(() => {
        showDamageScreen.value = false;
        showDialog.value = true; // Restaura o diálogo após 2 segundos
      }, 2000);
    } else if (playerLives.value > 0) {
      playLoseLifeSound(); // Toca apenas o som de morte
      notificationMessage.value = `Você foi consumido pelo rio, mas revive! Saúde restaurada: ${playerHealth.value}. Vidas restantes: ${playerLives.value}`;
      setTimeout(() => {
        showDamageScreen.value = false;
        showDialog.value = true; // Restaura o diálogo
      }, 2000);
    } else {
      playLoseLifeSound(); // Toca apenas o som de morte
      notificationMessage.value = "Sua alma foi reivindicada pelo rio... Todas as vidas foram perdidas.";
      gameState.gameOver(); // Use gameState instead of actions
      setTimeout(() => router.push('/gameover'), 2000);
    }
    return;
  } else {
    showSuccessScreen.value = true;
    successMessage.value = 'A bênção protege você das profundezas sombrias. Você atravessou o rio!';
    gameState.completeLevel('rio'); // Use gameState instead of actions
    gameState.setCurrentArea('ruinas'); // Use gameState instead of actions
    setTimeout(() => {
      showSuccessScreen.value = false;
      router.push('/level/ruinas');
    }, 2000);
  }
}

function voltar() {
  gameState.setCurrentArea('albadia'); // Use gameState instead of actions
  router.push('/level/albadia');
}

function playClickSound() {
  clickAudio.value.currentTime = 0;
  clickAudio.value.play().catch(error => console.error('Erro ao reproduzir som de clique:', error));
}

function playJumpSound() {
  jumpAudio.value.currentTime = 0;
  jumpAudio.value.play().catch(error => {
    console.error('Erro ao reproduzir som de pular:', error);
  });
}

function playLoseLifeSound() {
  loseLifeAudio.value.currentTime = 0;
  loseLifeAudio.value.play().catch(error => {
    console.error('Erro ao reproduzir som de perder vida:', error);
  });
  // Impede que o som de morte se sobreponha ao de pular
  jumpAudio.value.pause();
  jumpAudio.value.currentTime = 0;
}

function closeNotification() {
  notificationMessage.value = '';
  showDialog.value = true;
}

onMounted(() => {
  gameState.setCurrentArea('Rio das Almas Perdidas'); // Use gameState instead of actions
  typeText();
  nextTick(() => {
    isMounted.value = true;
  });
  bgAudio.value.play().catch(error => console.error('Erro ao reproduzir som de fundo:', error));
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
  if (bgAudio.value) {
    bgAudio.value.pause();
    bgAudio.value.currentTime = 0;
  }
  isFadingOut.value = true;
});

watch(isFirstVisit, (newValue) => {
  if (!newValue && !gameState.levelsCompleted.includes('rio')) {
    gameState.completeLevel('rio'); // Use gameState instead of actions
  }
});

watch(() => router.currentRoute.value.path, (newPath) => {
  if (newPath !== '/level/rio') {
    isFadingOut.value = true;
    setTimeout(() => {
      isVisible.value = false;
      isFadingOut.value = false;
    }, 1000);
  }
});
</script>

<style scoped>
.background-container {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100vh;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  opacity: 1;
  transition: opacity 1s ease, transform 1s ease;
}

.background-container.fade-in {
  opacity: 0;
  transform: scale(0.95);
  animation: fadeIn 1s ease forwards;
}

.background-container.fade-out {
  opacity: 1;
  transform: scale(1);
  animation: fadeOut 1s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.05);
  }
}

.dark-overlay,
.fog-layer,
.water-effect,
.dialog-box,
.success-screen,
.damage-screen {
  transition: opacity 0.5s ease;
}

.dark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(5, 0, 10, 0.35);
  pointer-events: none;
  z-index: 1;
}

.fog-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at bottom, rgba(40, 40, 50, 0.6), rgba(10, 10, 15, 0.8) 65%, rgba(0, 0, 5, 0.95) 100%);
  opacity: 0.92;
  pointer-events: none;
  z-index: 2;
}

.water-effect {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40%;
  background: linear-gradient(
    180deg,
    rgba(5, 8, 12, 0) 0%,
    rgba(5, 8, 12, 0.5) 40%,
    rgba(8, 10, 15, 0.8) 75%,
    rgba(10, 12, 18, 0.95) 100%
  );
  opacity: 0.9;
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 3;
}

.dialog-box {
  background: linear-gradient(
    165deg,
    var(--game-parchment) 0%,
    var(--game-parchment-mid) 50%,
    var(--game-parchment-dark) 100%
  );
  padding: 25px;
  border: 3px solid var(--game-border-gold);
  border-radius: 8px;
  text-align: center;
  max-width: 650px;
  position: absolute;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  font-size: 24px;
  font-family: var(--game-ui-font);
  color: var(--game-parchment-ink);
  box-shadow: var(--game-shadow-modal);
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.35);
}

.dialog-actions button {
  margin: 0 12px;
  padding: 12px 24px;
  background: linear-gradient(to bottom, var(--game-honey), var(--game-honey-shadow));
  color: var(--game-wood-dark);
  font-family: var(--game-ui-font);
  font-size: 17px;
  font-weight: bold;
  border: 3px solid var(--game-wood-dark);
  border-radius: 6px;
  box-shadow: inset -4px -4px var(--game-honey-shadow),
    inset 4px 4px var(--game-honey-light), var(--game-shadow-out);
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
}

.dialog-actions button:hover {
  transform: scale(1.03);
  filter: brightness(1.06);
}

.success-screen {
  background: linear-gradient(
    165deg,
    var(--game-parchment) 0%,
    var(--game-parchment-mid) 50%,
    var(--game-parchment-dark) 100%
  );
  border: 3px solid var(--game-border-gold);
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  font-size: 24px;
  font-family: var(--game-ui-font);
  color: var(--game-parchment-ink);
  padding: 30px;
  box-shadow: var(--game-shadow-modal);
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.35);
  transition: opacity 0.5s ease;
}

.damage-screen {
  background: linear-gradient(
    165deg,
    var(--game-parchment-mid) 0%,
    var(--game-bg-panel) 55%,
    var(--game-bg-deep) 100%
  );
  border: 3px solid var(--game-danger-dark);
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  font-size: 24px;
  font-family: var(--game-ui-font);
  color: var(--game-cream);
  padding: 30px;
  box-shadow: var(--game-shadow-modal);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
  transition: opacity 0.5s ease;
}
</style>