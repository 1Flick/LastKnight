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
        <span class="drag-hint">arraste a barra para mover</span>
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
        <div class="slot-grid" role="list" aria-label="Itens da mochila">
          <button
            v-for="(slot, index) in backpackSlots"
            :key="`backpack-${index}`"
            type="button"
            class="inventory-slot"
            :class="{
              'inventory-slot--active': dragSource?.type === 'backpack' && dragSource.index === index,
              'inventory-slot--target': dropTarget?.type === 'backpack' && dropTarget.index === index,
            }"
            :aria-label="slotLabel(slot, index)"
            @pointerdown="onSlotPointerDown('backpack', index, $event)"
            @pointerenter="onSlotPointerEnter('backpack', index)"
            @pointerup="onSlotPointerUp('backpack', index)"
            @dblclick="onBackpackDoubleClick(index)"
          >
            <img
              v-if="slot"
              :src="getItemIcon(slot.itemId)"
              :alt="ITEMS[slot.itemId]?.name || slot.itemId"
              class="slot-icon"
              draggable="false"
            />
            <span v-if="slot && slot.quantity > 1" class="slot-qty">×{{ slot.quantity }}</span>
          </button>
        </div>

        <div class="equipment-row" aria-label="Equipamento">
          <button
            v-for="equipment in equipmentSlots"
            :key="equipment.id"
            type="button"
            class="inventory-slot inventory-slot--equipment"
            :class="{
              'inventory-slot--active': dragSource?.type === 'equipment' && dragSource.slot === equipment.id,
              'inventory-slot--target': dropTarget?.type === 'equipment' && dropTarget.slot === equipment.id,
            }"
            :aria-label="equipmentLabel(equipment.id)"
            @pointerdown="onSlotPointerDown('equipment', equipment.id, $event)"
            @pointerenter="onSlotPointerEnter('equipment', equipment.id)"
            @pointerup="onSlotPointerUp('equipment', equipment.id)"
            @dblclick="onEquipmentDoubleClick(equipment.id)"
          >
            <span class="slot-caption">{{ equipment.label }}</span>
            <img
              v-if="equippedItem(equipment.id)"
              :src="getItemIcon(equippedItem(equipment.id))"
              :alt="ITEMS[equippedItem(equipment.id)]?.name || equipment.label"
              class="slot-icon"
              draggable="false"
            />
          </button>
        </div>

        <div v-if="selectedItemDetails" class="item-details">
          <p class="item-details__name">{{ selectedItemDetails.name }}</p>
          <p class="description">{{ selectedItemDetails.description }}</p>
          <p v-if="selectedItemDetails.type" class="detail">Tipo: {{ selectedItemDetails.type }}</p>
          <p v-if="selectedItemDetails.stats?.attack" class="detail">Dano: +{{ selectedItemDetails.stats.attack }}</p>
          <p v-if="selectedItemDetails.stats?.defense" class="detail">Defesa: +{{ selectedItemDetails.stats.defense }}</p>
          <p v-if="selectedItemDetails.stats?.speed" class="detail">
            Velocidade: {{ selectedItemDetails.stats.speed > 0 ? '+' : '' }}{{ selectedItemDetails.stats.speed }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message game-ui-toast--banner">{{ feedbackMessage }}</p>
      </div>
    </div>

    <div
      v-if="dragPreview"
      class="drag-ghost"
      :style="dragGhostStyle"
      aria-hidden="true"
    >
      <img :src="dragPreview.icon" alt="" class="slot-icon" />
      <span v-if="dragPreview.quantity > 1" class="slot-qty">×{{ dragPreview.quantity }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameState, ITEMS } from '@/stores/gameState.js';

const STORAGE_KEY = 'inventoryModalPos';
const BACKPACK_SLOT_COUNT = 12;

const emits = defineEmits(['update:show']);
const gameState = useGameState();

const feedbackMessage = ref('');
const isClosing = ref(false);
const inventoryModal = ref(null);
const isDragging = ref(false);
const dragSource = ref(null);
const dropTarget = ref(null);
const dragPreview = ref(null);
const dragGhostPosition = ref({ x: 0, y: 0 });
const selectedItemId = ref(null);

const weaponEquipSound = new Audio('/sounds/equip.wav');
const potionDrinkSound = new Audio('/sounds/potion_drink.wav');

let dragOffsetX = 0;
let dragOffsetY = 0;
let itemDragActive = false;

const equipmentSlots = [
  { id: 'weapon', label: 'Equipado' },
  { id: 'armor', label: 'Armadura' },
  { id: 'shield', label: 'Escudo' },
];

const backpackSlots = computed(() => {
  const slots = gameState.player.backpackSlots;
  if (Array.isArray(slots) && slots.length === BACKPACK_SLOT_COUNT) {
    return slots;
  }
  return Array.from({ length: BACKPACK_SLOT_COUNT }, () => null);
});

const dragGhostStyle = computed(() => ({
  left: `${dragGhostPosition.value.x}px`,
  top: `${dragGhostPosition.value.y}px`,
}));

const selectedItemDetails = computed(() => {
  if (!selectedItemId.value || !ITEMS[selectedItemId.value]) return null;
  const item = ITEMS[selectedItemId.value];
  return {
    name: item.name,
    description: item.description,
    type: item.type,
    stats: item.stats,
  };
});

const getItemIcon = (itemId) => ITEMS[itemId]?.icon || '/icons/default-item.png';

function equippedItem(slot) {
  return gameState.player.equipment?.[slot] || null;
}

function slotLabel(slot, index) {
  if (!slot) return `Slot vazio ${index + 1}`;
  return `${ITEMS[slot.itemId]?.name || slot.itemId}, quantidade ${slot.quantity}`;
}

function equipmentLabel(slot) {
  const itemId = equippedItem(slot);
  if (!itemId) {
    if (slot === 'weapon') return 'Slot de arma vazio';
    if (slot === 'armor') return 'Slot de armadura vazio';
    return 'Slot de escudo vazio';
  }
  return `${ITEMS[itemId]?.name || itemId} equipado`;
}

function showFeedback(message) {
  feedbackMessage.value = message;
  window.setTimeout(() => {
    feedbackMessage.value = '';
  }, 2800);
}

function onSlotPointerDown(type, indexOrSlot, event) {
  if (event.button != null && event.button !== 0) return;

  const payload =
    type === 'backpack'
      ? { type, index: indexOrSlot, slot: backpackSlots.value[indexOrSlot] }
      : { type, slot: indexOrSlot, itemId: equippedItem(indexOrSlot) };

  if (type === 'backpack' && !payload.slot) {
    selectedItemId.value = null;
    return;
  }
  if (type === 'equipment' && !payload.itemId) {
    selectedItemId.value = null;
    return;
  }

  dragSource.value = payload;
  itemDragActive = true;
  dropTarget.value = null;
  dragPreview.value = {
    icon: getItemIcon(type === 'backpack' ? payload.slot.itemId : payload.itemId),
    quantity: type === 'backpack' ? payload.slot.quantity : 1,
  };
  dragGhostPosition.value = { x: event.clientX - 24, y: event.clientY - 24 };
  selectedItemId.value = type === 'backpack' ? payload.slot.itemId : payload.itemId;

  document.addEventListener('pointermove', onItemPointerMove);
  document.addEventListener('pointerup', onItemPointerUp);
  event.preventDefault();
}

function onSlotPointerEnter(type, indexOrSlot) {
  if (!itemDragActive) return;
  dropTarget.value = type === 'backpack' ? { type, index: indexOrSlot } : { type, slot: indexOrSlot };
}

function onSlotPointerUp(type, indexOrSlot) {
  if (!itemDragActive) return;
  dropTarget.value = type === 'backpack' ? { type, index: indexOrSlot } : { type, slot: indexOrSlot };
  commitDrag();
}

function onItemPointerMove(event) {
  if (!itemDragActive) return;
  dragGhostPosition.value = { x: event.clientX - 24, y: event.clientY - 24 };
}

function onItemPointerUp() {
  if (!itemDragActive) return;
  commitDrag();
}

function resetItemDrag() {
  itemDragActive = false;
  dragSource.value = null;
  dropTarget.value = null;
  dragPreview.value = null;
  document.removeEventListener('pointermove', onItemPointerMove);
  document.removeEventListener('pointerup', onItemPointerUp);
}

function commitDrag() {
  const source = dragSource.value;
  const target = dropTarget.value;
  resetItemDrag();
  if (!source || !target) return;

  if (source.type === 'backpack' && target.type === 'backpack') {
    if (source.index !== target.index) {
      gameState.moveBackpackSlot(source.index, target.index);
      showFeedback('Itens reorganizados na mochila.');
    }
    return;
  }

  if (source.type === 'backpack' && target.type === 'equipment') {
    const itemId = backpackSlots.value[source.index]?.itemId;
    const itemData = ITEMS[itemId];
    if (!itemData || itemData.slot !== target.slot) {
      showFeedback('Este item não pode ser equipado neste slot.');
      return;
    }
    if (gameState.equipFromBackpackSlot(source.index)) {
      weaponEquipSound.currentTime = 0;
      weaponEquipSound.play().catch(() => {});
      showFeedback(`${itemData.name} equipado.`);
    }
    return;
  }

  if (source.type === 'equipment' && target.type === 'backpack') {
    if (gameState.unequipToBackpackSlot(source.slot, target.index)) {
      showFeedback('Item guardado na mochila.');
    } else {
      showFeedback('Não há espaço livre na mochila.');
    }
    return;
  }

  if (source.type === 'equipment' && target.type === 'equipment') {
    const fromItem = equippedItem(source.slot);
    const toItem = equippedItem(target.slot);
    if (!fromItem) return;
    if (toItem && ITEMS[toItem]?.slot !== source.slot) return;
    if (ITEMS[fromItem]?.slot !== target.slot) {
      showFeedback('Este item não pertence a esse slot.');
      return;
    }
    gameState.player.equipment[source.slot] = toItem || null;
    gameState.player.equipment[target.slot] = fromItem;
    gameState.recalculateStats();
    gameState.saveState();
    showFeedback('Equipamento reorganizado.');
  }
}

function onBackpackDoubleClick(index) {
  const slot = backpackSlots.value[index];
  if (!slot) return;
  const itemData = ITEMS[slot.itemId];
  if (!itemData) return;

  if (itemData.slot) {
    if (gameState.equipFromBackpackSlot(index)) {
      weaponEquipSound.currentTime = 0;
      weaponEquipSound.play().catch(() => {});
      showFeedback(`${itemData.name} equipado.`);
    }
    return;
  }

  if (['Consumível', 'Consumível Especial'].includes(itemData.type)) {
    if (gameState.useItem(slot.itemId)) {
      potionDrinkSound.currentTime = 0;
      potionDrinkSound.play().catch(() => {});
      showFeedback(`Você usou ${itemData.name}.`);
    }
  }
}

function onEquipmentDoubleClick(slot) {
  if (gameState.unequipToBackpackSlot(slot)) {
    showFeedback('Item desequipado.');
  } else {
    showFeedback('Não há espaço livre na mochila.');
  }
}

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
  const w = el.offsetWidth || 420;
  const h = el.offsetHeight || 360;
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

const handleClose = () => {
  if (isClosing.value) return;
  isClosing.value = true;
  selectedItemId.value = null;
  resetItemDrag();
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
  resetItemDrag();
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

.backpack-bag {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  width: min(430px, calc(100vw - 20px));
  max-height: min(72vh, 620px);
  padding: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: visible;
  font-family: var(--game-ui-font);
  background:
    linear-gradient(168deg, rgba(110, 72, 48, 0.98) 0%, #4a3020 28%, #2e1e14 65%, #1f140e 100%);
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
  background: linear-gradient(175deg, rgba(130, 88, 58, 0.95) 0%, rgba(72, 48, 34, 0.98) 55%, rgba(45, 30, 22, 1) 100%);
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
}

.backpack-inner {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  margin: 0 10px 10px;
  border-radius: 6px 6px 16px 16px;
  background:
    repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(40, 26, 18, 0.06) 3px, rgba(40, 26, 18, 0.06) 4px),
    linear-gradient(165deg, #c9a888 0%, #a67c52 35%, #8b6344 100%);
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.equipment-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 4px;
  border-top: 2px dashed rgba(45, 28, 18, 0.45);
}

.inventory-slot {
  position: relative;
  aspect-ratio: 1;
  min-height: 68px;
  border-radius: 8px;
  border: 2px solid rgba(45, 28, 18, 0.75);
  background:
    linear-gradient(180deg, rgba(255, 248, 235, 0.82) 0%, rgba(214, 184, 148, 0.72) 100%);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.35);
  cursor: grab;
  padding: 6px;
}

.inventory-slot--equipment {
  min-height: 78px;
}

.inventory-slot--active,
.inventory-slot--target {
  border-color: var(--game-border-gold);
  box-shadow:
    0 0 0 1px rgba(201, 162, 39, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.slot-caption {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 10px;
  font-weight: 800;
  color: rgba(44, 24, 16, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.slot-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.slot-qty {
  position: absolute;
  right: 6px;
  bottom: 4px;
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(26, 15, 7, 0.82);
  color: #f5e6c8;
  font-size: 11px;
  font-weight: 800;
}

.item-details {
  padding: 10px;
  border-radius: 8px;
  background: rgba(44, 24, 16, 0.12);
  border: 1px solid rgba(80, 50, 35, 0.35);
}

.item-details__name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  color: #2c1810;
}

.description,
.detail {
  margin: 0 0 4px;
  font-size: 12px;
  color: #2c1810;
}

.feedback-message {
  margin: 0;
  padding: 8px 10px;
  text-align: center;
  font-size: clamp(11px, 2.6vmin, 14px);
}

.drag-ghost {
  position: fixed;
  z-index: 10060;
  width: 52px;
  height: 52px;
  pointer-events: none;
  border-radius: 8px;
  border: 2px solid var(--game-border-gold);
  background: rgba(255, 248, 235, 0.92);
  box-shadow: var(--game-shadow-out);
  padding: 4px;
}

@media (max-width: 420px) {
  .slot-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
