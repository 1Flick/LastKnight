<template>
  <div class="bruxa-screen">
    <img :src="bgImage" alt="Background" class="background-image" />
    <img :src="margaretImage" alt="Margaret, a Bruxa" class="margaret-image" :class="{ breathing: !typing }" />

    <div class="fog-layer"></div>

    <transition name="fade">
      <div v-if="showDialog" class="dialog-box dialog-style centered-dialog">
        <p>{{ displayedText }}</p>
        <button @click="nextDialog" :disabled="typing" class="dialog-button">Continuar</button>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showHoverDialog" class="dialog-box dialog-style hover-dialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>

    <transition name="shop-fade">
      <div v-if="showShop" class="shop-box dialog-style">
        <button class="dialog-button exit-button" @click="exitShop">Sair</button>
        <h3 class="shop-name">CASA DAS POÇÕES DE MARGARET</h3>
        <h4 class="shop-title">Escolha sua poção:</h4>
        <div class="gold-display">
          <img :src="goldIcon" alt="Gold Icon" class="gold-icon" />
          : {{ gameState.player.gold }}
        </div>
        <div class="shop-content">
          <div class="backpack">
            <div class="backpack-header">
              <img :src="backpackIcon" alt="Backpack Icon" class="backpack-icon" />
            </div>
            <p v-if="gameState.player.inventory.length === 0">Sua mochila está vazia.</p>
            <ul v-else>
              <li v-for="invItem in gameState.player.inventory" :key="invItem.itemId">
                <img :src="ITEMS[invItem.itemId]?.icon || '/icons/default-item.png'" alt="Item Icon" class="item-icon" />
                {{ ITEMS[invItem.itemId]?.name || invItem.itemId }} - {{ ITEMS[invItem.itemId]?.description || 'Item desconhecido' }}
              </li>
            </ul>
          </div>
          <div class="shop-items-container">
            <div class="shop-item" v-for="item in allItems" :key="item.id" @mouseover="hoverItemDescription(item)" @mouseleave="hideHoverDialog">
              <img :src="item.icon || '/icons/default-item.png'" :alt="item.name" class="potion-icon" />
              <div>
                <strong>{{ item.name }}</strong>
                <span>
                  <img :src="goldIcon" alt="Gold Icon" class="gold-icon small" />
                  Custo: {{ item.price }} Ouro
                </span>
              </div>
              <p>{{ item.description }}</p>
              <button @click="buyItem(item)" class="dialog-button buy-button">Comprar</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showShopDialog" class="dialog-box dialog-style shop-dialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMessageDialog" class="dialog-box dialog-style message-dialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameState, ITEMS } from '@/stores/gameState.js';
import bgImage from '@/assets/interior/bruxa-bg.gif';
import margaretParada from '/public/img/sprites/margaret/margaret_parada.png';
import margaretFalando from '/public/img/sprites/margaret/margaret_falando.gif';

const router = useRouter();
const gameState = useGameState();

const showDialog = ref(true);
const dialogIndex = ref(0);
const showHoverDialog = ref(false);
const showShopDialog = ref(false);
const showMessageDialog = ref(false);
const showShop = ref(false);
const displayedText = ref('');
const typing = ref(false);
const hoverItemDescriptionText = ref('');
const message = ref('');
let typingInterval = null;
let currentHoverItem = null;

const margaretImage = ref(margaretParada);

// Audio setup
const sounds = {
  ambient: new Audio('/audio/bruxa/bruxa_fundo.mp3'),
  dialogClick: new Audio('/sounds/click.wav'),
  coinClank: new Audio('/sounds/compra.wav'),
  doorCreak: new Audio('/sounds/porta_abrindo.mp3'),
  margaretSpeak: new Audio('/audio/bruxa/margaret_voz.mp3'),
};
sounds.ambient.loop = true;
sounds.ambient.volume = 0.3;
sounds.dialogClick.volume = 0.5;
sounds.coinClank.volume = 0.5;
sounds.doorCreak.volume = 0.5;
sounds.margaretSpeak.volume = 0.5;

const playSound = (audio) => {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((error) => {
    console.error(`Erro ao tocar som ${audio.src}:`, error);
  });
};

const goldIcon = computed(() => ITEMS.gold?.icon || '/icons/gold-icon.png');
const backpackIcon = computed(() => ITEMS.backpack?.icon || '/icons/bag-icon.png');

const firstVisitLines = [
  'Olá, jovem viajante! Sou Margaret, a bruxa de Albadia, guardiã dos segredos alquímicos.',
  'Minhas poções são forjadas com a essência da noite e sussurros de espíritos.',
  'Escolha com cuidado... o poder de uma poção pode salvar ou condenar.',
  'Vamos aos negócios, queridinho!'
];

const repeatVisitLines = [
  'De volta à minha morada, hein? Espero que tenha vindo por mais do meu... toque mágico.'
];

const shopDialogLines = ['Escolha uma poção para sua jornada, jovem!'];
const dialogLines = ref([]);

const allItems = computed(() =>
  Object.values(ITEMS)
    .filter(i => i.type === 'Consumível' || i.type === 'Consumível Especial')
    .map(i => ({
      ...i,
      icon: ITEMS[i.id]?.icon || '/icons/default-item.png'
    }))
);

const typeLine = (text) => {
  return new Promise((resolve) => {
    if (typingInterval) clearInterval(typingInterval);
    displayedText.value = '';
    typing.value = true;
    margaretImage.value = margaretFalando;

    const line = text || dialogLines.value[dialogIndex.value] || hoverItemDescriptionText.value || shopDialogLines[0] || message.value;
    let index = 0;

    // Play Margaret's speaking sound
    playSound(sounds.margaretSpeak);

    typingInterval = setInterval(() => {
      if (index < line.length) {
        displayedText.value += line[index++];
      } else {
        clearInterval(typingInterval);
        typingInterval = null;
        typing.value = false;
        margaretImage.value = margaretParada;
        resolve();
      }
    }, 40);
  });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const resetState = () => {
  showDialog.value = true;
  dialogIndex.value = 0;
  showHoverDialog.value = false;
  showShopDialog.value = false;
  showMessageDialog.value = false;
  showShop.value = false;
  displayedText.value = '';
  typing.value = false;
  hoverItemDescriptionText.value = '';
  message.value = '';
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  currentHoverItem = null;
};

const nextDialog = async () => {
  if (typing.value) return;
  playSound(sounds.dialogClick);
  if (dialogIndex.value < dialogLines.value.length - 1) {
    dialogIndex.value++;
    await typeLine(dialogLines.value[dialogIndex.value]);
    await delay(2000);
  } else {
    showDialog.value = false;
    showShop.value = true;
    showShopDialog.value = true;
    await typeLine(shopDialogLines[0]);
  }
};

const hideHoverDialog = () => {
  showHoverDialog.value = false;
  currentHoverItem = null;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    typing.value = false;
    margaretImage.value = margaretParada;
  }
};

const hideAllDialogs = () => {
  showHoverDialog.value = false;
  showShopDialog.value = false;
  showMessageDialog.value = false;
  currentHoverItem = null;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    typing.value = false;
    margaretImage.value = margaretParada;
  }
};

const hoverItemDescription = async (item) => {
  if (!showShop.value) return;
  if (currentHoverItem === (item.id || item.name)) return;
  try {
    hideAllDialogs();
    currentHoverItem = item.id || item.name;
    hoverItemDescriptionText.value = item.description;
    dialogLines.value = [item.description];
    dialogIndex.value = 0;
    showHoverDialog.value = true;
    await typeLine(item.description);
  } catch (error) {
    console.error('Error in hoverItemDescription:', error);
  }
};

const buyItem = async (item) => {
  try {
    hideAllDialogs();
    const existingItem = gameState.player.inventory.find((invItem) => invItem.itemId === (item.id || item.name));
    if (existingItem) {
      message.value = `Você já possui ${item.name}.`;
      // No error sound for consistency with ferreiro
    } else if (gameState.player.gold >= item.price) {
      gameState.removeGold(item.price);
      gameState.addItemToInventory(item.id || item.name, 1);
      if (item.id === 'potion_forbidden') {
        if (gameState.collectForbiddenPotion) {
          gameState.collectForbiddenPotion();
        } else {
          gameState.player.hasForbiddenPotion = true;
        }
      }
      message.value = `Você comprou ${item.name}! Foi adicionado à sua mochila.`;
      playSound(sounds.coinClank);
    } else {
      message.value = 'Você não tem ouro suficiente.';
      // No error sound for consistency with ferreiro
    }
    showMessageDialog.value = true;
    await typeLine(message.value);
    await delay(2000);
    hideAllDialogs();
    message.value = '';
    if (showShop.value) {
      showShopDialog.value = true;
      await typeLine(shopDialogLines[0]);
    }
  } catch (error) {
    console.error('Error buying item:', error);
    message.value = 'Erro ao comprar o item.';
    showMessageDialog.value = true;
    await typeLine(message.value);
    await delay(2000);
    hideAllDialogs();
  }
};

const exitShop = async () => {
  hideAllDialogs();
  showShop.value = false;
  playSound(sounds.doorCreak);
  await delay(500);
  router.push('/level/albadia');
};

onMounted(() => {
  try {
    resetState();
    const visited = localStorage.getItem('visitedWitchShop');
    dialogLines.value = visited ? repeatVisitLines : firstVisitLines;
    localStorage.setItem('visitedWitchShop', 'true');
    dialogIndex.value = 0;
    typeLine(dialogLines.value[dialogIndex.value]);
    playSound(sounds.doorCreak);
    playSound(sounds.ambient);
  } catch (error) {
    console.error('Error in onMounted:', error);
  }
});

onUnmounted(() => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  sounds.ambient.pause();
  sounds.ambient.currentTime = 0;
  sounds.margaretSpeak.pause();
  sounds.margaretSpeak.currentTime = 0;
});

watch(() => showShop, (newVal) => {
  if (newVal) {
    hideAllDialogs();
    showShopDialog.value = true;
    typeLine(shopDialogLines[0]);
  }
});

watch(typing, (newTyping) => {
  if (!newTyping) {
    sounds.margaretSpeak.pause();
    sounds.margaretSpeak.currentTime = 0;
  }
});
</script>

<style scoped>
.bruxa-screen {
  position: relative;
  height: 100vh;
  width: 100vw;
  color: #ffffff;
  font-family: 'Press Start 2P', cursive;
  overflow: hidden;
}

.background-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
  filter: brightness(0.9) contrast(1.1) saturate(0.9);
}

.margaret-image {
  position: fixed;
  bottom: 0;
  left: 1;
  width: 200%;
  height: 90%;
  z-index: 1;
  object-fit: contain;
  object-position: bottom left;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
}

.breathing {
  animation: breathe 5s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.008); }
}

.fog-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(20, 20, 40, 0.2),
    rgba(10, 10, 30, 0.4)
  );
  pointer-events: none;
  z-index: 0;
  animation: fogMove 20s linear infinite;
}

@keyframes fogMove {
  0% { transform: translateX(0); }
  50% { transform: translateX(-50px); }
  100% { transform: translateX(0); }
}

.dialog-style {
  position: fixed;
  background-color: rgba(50, 50, 80, 0.8);
  padding: 25px 35px;
  border: 4px solid #4a3a5a;
  border-radius: 8px;
  text-align: center;
  width: 90vw;
  max-width: 750px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.8);
  color: #ffffff;
  font-size: 15px;
  line-height: 1.7;
}

.centered-dialog {
  bottom: 5vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.shop-dialog {
  top: 15vh;
  left: 1%;
  transform: translateX(0);
  z-index: 5;
}

.hover-dialog {
  top: 15vh;
  left: 1%;
  transform: translateX(0);
  z-index: 15;
}

.message-dialog {
  top: 15vh;
  left: 1%;
  transform: translateX(0);
  z-index: 15;
}

.shop-box {
  top: 10vh;
  bottom: 5vh;
  left: 65%;
  transform: translateX(-35%);
  z-index: 2;
}

.dialog-style p {
  margin: 0 0 20px 0;
}

.dialog-button {
  display: block;
  margin-left: auto;
  margin-right: 0;
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #6a4a8a;
  color: #ffffff;
  border: 4px solid #3a2a4a;
  border-radius: 6px;
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
  box-shadow: inset -6px -6px #4a3a5a, inset 6px 6px #8a6aaa;
  text-transform: uppercase;
}

.dialog-button:hover:not(:disabled) {
  background-color: #7a5a9a;
  box-shadow: inset -6px -6px #3a2a4a, inset 6px 6px #9a7aba;
}

.dialog-button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset -3px -3px #4a3a5a, inset 3px 3px #8a6aaa;
}

.dialog-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.shop-name {
  text-align: center;
  color: #8a6aaa;
  font-size: 18px;
  margin-bottom: 5px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
}

.shop-title {
  text-align: center;
  color: #8a6aaa;
  margin-top: 0;
  margin-bottom: 10px;
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
    filter: brightness(1.2) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 10px rgba(138, 106, 170, 0.7));
  }
  100% {
    transform: scale(1) rotate(0deg);
    filter: brightness(1) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
  }
}

.gold-display {
  text-align: right;
  font-size: 13px;
  margin-bottom: 20px;
  color: #ffffff;
  text-shadow: 1px 1px 0 #000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.gold-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.gold-icon.small {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.shop-content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20px;
}

.backpack {
  flex: 1;
  max-width: 30%;
  border: 2px solid #4a3a5a;
  padding: 15px;
  background-color: rgba(50, 50, 80, 0.8);
  border-radius: 6px;
}

.backpack-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.backpack-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.backpack p {
  text-align: center;
  font-style: italic;
  color: #a090b0;
  margin-bottom: 0;
}

.backpack ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 40vh;
  overflow-y: auto;
}

.backpack li {
  display: flex;
  align-items: center;
  padding: 3px 0;
  font-size: 0.9em;
  color: #ffffff;
  text-shadow: 1px 1px 0 #000;
}

.item-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.shop-items-container {
  flex: 2;
  max-width: 65%;
  max-height: 40vh;
  overflow-y: auto;
  padding-right: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.shop-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  gap: 5px 15px;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #4a3a5a;
  background-color: rgba(50, 50, 80, 0.8);
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.shop-item:hover {
  background-color: rgba(80, 80, 100, 0.5);
}

.shop-item img.potion-icon {
  grid-row: 1 / 3;
  width: 50px;
  height: 50px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

.shop-item div {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shop-item div strong {
  font-size: 1.1em;
  color: #ffffff;
  text-shadow: 1px 1px 0 #000;
}

.shop-item div span {
  font-size: 0.9em;
  color: #ffffff;
  text-shadow: 1px 1px 0 #000;
  display: flex;
  align-items: center;
}

.shop-item p {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  font-size: 0.9em;
  color: #a090b0;
  margin: 0;
}

.shop-item button.buy-button {
  grid-column: 3 / 4;
  grid-row: 1 / 3;
  margin: 0;
  align-self: center;
}

.exit-button {
  position: absolute;
  top: 15px;
  right: 15px;
  margin: 0;
  background-color: #3a2a4a;
  color: #ffffff;
  border-color: #2a1a3a;
}

.exit-button:hover:not(:disabled) {
  background-color: #4a3a5a;
  box-shadow: inset -6px -6px #2a1a3a, inset 6px 6px #9a7aba;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.shop-fade-enter-active,
.shop-fade-leave-active {
  transition: opacity 1s ease, transform 1s ease;
}

.shop-fade-enter-from,
.shop-fade-leave-to {
  opacity: 0;
  transform: translateX(50px);
}
</style>