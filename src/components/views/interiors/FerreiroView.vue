<template>
  <div class="ferreiro-screen">
    <img :src="bgImage" alt="Background" class="background-image" />
    <img :src="bjornImage" alt="Bjorn o Ferreiro" class="bjorn-image" :class="{ breathing: !typing }" />

    <transition name="fade">
      <div v-if="showDialog" class="dialog-box dialog-style centered-dialog" key="dialog">
        <p>{{ displayedText }}</p>
        <button @click="nextDialog" :disabled="typing" class="dialog-button">Continuar</button>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showHoverDialog" class="dialog-box dialog-style hover-dialog" key="hoverDialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>

    <transition name="shop-fade">
      <div v-if="showShop" class="shop-box dialog-style" key="shop">
        <button class="dialog-button exit-button" @click="exitShop">Sair</button>
        <h3 class="forge-name">FORJA DE BJORN</h3>
        <h4 class="shop-title">Escolha sua arma:</h4>
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
            <div class="shop-item" v-for="item in weapons" :key="item.itemId" @mouseover="hoverItemDescription(item)" @mouseleave="hideHoverDialog">
              <img :src="item.icon || '/icons/default-item.png'" :alt="item.name" class="weapon-icon" />
              <div>
                <strong>{{ item.name }}</strong>
                <span>
                  <img :src="goldIcon" alt="Gold Icon" class="gold-icon small" />
                  Custo: {{ item.price }} Ouro
                </span>
              </div>
              <p>{{ item.description }}</p>
              <button @click="buyWeapon(item)" class="dialog-button buy-button">Comprar</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showShopDialog" class="dialog-box dialog-style shop-dialog" key="shopDialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMessageDialog" class="dialog-box dialog-style message-dialog" key="messageDialog">
        <p>{{ displayedText }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameState, ITEMS } from '@/stores/gameState.js';
import bgImage from '@/assets/interior/ferreiro-bg.gif';
import bjornParado from '/public/img/sprites/bjorn/bjorn.png';
import bjornFalando from '/public/img/sprites/bjorn/bjorn-falando.gif';

// Initialize the Pinia store
const gameState = useGameState();

const goldIcon = computed(() => ITEMS.gold?.icon || '/icons/gold-icon.png');
const backpackIcon = computed(() => ITEMS.backpack?.icon || '/icons/bag-icon.png');

const router = useRouter();

// Audio setup
const sounds = {
  ambient: new Audio('/audio/ferreiro/fogo.wav'),
  dialogClick: new Audio('/sounds/click.wav'),
  coinClank: new Audio('/sounds/compra.wav'),
  doorCreak: new Audio('/sounds/porta_abrindo.mp3'),
  bjornSpeak: new Audio('/audio/ferreiro/bjorn_voz.mp3'),
};
sounds.ambient.loop = true;
sounds.ambient.volume = 0.3;
sounds.dialogClick.volume = 0.5;
sounds.coinClank.volume = 0.5;
sounds.doorCreak.volume = 0.5;
sounds.bjornSpeak.volume = 0.5;

const showDialog = ref(true);
const dialogIndex = ref(0);
const showHoverDialog = ref(false);
const showShopDialog = ref(false);
const showMessageDialog = ref(false);
const hoverItemDescriptionText = ref('');
const dialogLines = ref([]);
const displayedText = ref('');
const typing = ref(false);
const showShop = ref(false);
const message = ref('');
let typingInterval = null;
let currentHoverItem = null;

const bjornImage = ref(bjornParado);

const weapons = computed(() =>
  Object.values(ITEMS)
    .filter((item) => {
      if (item.type !== 'Arma' || item.price === undefined) return false;
      if (!item.allowedClasses?.length) return true;
      return item.allowedClasses.includes(gameState.player.classe);
    })
    .map((item) => ({ ...item, itemId: item.id }))
);

const typeLine = (text) => {
  return new Promise((resolve) => {
    if (typingInterval) clearInterval(typingInterval);
    displayedText.value = '';
    typing.value = true;
    bjornImage.value = bjornFalando;

    const line = text || dialogLines.value[dialogIndex.value] || hoverItemDescriptionText.value || shopDialogLines[0] || message.value;
    let index = 0;

    // Play Bjorn's speaking sound
    sounds.bjornSpeak.currentTime = 0;
    sounds.bjornSpeak.play().catch((error) => {
      console.error('Erro ao tocar som de Bjorn falando:', error);
    });

    typingInterval = setInterval(() => {
      if (index < line.length) {
        displayedText.value += line[index];
        index++;
      } else {
        clearInterval(typingInterval);
        typingInterval = null;
        typing.value = false;
        bjornImage.value = bjornParado;
        resolve();
      }
    }, 40);
  });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const nextDialog = async () => {
  if (typing.value) return;
  sounds.dialogClick.play();
  if (dialogIndex.value < dialogLines.value.length - 1) {
    dialogIndex.value++;
    await typeLine(dialogLines.value[dialogIndex.value]);
    await delay(2000);
  } else {
    showDialog.value = false;
    showShop.value = true;
    showShopDialog.value = true;
    await typeLine(shopDialogLines[0]);
    localStorage.setItem('visitedBlacksmith', 'true');
  }
};

const hideHoverDialog = () => {
  showHoverDialog.value = false;
  currentHoverItem = null;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
    typing.value = false;
    bjornImage.value = bjornParado;
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
    bjornImage.value = bjornParado;
  }
};

const hoverItemDescription = async (item) => {
  if (!showShop.value) return;
  if (currentHoverItem === item.itemId) return;
  hideAllDialogs();
  currentHoverItem = item.itemId;
  hoverItemDescriptionText.value = item.description;
  dialogLines.value = [item.description];
  dialogIndex.value = 0;
  showHoverDialog.value = true;
  await typeLine(item.description);
};

const buyWeapon = async (item) => {
  hideAllDialogs();
  const existingItem = gameState.player.inventory.find((invItem) => invItem.itemId === item.itemId);
  if (existingItem) {
    message.value = `Você já possui ${item.name}.`;
  } else if (gameState.player.gold >= item.price) {
    gameState.player.gold -= item.price;
    gameState.addItemToInventory(item.itemId, 1);
    message.value = `Você comprou ${item.name}! Foi adicionado à sua mochila.`;
    sounds.coinClank.play();
  } else {
    message.value = 'Você não tem ouro suficiente.';
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
};

const exitShop = async () => {
  hideAllDialogs();
  showShop.value = false;
  sounds.doorCreak.play();
  await delay(500);
  router.push('/level/albadia');
};

onMounted(() => {
  sounds.doorCreak.play();
  const visited = localStorage.getItem('visitedBlacksmith') === 'true';
  dialogLines.value = visited ? repeatVisitLines : firstVisitLines;
  dialogIndex.value = 0;
  typeLine(dialogLines.value[dialogIndex.value]);
  sounds.ambient.play();
  console.log('ITEMS:', ITEMS);
  console.log('Weapons:', weapons.value);
  console.log('Inventário:', gameState.player.inventory);
});

onUnmounted(() => {
  sounds.ambient.pause();
  sounds.ambient.currentTime = 0;
  if (typingInterval) clearInterval(typingInterval);
  sounds.bjornSpeak.pause();
  sounds.bjornSpeak.currentTime = 0;
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
    sounds.bjornSpeak.pause();
    sounds.bjornSpeak.currentTime = 0;
  }
});

const firstVisitLines = [
  'Ah, um novo guerreiro! Eu sou Bjorn, o ferreiro mais rúbido do reino!',
  'Minhas armas são forjadas com fogo de dragão e suor de titãs.',
  'Escolha com sabedoria, jovem... uma boa arma faz toda a diferença.',
  'Vamos aos negócios!'
];

const repeatVisitLines = [
  'Bem vindo de volta à minha forja, guerreiro! Espero que esteja pronto para reforjar seu arsenal.',
];

const shopDialogLines = ['Escolha uma arma para sua jornada, guerreiro!'];
</script>

<style scoped>
/* Mantém os estilos existentes sem alterações */
.fade-in {
  animation: fadeIn 1.5s ease-in;
}

@keyframes fadeIn {
  0% { opacity: 0; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}

.ferreiro-screen {
  position: relative;
  height: 100vh;
  width: 100vw;
  color: #f0e0c0;
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
  filter: blur(1px);
}

.bjorn-image {
  position: fixed;
  bottom: 0;
  left: 5%;
  width: auto;
  height: 85vh;
  max-height: 700px;
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

.dialog-style {
  position: fixed;
  background: linear-gradient(
    165deg,
    var(--game-parchment) 0%,
    var(--game-parchment-mid) 50%,
    var(--game-parchment-dark) 100%
  );
  padding: 25px 35px;
  border: 4px solid var(--game-border-gold);
  border-radius: 8px;
  text-align: center;
  width: 90vw;
  max-width: 750px;
  box-shadow: var(--game-shadow-modal);
  color: var(--game-parchment-ink);
  font-family: var(--game-ui-font);
  font-size: 18px;
  line-height: 1.7;
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.35);
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
  background-color: var(--game-honey);
  color: var(--game-wood-dark);
  border: 4px solid var(--game-wood-dark);
  border-radius: 6px;
  font-family: var(--game-ui-font);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s;
  box-shadow: inset -6px -6px var(--game-honey-shadow),
    inset 6px 6px var(--game-honey-light);
  text-transform: uppercase;
}

.dialog-button:hover:not(:disabled) {
  background-color: #f4b76a;
  color: #3e1e14;
  box-shadow: inset -6px -6px #c96a32, inset 6px 6px #ffd9a1;
}

.dialog-button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset -3px -3px #d17844, inset 3px 3px #ffcb8e;
}

.dialog-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.forge-name {
  text-align: center;
  color: #e0a867;
  font-size: 18px;
  margin-bottom: 5px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
}

.shop-title {
  text-align: center;
  color: #e0a867;
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
    filter: brightness(1.2) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 10px rgba(249, 231, 159, 0.7));
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
  color: #f0b860;
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
  border: 2px solid #a07030;
  padding: 15px;
  background-color: rgba(40, 25, 15, 0.9);
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

.backpack h5 {
  margin: 0;
  color: #e0a867;
  text-align: center;
  text-shadow: 1px 1px 0 #000;
}

.backpack p {
  text-align: center;
  font-style: italic;
  color: #a09070;
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
  color: #f0e0c0;
  text-shadow: 1px 1px 0 #000;
}

.item-icon {
  width: 40px;
  height: 40px;
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
  border-bottom: 1px solid #504030;
  background-color: rgba(40, 25, 15, 0.9);
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.shop-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.shop-item img.weapon-icon {
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
  color: #f0e0c0;
  text-shadow: 1px 1px 0 #000;
}

.shop-item div span {
  font-size: 0.9em;
  color: #f0b860;
  text-shadow: 1px 1px 0 #000;
  display: flex;
  align-items: center;
}

.shop-item p {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  font-size: 0.9em;
  color: #c0b090;
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
  background-color: #5c2c1d;
  color: #f0e0c0;
  border-color: #3e1e14;
}

.exit-button:hover:not(:disabled) {
  background-color: #704030;
  box-shadow: inset -6px -6px #c96a32, inset 6px 6px #ffd9a1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.shop-fade-enter-active, .shop-fade-leave-active {
  transition: opacity 1s ease, transform 1s ease;
}

.shop-fade-enter-from, .shop-fade-leave-to {
  opacity: 0;
  transform: translateX(50px);
}
</style>