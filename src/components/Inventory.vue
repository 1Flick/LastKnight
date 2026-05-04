<template>
     <div
       ref="inventoryModal"
       :class="[
         'inventory-modal scroll-unroll',
         isClosing ? 'fade-out-scale' : 'fade-in-scale'
       ]"
     >
       <div ref="header" class="modal-header">
         <div class="gold">
           <img src="/icons/gold-icon.png" alt="Gold Coin" class="gold-icon" />
           <span>{{ gameState.player.gold }}</span>
         </div>
         <h2>INVENTÁRIO</h2>
         <button class="close-btn" @click="handleClose">✖</button>
       </div>

       <div class="inventory-content">
         <div class="item-grid">
           <transition-group name="item-fade" tag="div" class="grid-container">
             <div
               v-for="item in allItems"
               :key="item.itemId"
               class="item-card"
               :class="{
                 clickable: item.usable || item.equipable,
                 equipped: item.equipped,
                 'low-quantity': item.quantity === 1 && item.usable,
                 selected: selectedItem?.itemId === item.itemId
               }"
               @click="handleClick(item)"
             >
               <div class="item-header">
                 <img
                   :src="item.icon"
                   :style="{ width: '62px', height: '62px', imageRendering: 'pixelated' }"
                   :alt="item.name"
                   class="item-icon"
                 />
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
                 <p v-if="item.stats?.speed" class="detail">Velocidade: {{ item.stats.speed > 0 ? '+' : '' }}{{ item.stats.speed }}</p>
               </div>
             </div>
           </transition-group>
         </div>
         <p
           v-if="feedbackMessage"
           class="feedback-message game-ui-toast--banner"
         >{{ feedbackMessage }}</p>
       </div>
     </div>
   </template>

   <script setup>
   import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
   import { useGameState, ITEMS } from '@/stores/gameState.js';

   const emits = defineEmits(['update:show']);
   const gameState = useGameState();

   const feedbackMessage = ref('');
   const isClosing = ref(false);
   const selectedItem = ref(null);

   const inventoryModal = ref(null);
   const header = ref(null);

   // Sons
   const weaponEquipSound = new Audio('/sounds/equip.wav');
   const potionDrinkSound = new Audio('/sounds/potion_drink.wav');

   const getItemIcon = (itemId) => ITEMS[itemId]?.icon || '/assets/icons/unknown-item.png';

   const allItems = computed(() => {
     return gameState.player.inventory.map((invItem) => {
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
                   weaponEquipSound.play().catch((error) => {
                     console.error('Erro ao tocar som de equipar arma:', error);
                   });
                 }
               }
               selectedItem.value = null; // Desseleciona após ação
             }
           : itemData.type.startsWith('Consumível')
           ? () => {
               gameState.useItem(invItem.itemId);
               potionDrinkSound.currentTime = 0;
               potionDrinkSound.play().catch((error) => {
                 console.error('Erro ao tocar som de tomar poção:', error);
               });
               selectedItem.value = null; // Desseleciona após ação
             }
           : null,
       };
     }).filter(Boolean);
   });

   const handleClick = (item) => {
     feedbackMessage.value = '';
     if (selectedItem.value?.itemId === item.itemId) {
       selectedItem.value = null; // Desseleciona se clicar novamente
     } else {
       selectedItem.value = item; // Seleciona o item
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

   let isDragging = false;
   let offsetX = 0;
   let offsetY = 0;

   const handleMouseDown = (e) => {
     isDragging = true;
     const modal = inventoryModal.value;
     const rect = modal.getBoundingClientRect();
     offsetX = e.clientX - rect.left;
     offsetY = e.clientY - rect.top;
     modal.style.position = 'fixed';
     modal.style.left = `${rect.left}px`;
     modal.style.top = `${rect.top}px`;
     modal.style.transform = 'none';
     modal.style.margin = '0';
     modal.classList.add('dragging');
     document.addEventListener('mousemove', handleMouseMove);
     document.addEventListener('mouseup', handleMouseUp);
     e.preventDefault();
   };

   const handleMouseMove = (e) => {
     if (!isDragging) return;
     const modal = inventoryModal.value;
     modal.style.left = `${e.clientX - offsetX}px`;
     modal.style.top = `${e.clientY - offsetY}px`;
   };

   const handleMouseUp = () => {
     if (!isDragging) return;
     isDragging = false;
     const modal = inventoryModal.value;
     modal.classList.remove('dragging');
     localStorage.setItem('inventoryModalPos', JSON.stringify({
       left: modal.style.left,
       top: modal.style.top,
     }));
     document.removeEventListener('mousemove', handleMouseMove);
     document.removeEventListener('mouseup', handleMouseUp);
   };

   const handleClose = () => {
     if (isClosing.value) return;
     isClosing.value = true;
     selectedItem.value = null; // Desseleciona ao fechar
     setTimeout(() => emits('update:show', false), 300);
   };

   onMounted(() => {
     if (header.value) {
       header.value.addEventListener('mousedown', handleMouseDown);
     }
     const savedPos = localStorage.getItem('inventoryModalPos');
     const modal = inventoryModal.value;
     if (savedPos && modal) {
       const pos = JSON.parse(savedPos);
       modal.style.position = 'fixed';
       modal.style.left = pos.left;
       modal.style.top = pos.top;
       modal.style.transform = 'none';
       modal.style.margin = '0';
     }
   });

   onBeforeUnmount(() => {
     if (header.value) {
       header.value.removeEventListener('mousedown', handleMouseDown);
     }
   });
   </script>

   <style scoped>
   .fade-in-scale {
     animation: fadeInScale 0.3s ease forwards;
     opacity: 0;
     transform: scale(0.9);
   }

   .fade-out-scale {
     animation: fadeOutScale 0.3s ease forwards;
   }

   @keyframes fadeInScale {
     from {
       opacity: 0;
       transform: scale(0.9);
     }
     to {
       opacity: 1;
       transform: scale(1);
     }
   }

   @keyframes fadeOutScale {
     from {
       opacity: 1;
       transform: scale(1);
     }
     to {
       opacity: 0;
       transform: scale(0.9);
     }
   }

   .inventory-modal {
     position: fixed;
     z-index: 10000;
     left: 50%;
     top: 50%;
     transform: translate(-50%, -50%);
     width: 520px;
     max-width: 90vw;
     height: auto;
     max-height: 80vh;
     background: linear-gradient(
       160deg,
       var(--game-bg-panel-light) 0%,
       var(--game-bg-panel) 100%
     );
     border: 3px dashed var(--game-gold-bright);
     border-radius: 10px;
     padding: 13px;
     display: flex;
     flex-direction: column;
     box-sizing: border-box;
     overflow-y: auto;
     overflow-x: hidden;
     color: var(--game-cream-soft);
     font-family: var(--game-ui-font);
     box-shadow: var(--game-shadow-modal);
   }

   .inventory-modal::-webkit-scrollbar {
     width: 10px;
   }

   .inventory-modal::-webkit-scrollbar-track {
     background: var(--game-bg-deep);
     border-radius: 5px;
   }

   .inventory-modal::-webkit-scrollbar-thumb {
     background: var(--game-border-gold);
     border-radius: 5px;
   }

   .inventory-modal::-webkit-scrollbar-thumb:hover {
     background: var(--game-gold-bright);
   }

   .modal-header {
     display: flex;
     align-items: center;
     justify-content: space-between;
     padding: 8px 13px;
     margin-bottom: 13px;
     border-bottom: 2px dashed var(--game-gold-bright);
     background: var(--game-bg-deep);
     border-radius: 5px;
     cursor: grab;
   }

   .modal-header h2 {
     font-size: 31px;
     color: var(--game-cream);
     margin: 0;
     text-shadow: 1px 1px 0 var(--game-bg-deep);
     flex-grow: 1;
     text-align: center;
     font-family: var(--game-ui-font);
   }

   .gold {
     display: flex;
     align-items: center;
     gap: 8px;
     font-size: 21px;
     color: var(--game-gold-bright);
     font-weight: 700;
     text-shadow: 1px 1px 0 var(--game-bg-deep);
   }

   .gold-icon {
     width: 26px;
     height: 26px;
     filter: drop-shadow(1px 1px 1px var(--game-bg-deep));
   }

   .close-btn {
     font-family: var(--game-ui-font);
     background: var(--game-border-gold);
     border: 2px solid var(--game-bg-deep);
     border-radius: 8px;
     width: 39px;
     height: 39px;
     color: var(--game-cream);
     font-weight: bold;
     font-size: 21px;
     cursor: pointer;
     transition: background-color 0.2s ease, color 0.2s ease;
   }

   .close-btn:hover {
     background: var(--game-honey);
     color: var(--game-wood-dark);
   }

   .inventory-content {
     display: flex;
     flex-direction: column;
     gap: 10px;
     flex: 1;
     overflow-y: auto;
     overflow-x: hidden;
     width: 100%;
     box-sizing: border-box;
   }

   .item-grid {
     display: flex;
     flex-direction: column;
     gap: 8px;
     padding: 5px;
   }

   .item-card {
     width: 100%;
     padding: 8px;
     border: 2px dashed var(--game-border-gold);
     border-radius: 8px;
     background: var(--game-bg-deep);
     display: flex;
     flex-direction: column;
     align-items: flex-start;
     position: relative;
     cursor: default;
     transition: transform 0.15s ease, border-color 0.2s ease;
     box-shadow: inset 0 0 5px #1a0f07;
   }

   .item-card:hover,
   .item-card.selected {
     border-color: var(--game-gold-bright);
     transform: scale(1.02);
   }

   .item-card.clickable {
     cursor: pointer;
   }

   .item-card.equipped {
     border-color: var(--game-gold);
     box-shadow: 0 0 8px var(--game-gold);
   }

   .item-header {
     display: flex;
     align-items: center;
     gap: 13px;
     margin-bottom: 5px;
     width: 100%;
   }

   .item-icon {
     border: 2px solid var(--game-bg-panel-light);
     border-radius: 5px;
     padding: 3px;
     background: var(--game-bg-deep);
   }

   .item-info {
     display: flex;
     flex-direction: column;
     gap: 3px;
     max-width: calc(100% - 78px);
   }

   .item-name {
     font-size: 21px;
     color: var(--game-cream);
     font-weight: 600;
     text-shadow: 1px 1px 0 var(--game-bg-deep);
   }

   .item-quantity {
     font-size: 18px;
     color: var(--game-honey-light);
     font-weight: 700;
   }

   .equipped-tag {
     font-size: 16px;
     color: var(--game-gold);
     font-weight: 700;
     text-shadow: 1px 1px 0 var(--game-bg-deep);
     background: rgba(26, 15, 7, 0.7);
     padding: 3px 8px;
     border-radius: 4px;
   }

   .item-details {
     padding: 5px;
     background: var(--game-bg-panel-light);
     border-radius: 5px;
     width: 100%;
     max-height: 130px;
     overflow-y: auto;
     box-shadow: inset 0 0 5px #1a0f07;
     margin-top: 5px;
   }

   .item-details::-webkit-scrollbar {
     width: 8px;
   }

   .item-details::-webkit-scrollbar-track {
     background: #1a0f07;
     border-radius: 4px;
   }

   .item-details::-webkit-scrollbar-thumb {
     background: #a6793b;
     border-radius: 4px;
   }

   .item-details::-webkit-scrollbar-thumb:hover {
     background: #f3d88c;
   }

   .description {
     margin-bottom: 5px;
     font-size: 18px;
     line-height: 1.5;
     color: var(--game-parchment-mid);
     word-break: break-word;
   }

   .detail {
     font-size: 18px;
     margin-bottom: 3px;
     font-weight: 600;
     color: var(--game-gold-bright);
     text-shadow: 1px 1px 0 var(--game-bg-deep);
   }

   .feedback-message {
     position: fixed;
     bottom: 26px;
     left: 50%;
     transform: translateX(-50%);
     padding: 10px 16px;
     animation: fadeInOut 3s ease forwards;
     pointer-events: none;
     z-index: 10001;
     max-width: 80%;
     text-align: center;
     font-size: 21px;
     box-sizing: border-box;
     font-family: var(--game-ui-font);
   }

   @keyframes fadeInOut {
     0% { opacity: 0; transform: translateX(-50%) translateY(26px); }
     10% { opacity: 1; transform: translateX(-50%) translateY(0); }
     90% { opacity: 1; transform: translateX(-50%) translateY(0); }
     100% { opacity: 0; transform: translateX(-50%) translateY(-26px); }
   }

   .item-fade-enter-active,
   .item-fade-leave-active {
     transition: all 0.3s ease;
   }

   .item-fade-enter-from,
   .item-fade-leave-to {
     opacity: 0;
     transform: translateY(13px);
   }

   .inventory-modal.dragging {
     cursor: grabbing !important;
     user-select: none;
   }

   @media (max-width: 768px) {
     .inventory-modal {
       width: 90vw;
       max-height: 85vh;
       padding: 10px;
     }

     .modal-header h2 {
       font-size: 26px;
     }

     .gold {
       font-size: 18px;
     }

     .gold-icon {
       width: 23px;
       height: 23px;
     }

     .close-btn {
       width: 36px;
       height: 36px;
       font-size: 18px;
     }

     .item-name {
       font-size: 18px;
     }

     .item-quantity,
     .equipped-tag,
     .description,
     .detail {
       font-size: 16px;
     }

     .feedback-message {
       padding: 8px 13px;
       font-size: 18px;
     }
   }
   </style>