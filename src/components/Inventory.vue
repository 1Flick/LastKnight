<template>
  <div
    ref="inventoryModal"
    :class="[
      'inventory-modal',
      'backpack-bag',
      isClosing ? 'fade-out-scale' : 'fade-in-scale',
      isDragging ? 'inventory-modal--dragging' : '',
    ]"
    role="dialog"
    aria-labelledby="inventory-title"
    @click.stop
  >
    <!-- Alça / barra superior (decoração mochila) -->
    <div class="backpack-strap backpack-strap--top" aria-hidden="true" />
    <div class="backpack-buckle backpack-buckle--left" aria-hidden="true" />
    <div class="backpack-buckle backpack-buckle--right" aria-hidden="true" />

    <div
      class="modal-header backpack-flap"
      @mousedown="onDragPointerDown"
      @touchstart="onDragPointerDown"
    >
      <div class="gold">
        <img src="/icons/gold-icon.png" alt="" class="gold-icon" />
        <span>{{ gameState.player.gold }}</span>
      </div>
      <div class="title-wrap">
        <h2 id="inventory-title">Mochila</h2>
        <span class="drag-hint">arraste para mover</span>
      </div>
      <button
        type="button"
        class="close-btn"
        aria-label="Fechar inventário"
        @mousedown.stop
        @touchstart.stop
        @click="handleClose"
      >
        ✖
      </button>
    </div>

    <div class="backpack-inner">
      <div class="inner-stitch inner-stitch--top" aria-hidden="true" />
      <div class="inventory-content">
        <transition-group name="item-fade" tag="div" class="grid-container">
          <div
            v-for="item in allItems"
            :key="item.itemId"
            class="item-card"
            :class="{
              clickable: item.usable || item.equipable,
              equipped: item.equipped,
              'low-quantity': item.quantity === 1 && item.usable,
              selected: selectedItem?.itemId === item.itemId,
            }"
            @click="handleClick(item)"
          >
            <div class="item-header">
              <img :src="item.icon" :alt="item.name" class="item-icon" />
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.quantity > 1" class="item-quantity">×{{ item.quantity }}</span>
                <span v-if="item.equipped" class="equipped-tag">Equipado</span>
              </div>
            </div>
            <div v-if="selectedItem?.itemId === item.itemId" class="item-details">
              <p class="description">{{ item.description }}</p>
              <p v-if="item.type" class="detail">Tipo: {{ item.type }}</p>
              <p v-if="item.stats?.attack" class="detail">Dano: +{{ item.stats.attack }}</p>
              <p v-if="item.stats?.defense" class="detail">Defesa: +{{ item.stats.defense }}</p>
              <p v-if="item.stats?.speed" class="detail">
                Velocidade: {{ item.stats.speed > 0 ? '+' : '' }}{{ item.stats.speed }}
              </p>
            </div>
          </div>
        </transition-group>
        <p v-if="feedbackMessage" class="feedback-message game-ui-toast--banner">{{ feedbackMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameState, ITEMS } from '@/stores/gameState.js';

const STORAGE_KEY = 'inventoryModalPos';

const emits = defineEmits(['update:show']);
const gameState = useGameState();

const feedbackMessage = ref('');
const isClosing = ref(false);
const selectedItem = ref(null);
const inventoryModal = ref(null);
const isDragging = ref(false);

const weaponEquipSound = new Audio('/sounds/equip.wav');
const potionDrinkSound = new Audio('/sounds/potion_drink.wav');

let dragOffsetX = 0;
let dragOffsetY = 0;

const getItemIcon = (itemId) => ITEMS[itemId]?.icon || '/assets/icons/unknown-item.png';

const allItems = computed(() => {
  return gameState.player.inventory
    .map((invItem) => {
      const itemData = ITEMS[invItem.itemId];
      if (!itemData) return null;

      const slot = itemData.slot;

      return {
        itemId: invItem.itemId,
        name: itemData.name,
        icon: getItemIcon(invItem.itemId),
        quantity: invItem.quantity,
        description: itemData.description,
        type: itemData.type === 'Armadura' ? 'Armadura' : itemData.type,
        usable: ['Consumível', 'Consumível Especial'].includes(itemData.type),
        equipable: slot === 'weapon' || slot === 'armor',
        equipped: gameState.player.equipment[slot] === invItem.itemId,
        stats: itemData.stats,
        action: slot
          ? () => {
              if (gameState.player.equipment[slot] === invItem.itemId) {
                gameState.unequipItem(slot);
              } else {
                gameState.equipItem(invItem.itemId);
                if (slot === 'weapon' || slot === 'armor') {
                  weaponEquipSound.currentTime = 0;
                  weaponEquipSound.play().catch(() => {});
                }
              }
              selectedItem.value = null;
            }
          : itemData.type.startsWith('Consumível')
            ? () => {
                gameState.useItem(invItem.itemId);
                potionDrinkSound.currentTime = 0;
                potionDrinkSound.play().catch(() => {});
                selectedItem.value = null;
              }
            : null,
      };
    })
    .filter(Boolean);
});

function clampPosition(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const margin = 8;
  let left = rect.left;
  let top = rect.top;
  const maxLeft = window.innerWidth - rect.width - margin;
  const maxTop = window.innerHeight - rect.height - margin;
  left = Math.min(Math.max(margin, left), Math.max(margin, maxLeft));
  top = Math.min(Math.max(margin, top), Math.max(margin, maxTop));
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.transform = 'none';
}

function applyDefaultCenter(el) {
  if (!el) return;
  el.style.position = 'fixed';
  el.style.margin = '0';
  const w = el.offsetWidth || 400;
  const h = el.offsetHeight || 300;
  el.style.left = `${Math.max(8, Math.round((window.innerWidth - w) / 2))}px`;
  el.style.top = `${Math.max(8, Math.round((window.innerHeight - h) / 2))}px`;
  el.style.transform = 'none';
  clampPosition(el);
}

function loadSavedPosition(el) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const pos = JSON.parse(raw);
    if (typeof pos.left !== 'number' || typeof pos.top !== 'number') return false;
    el.style.position = 'fixed';
    el.style.left = `${Math.round(pos.left)}px`;
    el.style.top = `${Math.round(pos.top)}px`;
    el.style.margin = '0';
    el.style.transform = 'none';
    clampPosition(el);
    return true;
  } catch {
    return false;
  }
}

function savePosition(el) {
  if (!el) return;
  const left = parseFloat(el.style.left);
  const top = parseFloat(el.style.top);
  if (Number.isFinite(left) && Number.isFinite(top)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
  }
}

function onDragPointerDown(e) {
  if (e.target.closest?.('.close-btn')) return;
  const el = inventoryModal.value;
  if (!el) return;

  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  if (clientX == null || clientY == null) return;

  const rect = el.getBoundingClientRect();
  dragOffsetX = clientX - rect.left;
  dragOffsetY = clientY - rect.top;

  el.style.position = 'fixed';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.transform = 'none';
  el.style.margin = '0';

  isDragging.value = true;

  document.addEventListener('mousemove', onDragPointerMove);
  document.addEventListener('mouseup', onDragPointerUp);
  document.addEventListener('touchmove', onDragPointerMove, { passive: false });
  document.addEventListener('touchend', onDragPointerUp);
  document.addEventListener('touchcancel', onDragPointerUp);
  e.preventDefault();
}

function onDragPointerMove(e) {
  if (!isDragging.value) return;
  const el = inventoryModal.value;
  if (!el) return;

  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  if (clientX == null || clientY == null) return;

  e.preventDefault();

  let left = clientX - dragOffsetX;
  let top = clientY - dragOffsetY;
  const rect = el.getBoundingClientRect();
  const margin = 8;
  const w = rect.width;
  const h = rect.height;
  left = Math.min(Math.max(margin, left), window.innerWidth - w - margin);
  top = Math.min(Math.max(margin, top), window.innerHeight - h - margin);

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

function onDragPointerUp() {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.removeEventListener('mousemove', onDragPointerMove);
  document.removeEventListener('mouseup', onDragPointerUp);
  document.removeEventListener('touchmove', onDragPointerMove);
  document.removeEventListener('touchend', onDragPointerUp);
  document.removeEventListener('touchcancel', onDragPointerUp);

  const el = inventoryModal.value;
  if (el) savePosition(el);
}

function onWindowResize() {
  const el = inventoryModal.value;
  if (el) clampPosition(el);
}

const handleClick = (item) => {
  feedbackMessage.value = '';
  if (selectedItem.value?.itemId === item.itemId) {
    selectedItem.value = null;
  } else {
    selectedItem.value = item;
  }
  if (item.usable && item.quantity > 0) {
    item.action?.();
    feedbackMessage.value = `Você usou ${item.name}!`;
  } else if (item.equipable) {
    const wasEquipped = item.equipped;
    item.action?.();
    feedbackMessage.value = wasEquipped ? `${item.name} desequipado!` : `${item.name} equipado!`;
  } else {
    feedbackMessage.value = `${item.name} não pode ser usado ou equipado.`;
  }

  setTimeout(() => (feedbackMessage.value = ''), 3000);
};

const handleClose = () => {
  if (isClosing.value) return;
  isClosing.value = true;
  selectedItem.value = null;
  const el = inventoryModal.value;
  if (el) savePosition(el);
  setTimeout(() => emits('update:show', false), 280);
};

onMounted(() => {
  nextTick(() => {
    const el = inventoryModal.value;
    if (!el) return;
    if (!loadSavedPosition(el)) {
      applyDefaultCenter(el);
    }
  });
  window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
  onDragPointerUp();
  if (inventoryModal.value) savePosition(inventoryModal.value);
  window.removeEventListener('resize', onWindowResize);
  weaponEquipSound.pause();
  potionDrinkSound.pause();
});
</script>

<style scoped>
.fade-in-scale {
  animation: fadeInOpacity 0.28s ease forwards;
  opacity: 0;
}

.fade-out-scale {
  animation: fadeOutOpacity 0.26s ease forwards;
}

@keyframes fadeInOpacity {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOutOpacity {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ——— Mochila / couro ——— */
.backpack-bag {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  width: min(400px, calc(100vw - 20px));
  max-height: min(56vh, 540px);
  padding: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: visible;
  font-family: var(--game-ui-font);

  /* Couro externo */
  background:
    linear-gradient(
      168deg,
      rgba(110, 72, 48, 0.98) 0%,
      #4a3020 28%,
      #2e1e14 65%,
      #1f140e 100%
    );
  border-radius: 14px 14px 22px 22px;
  border: 5px solid #1a100a;
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.65),
    inset 0 2px 0 rgba(255, 200, 140, 0.12),
    inset 0 -8px 16px rgba(0, 0, 0, 0.45);
}

.backpack-bag::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 10px 10px 18px 18px;
  border: 2px dashed rgba(80, 50, 30, 0.55);
  pointer-events: none;
  z-index: 0;
}

.inventory-modal--dragging {
  cursor: grabbing;
  user-select: none;
}

.inventory-modal--dragging .modal-header {
  cursor: grabbing;
}

.backpack-strap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 42%;
  height: 14px;
  background: linear-gradient(180deg, #6b4832 0%, #3d2818 100%);
  border-radius: 4px;
  border: 2px solid #140c08;
  box-shadow: inset 0 1px 0 rgba(255, 200, 140, 0.15);
  z-index: 2;
}

.backpack-strap--top {
  top: -12px;
}

.backpack-buckle {
  position: absolute;
  top: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e8c56a 0%, #8b6914 55%, #4a3510 100%);
  border: 2px solid #2a1a0c;
  box-shadow:
    inset 0 2px 4px rgba(255, 240, 200, 0.35),
    0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 3;
  pointer-events: none;
}

.backpack-buckle--left {
  left: 14px;
}

.backpack-buckle--right {
  right: 14px;
}

.modal-header {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 10px;
  margin: 8px 8px 0;
  cursor: grab;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(
    175deg,
    rgba(130, 88, 58, 0.95) 0%,
    rgba(72, 48, 34, 0.98) 55%,
    rgba(45, 30, 22, 1) 100%
  );
  border: 3px solid rgba(25, 15, 10, 0.9);
  border-bottom: 4px double rgba(20, 12, 8, 0.85);
  box-shadow:
    inset 0 2px 4px rgba(255, 200, 160, 0.08),
    0 4px 8px rgba(0, 0, 0, 0.35);
}

.title-wrap {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.modal-header h2 {
  font-size: clamp(17px, 3.8vmin, 22px);
  color: #f5e6c8;
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow:
    0 2px 0 #1a0f07,
    0 -1px 0 rgba(255, 255, 255, 0.12);
}

.drag-hint {
  display: block;
  font-size: clamp(9px, 2vmin, 11px);
  color: rgba(232, 212, 180, 0.65);
  margin-top: 2px;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.gold {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(13px, 3vmin, 17px);
  color: #ffd87a;
  font-weight: 800;
  text-shadow: 0 1px 2px #000;
  min-width: 0;
}

.gold-icon {
  width: clamp(19px, 4vmin, 24px);
  height: clamp(19px, 4vmin, 24px);
  object-fit: contain;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.6));
}

.close-btn {
  font-family: var(--game-ui-font);
  flex-shrink: 0;
  cursor: pointer;
  background: linear-gradient(180deg, #8b5e3c 0%, #4a3020 100%);
  border: 3px solid #1f140e;
  border-radius: 8px;
  width: 34px;
  height: 34px;
  color: #f0e4c8;
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
  box-shadow:
    inset 0 2px 0 rgba(255, 200, 140, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.45);
  transition: transform 0.12s ease, filter 0.15s ease;
}

.close-btn:hover {
  filter: brightness(1.12);
}

.close-btn:active {
  transform: translateY(1px);
}

/* Bolso interno (tecido / pergaminho envelhecido) */
.backpack-inner {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  margin: 0 10px 10px;
  padding: 0;
  border-radius: 6px 6px 16px 16px;
  background:
    repeating-linear-gradient(
      -12deg,
      transparent,
      transparent 3px,
      rgba(40, 26, 18, 0.06) 3px,
      rgba(40, 26, 18, 0.06) 4px
    ),
    linear-gradient(
      165deg,
      #c9a888 0%,
      #a67c52 35%,
      #8b6344 100%
    );
  border: 3px solid rgba(35, 22, 14, 0.85);
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 -2px 8px rgba(255, 230, 200, 0.08);
}

.inner-stitch--top {
  height: 6px;
  margin: 0 12px;
  border-bottom: 2px dashed rgba(45, 28, 18, 0.45);
}

.inventory-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 12px;
  overflow: hidden;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
  gap: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 2px;
  flex: 1;
  min-height: 0;
}

.grid-container::-webkit-scrollbar {
  width: 8px;
}

.grid-container::-webkit-scrollbar-track {
  background: rgba(45, 28, 18, 0.35);
  border-radius: 4px;
}

.grid-container::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #6b4832, #3d2818);
  border-radius: 4px;
  border: 1px solid #2a1a10;
}

.item-card {
  padding: 8px;
  border: 2px solid rgba(45, 28, 18, 0.65);
  border-radius: 8px;
  background: rgba(255, 248, 235, 0.72);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  cursor: default;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.35);
}

.item-card:hover,
.item-card.selected {
  border-color: var(--game-border-gold);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.item-card.clickable {
  cursor: pointer;
}

.item-card.equipped {
  border-color: #c9a227;
  box-shadow: 0 0 0 1px rgba(201, 162, 39, 0.45);
}

.item-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.item-icon {
  width: clamp(38px, 9vmin, 50px);
  height: clamp(38px, 9vmin, 50px);
  object-fit: contain;
  image-rendering: pixelated;
  border: 2px solid rgba(60, 38, 24, 0.55);
  border-radius: 6px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: clamp(12px, 2.8vmin, 15px);
  color: #2c1810;
  font-weight: 800;
  line-height: 1.2;
  word-break: break-word;
}

.item-quantity {
  font-size: clamp(10px, 2.4vmin, 13px);
  color: #3d2618;
  font-weight: 700;
}

.equipped-tag {
  font-size: clamp(9px, 2.1vmin, 11px);
  color: #3d2618;
  font-weight: 800;
  background: rgba(201, 162, 39, 0.45);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.item-details {
  margin-top: 8px;
  padding: 8px;
  background: rgba(44, 24, 16, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(80, 50, 35, 0.35);
  max-height: 110px;
  overflow-y: auto;
}

.description {
  margin: 0 0 6px;
  font-size: clamp(10px, 2.5vmin, 13px);
  line-height: 1.45;
  color: #2c1810;
}

.detail {
  font-size: clamp(10px, 2.4vmin, 12px);
  margin: 2px 0;
  font-weight: 700;
  color: #3d2618;
}

.feedback-message {
  flex-shrink: 0;
  margin-top: 8px;
  padding: 8px 10px;
  text-align: center;
  font-size: clamp(11px, 2.6vmin, 14px);
  animation: fadeInOut 3s ease forwards;
  pointer-events: none;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  12% {
    opacity: 1;
    transform: translateY(0);
  }
  88% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-6px);
  }
}

.item-fade-enter-active,
.item-fade-leave-active {
  transition: all 0.25s ease;
}

.item-fade-enter-from,
.item-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 360px) {
  .grid-container {
    grid-template-columns: 1fr;
  }

  .drag-hint {
    display: none;
  }
}
</style>
