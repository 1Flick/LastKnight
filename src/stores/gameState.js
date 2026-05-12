import { defineStore } from 'pinia';
import { CLASSES, normalizeClassName } from '@/data/classes.js';

export { CLASSES };

const BACKPACK_SLOT_COUNT = 12;

function createEmptyBackpackSlots() {
  return Array.from({ length: BACKPACK_SLOT_COUNT }, () => null);
}

function createDefaultEquipment() {
  return { weapon: null, armor: null, shield: null };
}

function ensurePlayerEquipment(player) {
  if (!player.equipment || typeof player.equipment !== 'object') {
    player.equipment = createDefaultEquipment();
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(player.equipment, 'armor')) {
    player.equipment.armor = null;
  }
  if (!Object.prototype.hasOwnProperty.call(player.equipment, 'shield')) {
    player.equipment.shield = null;
  }
}

function ensureBackpackSlots(player) {
  if (Array.isArray(player.backpackSlots) && player.backpackSlots.length === BACKPACK_SLOT_COUNT) {
    return;
  }

  const slots = createEmptyBackpackSlots();
  let slotIndex = 0;

  for (const entry of player.inventory || []) {
    if (!entry?.itemId || !ITEMS[entry.itemId] || slotIndex >= BACKPACK_SLOT_COUNT) continue;
    slots[slotIndex] = { itemId: entry.itemId, quantity: entry.quantity };
    slotIndex += 1;
  }

  player.backpackSlots = slots;
}

function syncInventoryFromBackpack(player) {
  ensureBackpackSlots(player);
  player.inventory = player.backpackSlots
    .filter((slot) => slot?.itemId && ITEMS[slot.itemId])
    .map((slot) => ({ itemId: slot.itemId, quantity: slot.quantity }));
}

// Definição dos itens do jogo
export const ITEMS = {
  sword_wood: { id: 'sword_wood', name: 'Espada de Madeira', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Guerreiro'], stats: { attack: 5 }, description: 'Uma espada de treino.', icon: '/icons/weapons/sword_wood.png' },
  sword_iron: { id: 'sword_iron', name: 'Espada de Ferro', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Guerreiro'], price: 100, stats: { attack: 10 }, description: 'Uma espada básica, mas confiável.', icon: '/icons/weapons/sword_iron.png' },
  axe_iron: { id: 'axe_iron', name: 'Machado de Ferro', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Guerreiro'], stats: { attack: 13, speed: -1 }, price: 150, description: 'Pesado, mas poderoso.', icon: '/icons/weapons/axe_iron.png' },
  sword_mythril: { id: 'sword_mythril', name: 'Lança Rúnica', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Guerreiro'], price: 200, stats: { attack: 25 }, description: 'Aumenta o dano em +25. Forjada com magia anã.', icon: '/icons/weapons/sword_mythril.png' },
  staff_old: { id: 'staff_old', name: 'Cajado Velho', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arcane', allowedClasses: ['Mago'], stats: { attack: 5 }, description: 'Cajado gasto, mas ainda canaliza energia.', icon: '/icons/weapons/staff_old.png' },
  staff_arcane: { id: 'staff_arcane', name: 'Cajado Arcano', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arcane', allowedClasses: ['Mago'], price: 110, stats: { attack: 9 }, description: 'Canaliza energia arcana com mais precisão.', icon: '/icons/weapons/staff_arcane.png' },
  staff_runic: { id: 'staff_runic', name: 'Cajado Rúnico', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arcane', allowedClasses: ['Mago'], price: 190, stats: { attack: 16 }, description: 'Runas antigas amplificam cada projétil.', icon: '/icons/weapons/staff_runic.png' },
  bow_improvised: { id: 'bow_improvised', name: 'Arco Improvisado', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arrow', allowedClasses: ['Arqueiro'], stats: { attack: 6, speed: 1 }, description: 'Arco rústico montado com o que havia à mão.', icon: '/icons/weapons/bow_improvised.png' },
  bow_wood: { id: 'bow_wood', name: 'Arco de Caçador', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arrow', allowedClasses: ['Arqueiro'], price: 105, stats: { attack: 10, speed: 1 }, description: 'Arco equilibrado para caça e combate.', icon: '/icons/weapons/bow_wood.png' },
  bow_war: { id: 'bow_war', name: 'Arco de Guerra', type: 'Arma', slot: 'weapon', attackType: 'ranged', projectileKind: 'arrow', allowedClasses: ['Arqueiro'], price: 185, stats: { attack: 17, speed: 2 }, description: 'Flechas pesadas perfuram armaduras.', icon: '/icons/weapons/bow_war.png' },
  dagger_iron: { id: 'dagger_iron', name: 'Adaga de Ferro', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Ladino'], stats: { attack: 8, speed: 2 }, description: 'Lâmina curta e veloz.', icon: '/icons/weapons/dagger_iron.png' },
  dagger_steel: { id: 'dagger_steel', name: 'Adaga de Aço', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Ladino'], price: 100, stats: { attack: 12, speed: 2 }, description: 'Aço temperado para golpes certeiros.', icon: '/icons/weapons/dagger_steel.png' },
  dagger_shadow: { id: 'dagger_shadow', name: 'Adaga das Sombras', type: 'Arma', slot: 'weapon', attackType: 'melee', allowedClasses: ['Ladino'], price: 180, stats: { attack: 18, speed: 3 }, description: 'Foi forjada para emboscadas letais.', icon: '/icons/weapons/dagger_shadow.png' },
  armor_leather: { id: 'armor_leather', name: 'Armadura de Couro', type: 'Armadura', slot: 'armor', stats: { defense: 4 }, description: 'Proteção leve de couro curtido.', icon: '/icons/armor/armor_leather.png' },
  armor_chain: { id: 'armor_chain', name: 'Cota de Malha', type: 'Armadura', slot: 'armor', price: 120, stats: { defense: 8, speed: -1 }, description: 'Malha entrelaçada de ferro.', icon: '/icons/armor/armor_chain.png' },
  shield_wood: { id: 'shield_wood', name: 'Escudo de Madeira', type: 'Escudo', slot: 'shield', stats: { defense: 3 }, description: 'Escudo de tábuas reforçadas.', icon: '/icons/shields/shield_wood.png' },
  shield_iron: { id: 'shield_iron', name: 'Escudo de Ferro', type: 'Escudo', slot: 'shield', price: 90, stats: { defense: 6, speed: -1 }, description: 'Escudo pesado de ferro.', icon: '/icons/shields/shield_iron.png' },
  potion_health: { id: 'potion_health', name: 'Poção de Cura', type: 'Consumível', price: 50, effect: { heal: 50 }, description: 'Restaura 50 de vida.', icon: '/icons/potions/potvida-icon.png' },
  potion_forbidden: { id: 'potion_forbidden', name: 'Poção Proibida', type: 'Consumível Especial', price: 500, effect: { special: 'sacrifice' }, description: '?????????????????????', icon: '/icons/potions/potforbidden-icon.png' },
  key_ancient: { id: 'key_ancient', name: 'Chave Ancestral', type: 'Chave', description: 'Uma chave antiga das ruínas.', icon: '/icons/key_ancient.png' },
  key_ice: { id: 'key_ice', name: 'Chave de Gelo', type: 'Chave', description: 'Uma chave congelada da montanha.', icon: '/icons/key_ice.png' },
  key_fire: { id: 'key_fire', name: 'Chave de Fogo', type: 'Chave', description: 'Uma chave envolta em chamas da caverna.', icon: '/icons/key_fire.png' },
  key_small_rusty: { id: 'key_small_rusty', name: 'Chave Pequena', type: 'Chave', description: 'Abre uma porta no castelo.', icon: '/icons/key-detail.png' },
  blessing_river: {
    id: 'blessing_river',
    name: 'Bênção do Rio',
    type: 'Bênção',
    price: 75,
    description: 'Concede proteção divina do rio, aumentando a resistência.',
    icon: '/icons/blessing-river.png',
  },
  gold: { id: 'gold', name: 'Ouro', type: 'Moeda', description: 'Moedas de ouro do reino.', icon: '/icons/gold-icon.png' },
  backpack: { id: 'backpack', name: 'Mochila', type: 'Utilitário', description: 'Mochila de couro para a jornada.', icon: '/icons/bag-icon.png' },
  ice_shard: { id: 'ice_shard', name: 'Fragmento de Gelo', type: 'Material', description: 'Cristal gélido da montanha.', icon: '/icons/materials/ice_shard.png' },
  fire_shard: { id: 'fire_shard', name: 'Fragmento de Fogo', type: 'Material', description: 'Brasa petrificada da caverna.', icon: '/icons/materials/fire_shard.png' },
  dragon_scale: { id: 'dragon_scale', name: 'Escama de Dragão', type: 'Material', description: 'Escama resistente de dragão.', icon: '/icons/materials/dragon_scale.png' },
};

// Definição do store do jogo
export const useGameState = defineStore('game', {
  state: () => {
    let savedState = null;
    try {
      const stored = localStorage.getItem('gameState');
      if (stored) {
        savedState = JSON.parse(stored);
        // Garante compatibilidade com estados salvos antigos
        if (!savedState.player.hasOwnProperty('lives')) {
          savedState.player.lives = 3;
        }
        if (!savedState.hasOwnProperty('shaders')) {
          savedState.shaders = true;
        }
        if (!savedState.player.hasOwnProperty('princessAlive')) {
          savedState.player.princessAlive = false;
        }
        if (!savedState.hasOwnProperty('resolution')) {
          savedState.resolution = 1;
        }
        ensurePlayerEquipment(savedState.player);
        ensureBackpackSlots(savedState.player);
        syncInventoryFromBackpack(savedState.player);
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
    }

    return savedState || {
      player: {
        classe: 'Guerreiro',
        name: null,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        gold: 0,
        lives: 3,
        princessAlive: false, // Rastreia se a princesa está viva
        inventory: [
          { itemId: 'potion_health', quantity: 1 },
        ],
        backpackSlots: [
          { itemId: 'potion_health', quantity: 1 },
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        equipment: {
          weapon: 'sword_wood',
          armor: null,
          shield: null,
        },
        stats: {
          attack: 10,
          defense: 5,
          speed: 10,
        },
        keys: {
          ancestral: false,
          ice: false,
          fire: false,
        },
        hasRiverBlessing: false,
        hasForbiddenPotion: false,
      },
      boss: {
        name: 'Magnus',
        health: 700,
        maxHealth: 700,
        stamina: 100,
        maxStamina: 100,
        phase: 1,
        isVulnerable: false,
        attackPattern: null,
      },
      currentArea: 'CutsceneInicial',
      levelsCompleted: [],
      quests: {
        mainQuestStep: 0,
      },
      magnusDefeated: false,
      endingTriggered: false,
      endingType: null,
      isBagOpen: false,
      currentDialog: null,
      shaders: true,
      resolution: 1,
    };
  },

  getters: {
    isPlayerAlive: (state) => state.player.health > 0,
    isBossAlive: (state) => state.boss.health > 0,
    isPlayerStaminaFull: (state) => state.player.stamina >= state.player.maxStamina,
    isBossStaminaFull: (state) => state.boss.stamina >= state.boss.maxStamina,
    getItemQuantity: (state) => (itemId) => {
      const item = state.player.inventory.find((i) => i.itemId === itemId);
      return item ? item.quantity : 0;
    },
  },

  actions: {
    saveState() {
      try {
        localStorage.setItem('gameState', JSON.stringify(this.$state));
      } catch (e) {
        console.error('Error saving state to localStorage:', e);
      }
    },

    setPlayerName(name) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      this.player.name = trimmed || null;
      this.saveState();
    },

    initializePlayerName() {
      if (this.player.name === undefined) {
        this.player.name = null;
      }
    },

    setPlayerClass(className) {
      const key = normalizeClassName(className);
      if (!CLASSES[key]) return;
      const classData = CLASSES[key];
      this.player.classe = key;
      this.player.maxHealth = classData.baseStats.maxHealth;
      this.player.maxStamina = classData.baseStats.maxStamina;
      this.player.health = this.player.maxHealth;
      this.player.stamina = this.player.maxStamina;
      this.player.lives = 3;
      this.player.inventory = [];
      this.player.backpackSlots = createEmptyBackpackSlots();
      this.player.equipment = createDefaultEquipment();
      this.addItemToInventory('potion_health', 2);
      const weaponId = classData.startItems?.weapon;
      if (weaponId && ITEMS[weaponId]) {
        this.addItemToInventory(weaponId, 1);
        this.equipItem(weaponId);
      }
      this.recalculateStats();
      this.saveState();
    },

    recalculateStats() {
      if (!this.player.classe) return;
      const baseStats = CLASSES[this.player.classe].baseStats;
      let currentStats = { ...baseStats };
      for (const slot in this.player.equipment) {
        const itemId = this.player.equipment[slot];
        if (itemId && ITEMS[itemId] && ITEMS[itemId].stats) {
          for (const stat in ITEMS[itemId].stats) {
            currentStats[stat] = (currentStats[stat] || 0) + ITEMS[itemId].stats[stat];
          }
        }
      }
      console.log('Recalculating stats. Before:', this.player.stats);
      this.player.stats = currentStats;
      const oldMaxHealth = this.player.maxHealth;
      this.player.maxHealth = currentStats.maxHealth;
      this.player.maxStamina = currentStats.maxStamina;
      if (this.player.maxHealth > oldMaxHealth) {
        this.player.health = Math.min(this.player.health, this.player.maxHealth);
      }
      this.player.stamina = Math.min(this.player.stamina, this.player.maxStamina);
      console.log('Recalculating stats. After:', this.player.stats);
      this.saveState();
    },

    addItemToInventory(itemId, quantity = 1) {
      if (!ITEMS[itemId]) return;
      ensureBackpackSlots(this.player);
      let remaining = quantity;

      for (const slot of this.player.backpackSlots) {
        if (remaining <= 0) break;
        if (slot?.itemId === itemId) {
          slot.quantity += remaining;
          remaining = 0;
        }
      }

      while (remaining > 0) {
        const emptyIndex = this.player.backpackSlots.findIndex((slot) => !slot);
        if (emptyIndex === -1) break;
        this.player.backpackSlots[emptyIndex] = { itemId, quantity: remaining };
        remaining = 0;
      }

      syncInventoryFromBackpack(this.player);
      if (itemId === 'potion_forbidden') {
        this.player.hasForbiddenPotion = true;
      }
      this.saveState();
    },

    removeItemFromInventory(itemId, quantity = 1) {
      ensureBackpackSlots(this.player);
      let remaining = quantity;

      for (const slot of this.player.backpackSlots) {
        if (remaining <= 0) break;
        if (slot?.itemId !== itemId) continue;
        const removeAmount = Math.min(slot.quantity, remaining);
        slot.quantity -= removeAmount;
        remaining -= removeAmount;
        if (slot.quantity <= 0) {
          const index = this.player.backpackSlots.indexOf(slot);
          if (index > -1) this.player.backpackSlots[index] = null;
        }
      }

      syncInventoryFromBackpack(this.player);
      if (itemId === 'potion_forbidden' && this.getItemQuantity('potion_forbidden') === 0) {
        this.player.hasForbiddenPotion = false;
      }
      this.saveState();
    },

    moveBackpackSlot(fromIndex, toIndex) {
      ensureBackpackSlots(this.player);
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= BACKPACK_SLOT_COUNT ||
        toIndex >= BACKPACK_SLOT_COUNT
      ) {
        return false;
      }

      const fromSlot = this.player.backpackSlots[fromIndex];
      const toSlot = this.player.backpackSlots[toIndex];

      if (!fromSlot) return false;

      if (!toSlot) {
        this.player.backpackSlots[toIndex] = { ...fromSlot };
        this.player.backpackSlots[fromIndex] = null;
      } else if (toSlot.itemId === fromSlot.itemId) {
        toSlot.quantity += fromSlot.quantity;
        this.player.backpackSlots[fromIndex] = null;
      } else {
        this.player.backpackSlots[toIndex] = { ...fromSlot };
        this.player.backpackSlots[fromIndex] = { ...toSlot };
      }

      syncInventoryFromBackpack(this.player);
      this.saveState();
      return true;
    },

    equipFromBackpackSlot(slotIndex) {
      ensureBackpackSlots(this.player);
      const slot = this.player.backpackSlots[slotIndex];
      if (!slot?.itemId) return false;

      const itemData = ITEMS[slot.itemId];
      if (!itemData?.slot) return false;

      const equipmentSlot = itemData.slot;
      const currentlyEquipped = this.player.equipment[equipmentSlot];

      if (currentlyEquipped) {
        const previousItem = { itemId: currentlyEquipped, quantity: 1 };
        this.player.backpackSlots[slotIndex] = previousItem;
      } else {
        this.player.backpackSlots[slotIndex] = null;
      }

      this.player.equipment[equipmentSlot] = slot.itemId;
      syncInventoryFromBackpack(this.player);
      this.recalculateStats();
      this.saveState();
      return true;
    },

    unequipToBackpackSlot(equipmentSlot, targetIndex = null) {
      ensureBackpackSlots(this.player);
      const itemId = this.player.equipment[equipmentSlot];
      if (!itemId) return false;

      const destinationIndex =
        targetIndex != null
          ? targetIndex
          : this.player.backpackSlots.findIndex((slot) => !slot);

      if (destinationIndex < 0 || destinationIndex >= BACKPACK_SLOT_COUNT) {
        return false;
      }

      if (this.player.backpackSlots[destinationIndex]) {
        return false;
      }

      this.player.backpackSlots[destinationIndex] = { itemId, quantity: 1 };
      this.player.equipment[equipmentSlot] = null;
      syncInventoryFromBackpack(this.player);
      this.recalculateStats();
      this.saveState();
      return true;
    },

    equipItem(itemId) {
      const itemData = ITEMS[itemId];
      if (!itemData || !itemData.slot) return;
      ensureBackpackSlots(this.player);
      const slotIndex = this.player.backpackSlots.findIndex((slot) => slot?.itemId === itemId);
      if (slotIndex > -1) {
        this.equipFromBackpackSlot(slotIndex);
        return;
      }

      const currentItemInSlot = this.player.equipment[itemData.slot];
      if (currentItemInSlot === itemId) {
        return;
      }
      if (currentItemInSlot) {
        this.unequipItem(itemData.slot);
      }
      this.player.equipment[itemData.slot] = itemId;
      this.recalculateStats();
      this.saveState();
    },

    unequipItem(slot) {
      const itemId = this.player.equipment[slot];
      if (!itemId) return;
      if (!this.unequipToBackpackSlot(slot)) {
        this.player.equipment[slot] = null;
        this.recalculateStats();
        this.saveState();
      }
    },

    takeDamage(amount) {
      const defense = this.player.stats.defense || 0;
      const damageTaken = Math.max(1, amount - defense);
      this.player.health = Math.max(0, this.player.health - damageTaken);
      if (this.player.health === 0) {
        this.handleDeath();
      }
      this.saveState();
    },

    handleDeath() {
      this.player.lives -= 1;
      if (this.player.lives > 0) {
        this.player.health = this.player.maxHealth;
        this.player.stamina = this.player.maxStamina;
        console.log(`Player died! Lives remaining: ${this.player.lives}`);
      } else {
        this.gameOver();
      }
      this.saveState();
    },

    gameOver() {
      this.player.health = 0;
      this.player.lives = 0;
      this.endingTriggered = true;
      this.endingType = 'gameover';
      this.saveState();
      console.log('Game Over: Player has been defeated.');
    },

    useStamina(amount) {
      this.player.stamina = Math.max(0, this.player.stamina - amount);
      this.saveState();
    },

    recoverStamina(amount) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + amount);
      this.saveState();
    },

    healPlayer(amount) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
      this.saveState();
    },

    restorePlayer() {
      this.player.health = 100;
      this.player.stamina = this.player.maxStamina;
      this.saveState();
    },

    useItem(itemId) {
      const itemData = ITEMS[itemId];
      const itemInInventory = this.player.inventory.find((i) => i.itemId === itemId);
      if (!itemData || !itemInInventory || itemInInventory.quantity <= 0) return false;
      let used = false;
      if (itemData.type === 'Consumível' && itemData.effect) {
        if (itemData.effect.heal) {
          this.healPlayer(itemData.effect.heal);
          used = true;
        }
        if (itemData.effect.stamina) {
          this.recoverStamina(itemData.effect.stamina); // Corrigido de recalculateStats para recoverStamina
          used = true;
        }
      } else if (itemData.type === 'Consumível Especial' && itemData.effect?.special === 'sacrifice') {
        console.log('Poção Proibida selecionada para uso...');
        used = true;
      }
      if (used && itemData.type !== 'Consumível Especial') {
        this.removeItemFromInventory(itemId, 1);
      }
      this.saveState();
      return used;
    },

    addGold(amount) {
      this.player.gold += amount;
      this.saveState();
    },

    removeGold(amount) {
      this.player.gold = Math.max(0, this.player.gold - amount);
      this.saveState();
    },

    collectKey(keyType) {
      if (this.player.keys.hasOwnProperty(keyType)) {
        this.player.keys[keyType] = true;
        this.addItemToInventory(`key_${keyType}`, 1);
      }
      this.saveState();
    },

    grantRiverBlessing() {
      this.player.hasRiverBlessing = true;
      this.saveState();
    },

    collectForbiddenPotion() {
      this.player.hasForbiddenPotion = true;
      this.addItemToInventory('potion_forbidden', 1);
      this.saveState();
    },

    playerAttackAction() {
      if (this.player.stamina < 10)
        return { success: false, message: 'Sem stamina!' };

      this.useStamina(10);
      const attackPower = this.player.stats.attack || 5;
      const damage = Math.floor(Math.random() * (attackPower / 2)) + Math.floor(attackPower / 2) + 1;
      this.saveState();

      const weaponId = this.player.equipment.weapon;
      const weapon = weaponId ? ITEMS[weaponId] : null;
      const weaponName = weapon?.name || 'punhos';

      return {
        success: true,
        damage,
        message: weapon?.attackType === 'ranged'
          ? `Você dispara com ${weaponName}!`
          : `Você ataca com ${weaponName}!`,
        attackType: weapon?.attackType || 'melee',
        projectileKind: weapon?.projectileKind || 'arrow',
        weaponId,
      };
    },

    damageBoss(amount) {
      if (this.boss.isVulnerable) {
        this.boss.health = Math.max(0, this.boss.health - amount);
        this.checkBossPhaseChange();
        if (this.boss.health === 0) {
          this.defeatMagnus();
        }
      }
      this.saveState();
    },

    setBossVulnerable(isVulnerable) {
      this.boss.isVulnerable = isVulnerable;
      this.saveState();
    },

    setBossPhase(phase) {
      this.boss.phase = phase;
      this.saveState();
    },

    resetBossStamina() {
      this.boss.stamina = this.boss.maxStamina;
      this.saveState();
    },

    drainBossStamina(amount) {
      this.boss.stamina = Math.max(0, this.boss.stamina - amount);
      if (this.boss.stamina === 0 && !this.boss.isVulnerable) {
        this.setBossVulnerable(true);
      }
      this.saveState();
    },

    checkBossPhaseChange() {
      const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
      if (this.boss.phase === 1 && healthPercent <= 66) {
        this.setBossPhase(2);
      } else if (this.boss.phase === 2 && healthPercent <= 33) {
        this.setBossPhase(3);
      }
      this.saveState();
    },

    completeLevel(levelId) {
      if (!this.levelsCompleted.includes(levelId)) {
        this.levelsCompleted.push(levelId);
      }
      this.saveState();
    },

    setCurrentArea(areaName) {
      this.currentArea = areaName;
      this.saveState();
    },

    defeatMagnus() {
      this.magnusDefeated = true;
      if (this.player.hasForbiddenPotion) {
        this.player.health = this.player.maxHealth; // Jogador vive
        this.boss.health = this.boss.maxHealth; // Magnus vive
        this.useItem('potion_forbidden'); // Usa a poção
        this.removeItemFromInventory('potion_forbidden', 1); // Remove a poção
        this.player.hasForbiddenPotion = false; // Atualiza a flag
        this.triggerEnding('forbidden_potion_ending'); // Final especial
        console.log('Poção Proibida usada: Jogador e Magnus sobrevivem!');
      } else {
        this.triggerEnding('victory'); // Final padrão
        console.log('Magnus foi derrotado!');
      }
      this.saveState();
    },

    triggerEnding(type) {
      if (!this.endingTriggered) {
        this.endingType = type;
        this.endingTriggered = true;
        if (type === 'forbidden_potion_ending') {
          this.player.health = this.player.maxHealth; // Jogador vive
          this.player.princessAlive = true; // Princesa vive
          console.log('Final da Poção Proibida: Jogador e Princesa sobrevivem.');
        } else if (type === 'kill_princess') {
          this.player.princessAlive = false; // Princesa morre
        } else if (type === 'sacrifice_self') {
          this.player.princessAlive = true; // Princesa vive
          this.takeDamage(this.player.maxHealth); // Jogador morre
        } else if (type === 'both_die') {
          this.player.princessAlive = false; // Princesa morre
          this.takeDamage(this.player.maxHealth); // Jogador morre
        } else if (type === 'victory') {
          this.player.princessAlive = false; // Princesa morre (padrão contra Magnus)
        }
      }
      this.saveState();
    },

    toggleBag() {
      this.isBagOpen = !this.isBagOpen;
      this.saveState();
    },

    toggleShaders() {
      this.shaders = !this.shaders;
      this.saveState();
    },
  },
});