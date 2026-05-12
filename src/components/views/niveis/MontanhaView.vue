<template>
  <div class="montanha-view" :style="showDialogue || showCutscene ? dialogueOrCutsceneBackgroundStyle : backgroundStyle">
    <!-- Cold Overlay -->
    <div v-if="showColdEffect" class="cold-overlay"></div>

    <!-- Dialogue (at mountain base) -->
    <div v-if="showDialogue" class="dialogue-container" tabindex="0" @click="advanceDialogue" @keydown="advanceDialogue">
      <div class="dialogue-content">
        <div v-for="(line, index) in dialogueLines" :key="index" class="dialogue-line" :class="{ visible: index < currentDialogueLine }">
          <span class="typewriter">{{ displayedDialogueLines[index] || '' }}</span>
        </div>
        <div
          v-if="currentDialogueLine >= dialogueLines.length"
          class="dialogue-arrow"
          @click.stop="endDialogue"
          role="button"
          aria-label="Avançar para a interação"
        >
          ➤
        </div>
      </div>
    </div>

    <!-- Cutscene (at summit) -->
    <div v-if="showCutscene" class="cutscene-container" tabindex="0" @click="advanceCutscene" @keydown="advanceCutscene">
      <div class="cutscene-content">
        <div v-for="(line, index) in cutsceneLines" :key="index" class="cutscene-line" :class="{ visible: index < currentCutsceneLine }">
          <span class="typewriter">{{ displayedLines[index] || '' }}</span>
        </div>
        <div
          v-if="currentCutsceneLine >= cutsceneLines.length"
          class="cutscene-arrow"
          @click.stop="endCutscene"
          role="button"
          aria-label="Avançar para a interação"
        >
          ➤
        </div>
      </div>
    </div>

    <!-- HUD (visible during battle) -->
    <div v-if="inBattle && !showDialogue && !showCutscene" class="main-hud">
      <div class="panel-frame">
        <div class="stat vida" aria-label="Vida do jogador">
          <div class="icon-container" aria-hidden="true">
            <img src="/icons/life-icon.png" alt="" class="icon" />
            <span class="lives-overlay">{{ gameState.player.lives }}</span>
          </div>
          <div class="bar-container segmented" role="progressbar" :aria-valuenow="gameState.player.health" :aria-valuemax="gameState.player.maxHealth" aria-label="Barra de vida">
            <div
              v-for="i in maxBarSegments"
              :key="`vida-${i}`"
              class="segment"
              :class="{ filled: i <= filledHealthSegments }"
            ></div>
            <span class="bar-label">
              {{ Math.floor(gameState.player.health) }}/{{ Math.floor(gameState.player.maxHealth) }}
            </span>
          </div>
        </div>
        <div class="stat energia" aria-label="Energia do jogador">
          <div class="icon-container" aria-hidden="true">
            <img src="/icons/stam-icon.png" alt="" class="icon" />
          </div>
          <div class="bar-container segmented" role="progressbar" :aria-valuenow="gameState.player.stamina" :aria-valuemax="gameState.player.maxStamina" aria-label="Barra de energia">
            <div
              v-for="i in maxBarSegments"
              :key="`energia-${i}`"
              class="segment"
              :class="{ filled: i <= filledStaminaSegments }"
            ></div>
            <span class="bar-label">
              {{ Math.floor(gameState.player.stamina) }}/{{ Math.floor(gameState.player.maxStamina) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Interactions at Mountain Base -->
      <div v-if="atMountainBase && !showDialogue && !showCutscene && !inBattle" class="interactions">
        <p>O vento uiva ao redor da base da Montanha de Gelo.</p>
        <p>Escalar parece perigoso, mas o topo guarda segredos.</p>
        <div class="interaction-buttons">
          <button @click="climbMountain" :disabled="gameState.player.stamina < 20">
            Escalar Montanha
          </button>
          <button @click="fleeArea">Fugir</button>
        </div>
      </div>
      <!-- Interactions at Summit -->
      <div v-if="!atMountainBase && !bossDefeated && !inBattle && !showCutscene && !showDialogue" class="interactions">
        <p>O ar gélido corta seus pulmões. A montanha é traiçoeira.</p>
        <p><strong>Inimigo Final:</strong> O Dragão de Gelo aguarda no pico.</p>
        <div class="interaction-buttons">
          <button @click="confrontBoss">Enfrentar o Dragão de Gelo</button>
          <button @click="fleeArea">Fugir</button>
        </div>
      </div>
      <!-- Post-Battle Interactions -->
      <div v-if="!inBattle && bossDefeated && !showCutscene && !showDialogue" class="interactions">
        <p>O Dragão de Gelo foi derrotado. A nevasca parece diminuir.</p>
        <p v-if="!gameState.player.keys.ice">Uma chave congelada repousa onde o dragão caiu.</p>
        <button v-if="!gameState.player.keys.ice" @click="collectKey">Pegar a Chave de Gelo</button>
      </div>

      <!-- Battle System -->
      <div v-if="inBattle && !showDialogue && !showCutscene" class="medieval-battle-container">
        <div class="battle-arena">
          <div class="game-status-top">
            <div v-if="!gameOver && !victory">{{ battleStatus }}</div>
            <div v-if="victory" class="victory-message">✨ Triunfo! Dragão de Gelo caiu! ✨</div>
            <div v-if="gameOver" class="game-over-message">💀 Derrota! A escuridão prevaleceu... 💀</div>
          </div>

          <!-- Player Character -->
          <div
            class="unit player-character"
            :class="{ 'is-attacking': playerAttacking, 'is-damaged': damagedPlayer }"
            :style="{
              top: `${playerCharacter.top}px`,
              left: `${playerCharacter.left}px`,
              backgroundImage: `url(${playerSprite})`,
              backgroundPosition: `-${animations[currentAnimation].frames[currentFrame] * frameWidth}px -${animations[currentAnimation].row * frameHeight}px`,
              width: `${frameWidth}px`,
              height: `${frameHeight}px`
            }"
          >
          </div>
          <div class="character-info player-info">
            <span class="character-name">{{ gameState.player.name || 'Herói' }} ({{ weaponName ? '' + weaponName : '' }})</span>
          </div>

          <!-- Enemy (Ice Dragon) -->
          <div v-for="(enemy, index) in activeEnemies" :key="`enemy-${index}`">
            <div class="character-info enemy-info" :style="enemyInfoStyle(index)">
              <span class="character-name">{{ enemy.name }}</span>
              <div class="resource-bar-container">
                <div class="hp-bar-label">Vida:</div>
                <div class="hp-bar enemy-hp-bar">
                  <div class="hp enemy-hp" :style="{ width: `${enemy.hpPercent}%` }"></div>
                </div>
                <span class="resource-value">{{ enemy.currentHp }}/{{ enemy.maxHp }}</span>
              </div>
            </div>
            <div
              class="unit enemy-character dragao-gelo"
              :class="{ 'is-attacking': enemyAttacking === index, 'is-damaged': damagedEnemy === index, fainted: enemy.hpPercent <= 0 }"
              :style="enemyStyle(index, enemy)"
            >
              <img :src="enemySprites[enemy.name]" alt="Enemy" class="character-sprite" />
            </div>
          </div>

          <!-- Damage Popup -->
          <div
            v-if="damagePopup.active"
            class="damage-popup"
            :class="damagePopup.type"
            :style="{ top: `${damagePopup.top}px`, left: `${damagePopup.left}px` }"
          >
            {{ damagePopup.prefix }}{{ damagePopup.value }}
          </div>

          <!-- Attack Effect -->
          <div v-if="attackEffect.active" class="attack-effect" :class="{ 'css-projectile': attackEffect.isCssProjectile }" :style="attackEffect.style">
            <img v-if="attackEffect.sprite" :src="attackEffect.sprite" alt="Attack Effect" class="effect-sprite" />
          </div>
          <div v-if="projectile.active" class="projectile-effect" :class="`projectile-effect--${projectile.kind}`" :style="projectile.style"></div>
        </div>

        <!-- Battle Log and Actions -->
        <div class="battle-log-container">
          <div class="battle-log">
            <p v-for="(message, index) in battleLog" :key="index" v-html="message"></p>
          </div>
          <div class="actions" v-if="isPlayerTurn && !isAttacking && !gameOver && !victory">
            <button class="action-btn attack-btn" @click="attackEnemy" :disabled="activeEnemies.length === 0 || gameState.player.stamina < 10">
              Atacar
            </button>
            <button class="action-btn potion-btn" @click="usePotion" :disabled="!canUsePotion || gameState.player.stamina < 5">
              Poção ({{ potionCount }})
            </button>
          </div>
          <div class="actions-placeholder" v-else>
            Dragão de Gelo prepara um ataque...
          </div>
        </div>
      </div>

      <!-- Feedback Box -->
      <div v-if="showFeedback && !showDialogue && !showCutscene" class="dialog-box feedback-box">
        <p>{{ feedbackMessage }}</p>
        <button @click="showFeedback = false">Ok</button>
        <button v-if="gameOver" @click="returnToMenu">Voltar ao Menu</button>
      </div>
    </div>

    <!-- Navigation Bar -->
    <div class="navigation-bar" v-if="!showDialogue && !showCutscene">
      <button
        v-if="bossDefeated"
        class="nav-btn"
        @click="goToNextArea"
        aria-label="Voltar Para Albadia"
        :disabled="!bossDefeated"
      >
        Voltar Para Albadia
      </button>
    </div>
  </div>
</template>

<script setup>
import attackEffectSpritePlayer from '@/assets/sprites/ataque-efeito.png';
import dragonIceSprite from '@/assets/sprites/dragao-gelo.png';
import montanhaBaseImage from '@/assets/backviews/montanha-base.png';
import montanhaImage from '@/assets/backviews/montanha-base.png';
import montanhaBattleDragonImage from '@/assets/backviews/montanha-confronto.png';
import montanhaCenarioImage from '@/assets/backviews/montanha-cenario.png';
import playerEmergingImage from '@/assets/backviews/player-emerging.png';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameState, ITEMS } from '@/stores/gameState.js';
import { playAudio } from '@/utils/audioManager.js';
import { createFrameGate } from '@/utils/fpsLoop';
import { usePlayerSprite } from '@/composables/usePlayerSprite';

const nextBattleFrame = createFrameGate();

const router = useRouter();
const gameState = useGameState();
const battleMusic = new Audio('/audio/musica-combate.mp3');
battleMusic.loop = true;
battleMusic.volume = 0.3;
battleMusic.preload = 'auto';
const suspenseMusic = new Audio('/audio/musica-sus.mp3');
suspenseMusic.loop = true;
suspenseMusic.volume = 0.5;
suspenseMusic.preload = 'auto';
const backgroundMusic = new Audio(new URL('/sounds/montanhafundo.mp3', import.meta.url).href);
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5;
backgroundMusic.preload = 'auto';

// Sprite Sheet for Player
const { spriteUrl: playerSprite } = usePlayerSprite();

// Animation Variables
const currentFrame = ref(0);
const frameTimer = ref(0);
const frameWidth = 96;
const frameHeight = 96;
const animations = {
  idle: { row: 2, frames: [0, 1, 2, 3, 4, 5, 6, 7], frameInterval: 150 },
  attack_right: {
    row: 14,
    frames: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
    frameInterval: 100
  }
};
const currentAnimation = computed(() => playerAttacking.value ? 'attack_right' : 'idle');
let animationFrameId = null;

// Dialogue State (at mountain base)
const showDialogue = ref(false);
const currentDialogueLine = ref(0);
const dialogueLines = [
  'A Montanha de Gelo se ergue diante de você, implacável e gelada.',
  'O vento corta como lâminas, e a neve cobre qualquer traço de vida.',
  'Escalar será um desafio, mas o topo guarda algo poderoso.',
];
const displayedDialogueLines = ref(dialogueLines.map(() => ''));

// Cutscene State (at summit)
const showCutscene = ref(false);
const currentCutsceneLine = ref(0);
const cutsceneLines = [
  'Você alcança o topo, exausto, o ar rarefeito queimando seus pulmões.',
  'Picos nevados se estendem até onde a vista alcança, cobertos por neve intocada.',
  'Um rugido ensurdecedor rasga o ar. O Dragão de Gelo desce, suas escamas brilhando.',
  'Seu destino é enfrentar a fera ou ser congelado por sua ira.',
];
const displayedLines = ref(cutsceneLines.map(() => ''));
const cutsceneBackgroundImage = ref(playerEmergingImage);
const isFading = ref(false);
const isDialoguePlaying = ref(false);
const isCutscenePlaying = ref(false);

// Cold Effect State
const showColdEffect = ref(false);

// Game State
const atMountainBase = ref(true);
const showFeedback = ref(false);
const feedbackMessage = ref('');
const bossDefeated = ref(false);
const inBattle = ref(false);

// Background Styles
const backgroundStyle = computed(() => {
  let backgroundImage;
  if (inBattle.value) {
    backgroundImage = montanhaCenarioImage;
  } else if (!atMountainBase.value && !bossDefeated.value) {
    backgroundImage = montanhaBattleDragonImage;
  } else {
    backgroundImage = montanhaImage;
  }
  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: isFading.value ? 0 : 1,
    transition: 'opacity 0.5s ease',
  };
});
const dialogueOrCutsceneBackgroundStyle = computed(() => ({
  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${
    showDialogue.value ? montanhaBaseImage : cutsceneBackgroundImage.value
  })`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: isFading.value ? 0 : 1,
  transition: 'opacity 0.5s ease',
}));

// HUD
const maxBarSegments = 10;
const filledHealthSegments = computed(() =>
  Math.round((gameState.player.health / gameState.player.maxHealth) * maxBarSegments)
);
const filledStaminaSegments = computed(() =>
  Math.round((gameState.player.stamina / gameState.player.maxStamina) * maxBarSegments)
);

// Player Character
const playerCharacter = reactive({
  top: 300,
  left: 50,
});

// Weapon Properties
const weaponName = computed(() => {
  const weaponId = gameState.player.equipment.weapon;
  return weaponId && ITEMS[weaponId] ? ITEMS[weaponId].name : 'Punhos';
});
const weaponSprite = computed(() => {
  const weaponId = gameState.player.equipment.weapon;
  return weaponId && ITEMS[weaponId]?.icon ? ITEMS[weaponId].icon : null;
});

// Enemy Configuration
const enemiesConfig = [
  {
    name: 'Dragão de Gelo',
    hpPercent: 100,
    currentHp: 200,
    maxHp: 200,
    top: 200,
    left: 'calc(100% - 200px)',
    attackPower: 20,
  },
];
const initialEnemyPositions = enemiesConfig.map(enemy => ({
  top: enemy.top,
  left: enemy.left,
}));
const enemies = reactive(enemiesConfig.map(enemy => ({ ...enemy })));
const enemySprites = {
  'Dragão de Gelo': dragonIceSprite,
};

// Battle State
const damagedEnemy = ref(null);
const damagedPlayer = ref(false);
const playerAttacking = ref(false);
const enemyAttacking = ref(null);
const isPlayerTurn = ref(true);
const isAttacking = ref(false);
const battleLog = ref(['Batalha contra o Dragão de Gelo!']);
const battleStatus = ref('Desfira seu golpe!');
const gameOver = ref(false);
const victory = ref(false);
const damagePopup = reactive({ active: false, value: 0, top: 0, left: 0, type: 'enemy-damage', prefix: '-' });
const attackEffect = reactive({ active: false, style: {}, sprite: null, isCssProjectile: false });
const projectile = reactive({ active: false, style: {}, kind: 'arrow' });

// Computed Properties
const potionCount = computed(() => gameState.getItemQuantity('potion_health'));
const canUsePotion = computed(() => potionCount.value > 0 && gameState.player.health < gameState.player.maxHealth);
const activeEnemies = computed(() => enemies.filter(enemy => enemy.hpPercent > 0));
const enemyInfoStyle = index => ({
  top: `${initialEnemyPositions[index].top - 90}px`,
  left: `calc(${initialEnemyPositions[index].left} - 120px)`,
});
const enemyStyle = (index, enemy) => ({
  top: `${(enemy.hpPercent > 0 ? enemy.top : initialEnemyPositions[index].top) + 100}px`,
  left: enemy.hpPercent > 0 ? enemy.left : initialEnemyPositions[index].left,
  transform: 'scale(3.5)',
  transformOrigin: 'center center',
});

// Animation Loop
const updateAnimation = (timestamp) => {
  animationFrameId = requestAnimationFrame(updateAnimation);
  if (!inBattle.value) return;
  if (nextBattleFrame(timestamp) === null) return;
  const now = timestamp;
  const anim = animations[currentAnimation.value];
  if (now - frameTimer.value > anim.frameInterval) {
    frameTimer.value = now;
    currentFrame.value++;
    if (currentFrame.value >= anim.frames.length) {
      currentFrame.value = 0;
      if (playerAttacking.value) {
        playerAttacking.value = false;
      }
    }
  }
};

// Utility Functions
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const addLogMessage = message => {
  battleLog.value.push(message);
  if (battleLog.value.length > 5) battleLog.value.shift();
  requestAnimationFrame(() => {
    const logContainer = document.querySelector('.battle-log');
    if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
  });
};

const showPopup = (value, targetElement, type = 'enemy-damage') => {
  const rect = targetElement.getBoundingClientRect();
  const containerRect = document.querySelector('.battle-arena').getBoundingClientRect();
  Object.assign(damagePopup, {
    active: true,
    value,
    top: rect.top - containerRect.top + rect.height / 2 - 20,
    left: rect.left - containerRect.left + rect.width / 2,
    type,
    prefix: type === 'hp-heal' ? '+' : '-',
  });
  setTimeout(() => Object.assign(damagePopup, { active: false }), 800);
};

const showProjectile = async (attackerElement, targetElement, kind = 'arrow') => {
  const startRect = attackerElement.getBoundingClientRect();
  const endRect = targetElement.getBoundingClientRect();
  const containerRect = document.querySelector('.battle-arena').getBoundingClientRect();
  Object.assign(projectile, {
    active: true,
    kind,
    style: {
      top: `${startRect.top - containerRect.top + startRect.height / 2}px`,
      left: `${startRect.left - containerRect.left + startRect.width / 2}px`,
      opacity: 1,
    },
  });
  await sleep(50);
  Object.assign(projectile.style, {
    top: `${endRect.top - containerRect.top + endRect.height / 2}px`,
    left: `${endRect.left - containerRect.left + endRect.width / 2}px`,
    opacity: 0,
    transition: 'top 0.5s ease-out, left 0.5s ease-out, opacity 0.5s ease-out',
  });
  await sleep(500);
  Object.assign(projectile, { active: false, style: {}, kind: 'arrow' });
};

const showAttackEffect = async (attackerElement, targetElement, isPlayer = true) => {
  const startRect = attackerElement.getBoundingClientRect();
  const endRect = targetElement.getBoundingClientRect();
  const containerRect = document.querySelector('.battle-arena').getBoundingClientRect();
  Object.assign(attackEffect, {
    active: true,
    style: {
      top: `${startRect.top - containerRect.top + startRect.height / 2}px`,
      left: `${startRect.left - containerRect.left + startRect.width / 2}px`,
      opacity: 1,
    },
    sprite: isPlayer ? attackEffectSpritePlayer : null,
    isCssProjectile: !isPlayer,
  });
  await sleep(50);
  Object.assign(attackEffect.style, {
    top: `${endRect.top - containerRect.top + endRect.height / 2}px`,
    left: `${endRect.left - containerRect.left + endRect.width / 2}px`,
    opacity: 0,
    transition: 'top 0.3s ease-out, left 0.3s ease-out, opacity 0.3s ease-out',
  });
  await sleep(300);
  Object.assign(attackEffect, { active: false, style: {}, sprite: null, isCssProjectile: false });
};

// Audio Management
const stopAllAudio = () => {
  [suspenseMusic, battleMusic, backgroundMusic].forEach(audio => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = ''; // Clear source to release resources
    }
  });
  playAudio('mountain_ambient', { stop: true });
};

// Dialogue Logic
const playDialogue = async () => {
  isDialoguePlaying.value = true;
  displayedDialogueLines.value = dialogueLines.map(() => '');
  for (let i = 0; i < dialogueLines.length && isDialoguePlaying.value; i++) {
    currentDialogueLine.value = i + 1;
    const text = dialogueLines[i];
    for (let j = 0; j <= text.length && isDialoguePlaying.value; j++) {
      await sleep(50);
      displayedDialogueLines.value[i] = text.slice(0, j);
      displayedDialogueLines.value = [...displayedDialogueLines.value];
      if (j > 0) playAudio('typewriter_click', { volume: 0.3 });
    }
    await sleep(1500);
  }
  isDialoguePlaying.value = false;
};

const advanceDialogue = (event) => {
  if (event.type === 'click' || (event.type === 'keydown' && ['Enter', 'Space'].includes(event.key))) {
    if (isDialoguePlaying.value) {
      const currentIndex = currentDialogueLine.value - 1;
      if (currentIndex < dialogueLines.length) {
        displayedDialogueLines.value[currentIndex] = dialogueLines[currentIndex];
        displayedDialogueLines.value = [...displayedDialogueLines.value];
      }
    }
  }
};

const endDialogue = async () => {
  isDialoguePlaying.value = false;  
  isFading.value = true;
  await sleep(500);
  showDialogue.value = false;
  isFading.value = false;
  gameState.player.hasViewedMontanhaDialogue = true;
  gameState.saveState();
  backgroundMusic.play().catch(err => console.error('Failed to play background music:', err));
};

// Cutscene Logic
const playCutscene = async () => {
  isCutscenePlaying.value = true;
  suspenseMusic.play().catch(err => console.error('Erro ao tocar musica-sus.mp3:', err));
  displayedLines.value = cutsceneLines.map(() => '');
  for (let i = 0; i < cutsceneLines.length && isCutscenePlaying.value; i++) {
    currentCutsceneLine.value = i + 1;
    const text = cutsceneLines[i];
    for (let j = 0; j <= text.length && isCutscenePlaying.value; j++) {
      await sleep(50);
      displayedLines.value[i] = text.slice(0, j);
      displayedLines.value = [...displayedLines.value];
      if (j > 0) playAudio('typewriter_click', { volume: 0.3 });
    }
    if (i === 2 && isCutscenePlaying.value) {
      playAudio('dragon_ice_roar', { volume: 0.3 });
      isFading.value = true;
      await sleep(500);
      cutsceneBackgroundImage.value = montanhaBattleDragonImage;
      isFading.value = false;
      await sleep(2000);
    } else {
      await sleep(1500);
    }
  }
  isCutscenePlaying.value = false;
};

const advanceCutscene = (event) => {
  if (event.type === 'click' || (event.type === 'keydown' && ['Enter', 'Space'].includes(event.key))) {
    if (isCutscenePlaying.value) {
      const currentIndex = currentCutsceneLine.value - 1;
      if (currentIndex < cutsceneLines.length) {
        displayedLines.value[currentIndex] = cutsceneLines[currentIndex];
        displayedLines.value = [...displayedLines.value];
      }
    }
  }
};

const endCutscene = async () => {
  isCutscenePlaying.value = false;
  isFading.value = true;
  await sleep(500);
  cutsceneBackgroundImage.value = montanhaImage;
  isFading.value = false;
  showCutscene.value = false;
  gameState.player.hasViewedMontanhaCutscene = true;
  gameState.saveState();
  backgroundMusic.play().catch(err => console.error('Failed to play background music:', err));
};

// Game Functions
const climbMountain = async () => {
  if (gameState.player.stamina < 20) {
    feedbackMessage.value = 'Você está exausto para escalar! Recupere energia.';
    showFeedback.value = true;
    playAudio('ui_error', { volume: 0.3 });
    return;
  }
  playAudio('ui_confirm', { volume: 0.3 });
  gameState.useStamina(20);
  gameState.takeDamage(5);
  feedbackMessage.value = 'Você escala a montanha, mas o frio intenso castiga seu corpo!';
  showFeedback.value = true;
  showColdEffect.value = true;
  playAudio('cold_shiver', { volume: 0.3 });
  isFading.value = true;
  await sleep(2000);
  showColdEffect.value = false;
  isFading.value = false;
  atMountainBase.value = false;
  showCutscene.value = true;
  playCutscene();
};

const confrontBoss = () => {
  inBattle.value = true;
  battleLog.value = [`${gameState.player.name || 'Herói'} enfrenta o Dragão de Gelo!`];
  battleMusic.play().catch(err => console.warn('Erro ao tocar música de batalha:', err));
  playAudio('battle_start_dragon_ice', { volume: 0.3 });
  feedbackMessage.value = 'O Dragão de Gelo surge rugindo da nevasca!';
  showFeedback.value = true;
  frameTimer.value = performance.now();
  animationFrameId = requestAnimationFrame(updateAnimation);
};

const collectKey = () => {
  if (bossDefeated.value && !gameState.player.keys.ice) {
    gameState.collectKey('ice');
    playAudio('collect_key_ice', { volume: 0.3 });
    feedbackMessage.value = 'Você obteve a Chave de Gelo!';
    showFeedback.value = true;
  } else {
    feedbackMessage.value = 'Não há chave aqui ou você já a pegou.';
    showFeedback.value = true;
  }
};

const fleeArea = async () => {
  playAudio('ui_back', { volume: 0.3 });
  stopAllAudio();
  await router.push({ name: 'Map' });
};

const attackEnemy = async () => {
  if (!activeEnemies.value.length || !isPlayerTurn.value || isAttacking.value || gameState.player.stamina < 10) {
    if (gameState.player.stamina < 10) {
      addLogMessage(`<span style="color: #ff6666;">⚡ Energia insuficiente!</span>`);
    }
    return;
  }
  isAttacking.value = true;
  playerAttacking.value = true;
  currentFrame.value = 0;
  frameTimer.value = performance.now();

  const attackResult = gameState.playerAttackAction();
  if (!attackResult.success) {
    addLogMessage(`<span style="color: #ff6666;">${attackResult.message}</span>`);
    playerAttacking.value = false;
    isAttacking.value = false;
    return;
  }

  const enemyIndex = 0;
  const enemy = enemies[enemyIndex];
  const playerElement = document.querySelector('.player-character');
  const enemyElement = document.querySelectorAll('.enemy-character')[0];
  battleStatus.value = `${gameState.player.name || 'Herói'} ataca!`;
  addLogMessage(`⚔️ ${attackResult.message}`);
  playAudio('attack', { volume: 0.3 });
  if (attackResult.attackType === 'ranged') {
    await showProjectile(playerElement, enemyElement, attackResult.projectileKind);
  } else {
    const originalLeft = playerCharacter.left;
    playerCharacter.left += 40;
    await sleep(200);
    await showAttackEffect(playerElement, enemyElement, true);
    playerCharacter.left = originalLeft;
  }
  damagedEnemy.value = enemyIndex;
  const damageDealt = attackResult.damage;
  enemy.currentHp = Math.max(0, enemy.currentHp - damageDealt);
  enemy.hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
  showPopup(damageDealt, enemyElement, 'enemy-damage');
  addLogMessage(`<span style="color: #d0a070;">💥 ${damageDealt} de dano!</span>`);
  await sleep(500);
  damagedEnemy.value = null;
  if (enemy.hpPercent <= 0) {
    addLogMessage(`<span style="color: #a09080;">☠️ Dragão de Gelo caiu!</span>`);
    victory.value = true;
    battleStatus.value = 'Triunfo!';
    handleVictory();
    isAttacking.value = false;
    return;
  }
  isPlayerTurn.value = false;
  await enemyTurn();
  if (!gameOver.value && !victory.value) {
    isPlayerTurn.value = true;
    battleStatus.value = 'Desfira seu golpe!';
    gameState.recoverStamina(20);
    if (gameState.player.stamina >= gameState.player.maxStamina) {
      addLogMessage(`<span style="color: #33cc33;">⚡ Energia totalmente restaurada!</span>`);
    } else {
      addLogMessage(`<span style="color: #33cc33;">⚡ +20 energia!</span>`);
    }
  }
  isAttacking.value = false;
};

const usePotion = async () => {
  if (!canUsePotion.value || !isPlayerTurn.value || isAttacking.value || gameState.player.stamina < 5) {
    if (gameState.player.stamina < 5) {
      addLogMessage(`<span style="color: #ff6666;">⚡ Energia insuficiente!</span>`);
    }
    return;
  }
  isAttacking.value = true;
  gameState.useStamina(10);
  addLogMessage(`<span style="color: #33cc33;">⚡ -10 energia</span>`);
  const playerElement = document.querySelector('.player-character');
  if (gameState.getItemQuantity('potion_health') > 0) {
    gameState.useItem('potion_health');
    const healAmount = ITEMS['potion_health'].effect.heal;
    showPopup(healAmount, playerElement, 'hp-heal');
    addLogMessage(`<span style="color: #90c090;">🧪 +${healAmount} vida!</span>`);
    playAudio('potion', { volume: 0.3 });
  } else {
    addLogMessage(`<span style="color: #ff6666;">🧪 Sem poções!</span>`);
  }
  await sleep(1000);
  isPlayerTurn.value = false;
  battleStatus.value = 'Dragão de Gelo prepara um ataque!';
  await sleep(1000);
  await enemyTurn();
  if (!gameOver.value && !victory.value) {
    isPlayerTurn.value = true;
    battleStatus.value = 'Desfira seu golpe!';
    gameState.recoverStamina(20);
    if (gameState.player.stamina >= gameState.player.maxStamina) {
      addLogMessage(`<span style="color: #33cc33;">⚡ Energia totalmente restaurada!</span>`);
    } else {
      addLogMessage(`<span style="color: #33cc33;">⚡ +5 energia!</span>`);
    }
  }
  isAttacking.value = false;
};

const enemyTurn = async () => {
  if (!activeEnemies.value.length || gameState.player.health <= 0) return;
  const enemy = enemies[0];
  const playerElement = document.querySelector('.player-character');
  const enemyElement = document.querySelectorAll('.enemy-character')[0];
  addLogMessage(`<b>🐉 Dragão de Gelo</b> ataca!`);
  playAudio('hit', { volume: 0.3 });
  await sleep(800);
  enemyAttacking.value = 0;
  const damageTaken = enemy.attackPower + Math.floor(Math.random() * 6 + 5);
  gameState.takeDamage(damageTaken);
  showPopup(damageTaken, playerElement, 'player-damage');
  addLogMessage(`<span style="color: #c06060;">💥 ${gameState.player.name || 'Herói'} sofre ${damageTaken} de dano!</span>`);
  await showAttackEffect(enemyElement, playerElement, false);
  await sleep(500);
  enemyAttacking.value = null;
  damagedPlayer.value = true;
  await sleep(300);
  damagedPlayer.value = false;
  if (gameState.player.health <= 0) {
    addLogMessage(`<b>💀 ${gameState.player.name || 'Herói'} foi derrotado!</b>`);
    handleDefeat();
    return;
  }
};

const handleVictory = () => {
  bossDefeated.value = true;
  gameState.completeLevel('montanha_boss');
  inBattle.value = false;
  gameState.addGold(100);
  gameState.addItemToInventory('ice_shard', 1);
  addLogMessage(`<span style="color: #d0a070;">💰 +100 ouro!</span>`);
  addLogMessage(`<span style="color: #d0a070;">🎁 Fragmento de Gelo!</span>`);
  playAudio('boss_defeat', { volume: 0.3 });
  feedbackMessage.value = 'Dragão de Gelo derrotado!';
  showFeedback.value = true;
  stopAllAudio();
  backgroundMusic.play().catch(err => console.error('Failed to play background music:', err));
};

const handleDefeat = async () => {
  playAudio('player_defeat', { volume: 0.3 });
  gameState.handleDeath();
  if (gameState.player.lives > 0) {
    feedbackMessage.value = `Você foi derrotado! Vidas restantes: ${gameState.player.lives}`;
    showFeedback.value = true;
    enemies.forEach((enemy, index) => {
      enemy.currentHp = enemiesConfig[index].maxHp;
      enemy.hpPercent = 100;
    });
    inBattle.value = true;
    isPlayerTurn.value = true;
    gameOver.value = false;
    battleStatus.value = 'Desfira seu golpe!';
    battleLog.value = [`${gameState.player.name || 'Herói'} retorna para enfrentar o Dragão de Gelo!`];
    stopAllAudio();
    battleMusic.play().catch(err => console.warn('Erro ao tocar música de batalha:', err));
  } else {
    gameOver.value = true;
    stopAllAudio();
    await router.push('/GameOver');
  }
};

const returnToMenu = async () => {
  playAudio('ui_confirm', { volume: 0.3 });
  stopAllAudio();
  await router.push('/');
};

const goToNextArea = async () => {
  if (!bossDefeated.value) return;
  playAudio('ui_confirm', { volume: 0.3 });
  stopAllAudio();
  await router.push('/level/albadia');
};

// Lifecycle Hooks
onMounted(() => {
  gameState.setCurrentArea('Montanha Congelada');
  if (!gameState.player.keys) {
    gameState.player.keys = reactive({ ancestral: false, ice: false, fire: false });
  }
  if (!gameState.player.lives) {
    gameState.player.lives = 3;
  }
  if (!gameState.player.hasViewedMontanhaCutscene) {
    gameState.player.hasViewedMontanhaCutscene = false;
  }
  if (!gameState.player.hasViewedMontanhaDialogue) {
    gameState.player.hasViewedMontanhaDialogue = false;
  }
  if (!gameState.levelsCompleted) {
    gameState.levelsCompleted = reactive([]);
  }
  bossDefeated.value = gameState.levelsCompleted.includes('montanha_boss');
  if (!bossDefeated.value && atMountainBase.value && !gameState.player.hasViewedMontanhaDialogue) {
    showDialogue.value = true;
    playDialogue();
  } else if (!bossDefeated.value && !atMountainBase.value && !gameState.player.hasViewedMontanhaCutscene) {
    showCutscene.value = true;
    playCutscene();
  } else {
    showDialogue.value = false;
    showCutscene.value = false;
    backgroundMusic.play().catch(err => console.error('Failed to play background music:', err));
  }
});

onUnmounted(() => {
  stopAllAudio();
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    backgroundMusic.src = '';
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=UnifrakturMaguntia&display=swap');

.montanha-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow-y: hidden;
  background-color: #e0ffff;
}

/* Cold Overlay */
.cold-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(70, 130, 180, 0.3);
  animation: coldPulse 2s ease-in-out;
  pointer-events: none;
  z-index: 8;
}

@keyframes coldPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

/* Dialogue Style */
.dialogue-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 100;
  outline: none;
  cursor: pointer;
}

.dialogue-content {
  position: relative;
  background: rgba(40, 60, 80, 0.95);
  border: 4px solid #4682b4;
  padding: 15px;
  max-width: 600px;
  max-height: 60vh;
  margin-bottom: 10px;
  text-align: left;
  color: #e0f0ff;
  font-family: 'MedievalSharp', cursive;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
}

.dialogue-line {
  line-height: 1.6;
  margin-bottom: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dialogue-line.visible {
  opacity: 1;
}

.typewriter {
  display: inline-block;
  white-space: pre-wrap;
  color: #e0f0ff;
}

.dialogue-arrow {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(to bottom, #4682b4, #2f4f4f);
  border: 2px solid #2f4f4f;
  color: #e0f0ff;
  font-size: 24px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  margin: 10px auto 0;
}

.dialogue-arrow:hover {
  background: linear-gradient(to bottom, #5f9ea0, #3f5f6f);
}

.dialogue-arrow:active {
  transform: translate(1px, 1px);
}

/* Cutscene Style */
.cutscene-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 100;
  outline: none;
  cursor: pointer;
}

.cutscene-content {
  position: relative;
  background: rgba(40, 60, 80, 0.95);
  border: 4px solid #4682b4;
  padding: 15px;
  max-width: 600px;
  max-height: 60vh;
  margin-bottom: 10px;
  text-align: left;
  color: #e0f0ff;
  font-family: 'MedievalSharp', cursive;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
}

.cutscene-line {
  line-height: 1.6;
  margin-bottom: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cutscene-line.visible {
  opacity: 1;
}

.cutscene-arrow {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(to bottom, #4682b4, #2f4f4f);
  border: 2px solid #2f4f4f;
  color: #e0f0ff;
  font-size: 24px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  margin: 10px auto 0;
}

.cutscene-arrow:hover {
  background: linear-gradient(to bottom, #5f9ea0, #3f5f6f);
}

.cutscene-arrow:active {
  transform: translate(1px, 1px);
}

/* HUD Styles */
.main-hud {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 90;
  font-size: 14px;
}

.panel-frame {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-container {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.lives-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #e0f0ff;
  font-family: 'MedievalSharp', cursive;
  text-shadow: 1px 1px 2px #000;
  font-weight: bold;
}

.bar-container {
  position: relative;
  width: 200px;
  height: 24px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #2f4f4f;
  border-radius: 4px;
  overflow: hidden;
}

.bar-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #e0f0ff;
  text-shadow: 1px 1px 0 #000;
  font-family: 'MedievalSharp', cursive;
}

.bar-container.segmented {
  display: flex;
  gap: 2px;
  padding: 2px;
}

.segment {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #2f4f4f;
}

.vida .segment.filled {
  background: linear-gradient(to bottom, #ff3333, #6a0f0f);
}

.energia .segment.filled {
  background: linear-gradient(to bottom, #33cc33, #0ff);
}

/* Content Area */
.content-area {
  flex-grow: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 60px);
  box-sizing: border-box;
}

.interactions, .feedback-box {
  background: linear-gradient(
    165deg,
    var(--game-parchment) 0%,
    var(--game-parchment-mid) 50%,
    var(--game-parchment-dark) 100%
  );
  padding: 15px;
  border: 3px solid var(--game-border-gold);
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  color: var(--game-parchment-ink);
  font-family: var(--game-ui-font);
  box-shadow: var(--game-shadow-modal);
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.35);
}

.interactions {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
}

.interaction-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feedback-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}

.feedback-box p {
  margin-bottom: 10px;
  font-size: 16px;
}

.feedback-box button, .interactions button, .action-btn, .nav-btn {
  background: linear-gradient(to bottom, var(--game-honey), var(--game-honey-shadow));
  border: 3px solid var(--game-wood-dark);
  color: var(--game-wood-dark);
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--game-ui-font);
  font-weight: bold;
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.35);
  box-shadow: inset -4px -4px var(--game-honey-shadow),
    inset 4px 4px var(--game-honey-light), var(--game-shadow-out);
  transition: filter 0.2s, transform 0.1s;
}

.feedback-box button:hover:not(:disabled), .interactions button:hover:not(:disabled), .action-btn:hover:not(:disabled), .nav-btn:hover:not(:disabled) {
  filter: brightness(1.2);
}

.feedback-box button:active:not(:disabled), .interactions button:active:not(:disabled), .action-btn:active:not(:disabled), .nav-btn:active:not(:disabled) {
  transform: scale(0.97);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
}

.potion-btn {
  background: linear-gradient(to bottom, var(--game-honey-shadow), var(--game-border-warm));
  color: var(--game-cream);
  border-color: var(--game-wood-dark);
}

/* Navigation Bar */
.navigation-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(
    180deg,
    var(--game-bg-panel) 0%,
    var(--game-bg-deep) 100%
  );
  border-top: 4px solid var(--game-border-gold);
  padding: 5px 10px;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 10;
  height: 50px;
  box-sizing: border-box;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Battle Styles */
.medieval-battle-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100vh - 50px);
}

.battle-arena {
  position: relative;
  width: 100%;
  height: calc(80vh - 40px);
  overflow: hidden;
}

.game-status-top {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: #e0f0ff;
  background: rgba(40, 60, 80, 0.9);
  padding: 8px 16px;
  border-radius: 5px;
  z-index: 20;
  border: 2px solid #4682b4;
  font-family: 'MedievalSharp', cursive;
}

.victory-message, .game-over-message {
  font-size: 16px;
  animation: pulseGlow 1.5s infinite;
}

.victory-message { color: #b0c4de; }
.game-over-message { color: #a04040; }

@keyframes pulseGlow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}

.unit {
  position: absolute;
  width: 96px;
  height: 96px;
  transition: top 0.3s ease, left 0.3s ease;
}

.player-character {
  z-index: 10;
  transform: scale(4);
  transform-origin: center center;
  image-rendering: pixelated;
  margin-top: 15%;
}

.player-character.is-damaged {
  animation: damageBrighten 1s linear forwards;
}

@keyframes damageBrighten {
  0% { filter: brightness(1); }
  30% { filter: brightness(1.2); }
  50% { filter: brightness(1.5); }
  90% { filter: brightness(1.2); }
  100% { filter: brightness(1); }
}

.player-character.is-attacking {
  scale: 1.04;
}

.weapon-sprite {
  position: absolute;
  width: 30px;
  height: 30px;
  top: 50%;
  left: 80%;
  transform: translate(-50%, -50%);
  object-fit: contain;
  image-rendering: pixelated;
}

.enemy-character {
  z-index: 9;
}

.enemy-character.fainted {
  filter: grayscale(100%) opacity(40%);
}

.enemy-character.dragao-gelo {
  transform: scale(3.5);
  transform-origin: center center;
}

.enemy-character.dragao-gelo.is-attacking {
  animation: dragonShake 0.4s ease-in-out;
  transform: scale(4.5);
}

.character-sprite {
  width: 150%;
  height: 190%;
  object-fit: contain;
  image-rendering: pixelated;
  scale: 1.4;
  margin-left: -100%;
}

.character-info {
  position: absolute;
  background: rgba(40, 60, 80, 0.9);
  border: 2px solid #4682b4;
  border-radius: 8px;
  padding: 8px;
  color: #e0f0ff;
  font-size: 12px;
  min-width: 180px;
}

.player-info {
  bottom: 60px;
  left: 20px;
  z-index: 5;
}

.enemy-info {
  text-align: center;
}

.character-name {
  font-weight: bold;
  font-size: 14px;
  color: #b0c4de;
  margin-bottom: 6px;
  display: block;
}

.resource-bar-container {
  display: flex;
  align-items: center;
  height: 16px;
}

.hp-bar-label {
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
  width: 40px;
}

.hp-bar {
  flex-grow: 1;
  height: 12px;
  border: 2px solid #2f4f4f;
  border-radius: 5px;
  background: #1e2a38;
  overflow: hidden;
}

.hp {
  height: 100%;
  background: linear-gradient(to right, #4682b4, #87ceeb);
  transition: width 0.5s ease;
}

.resource-value {
  font-size: 12px;
  margin-left: 8px;
  font-weight: bold;
}

.battle-log-container {
  width: 100%;
  height: 20vh;
  background: rgba(40, 60, 80, 0.95);
  border-top: 4px solid #2f4f4f;
  display: flex;
  justify-content: space-between;
  padding: 5px;
  box-sizing: border-box;
}

.battle-log {
  width: 60%;
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px;
  border: 2px solid #4682b4;
  border-radius: 5px;
  color: #b0c4de;
}

.battle-log p {
  margin: 0 0 4px 0;
}

.battle-log::-webkit-scrollbar {
  width: 6px;
}

.battle-log::-webkit-scrollbar-track {
  background: #1e2a38;
  border-radius: 5px;
}

.battle-log::-webkit-scrollbar-thumb {
  background: #4682b4;
  border-radius: 5px;
}

.actions, .actions-placeholder {
  width: 40%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.actions-placeholder {
  color: #b0c4de;
  font-size: 12px;
  font-style: italic;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes dragonShake {
  0%, 100% { transform: scale(3.5) translateX(0); }
  25% { transform: scale(4) translateX(-15px); }
  75% { transform: scale(4) translateX(15px); }
}

@keyframes attackShake {
  0%, 100% { transform: scale(4) translateX(0); }
  25% { transform: scale(4) translateX(-5px); }
  75% { transform: scale(4) translateX(5px); }
}

.damage-popup {
  position: absolute;
  font-size: 16px;
  font-weight: bold;
  animation: floatUp 0.8s ease-out forwards;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 25;
  text-shadow: 1px 1px 3px black;
}

.damage-popup.player-damage { color: #c06060; }
.damage-popup.enemy-damage { color: #d0a070; }
.damage-popup.hp-heal { color: #90c090; }

@keyframes floatUp {
  0% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -50px); }
}

.attack-effect {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}

.effect-sprite {
  width: 50px;
  height: 50px;
  object-fit: contain;
  image-rendering: pixelated;
}

.css-projectile {
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, #87ceeb 40%, #4682b4 70%, transparent 80%);
  border-radius: 50%;
  box-shadow: 0 0 10px #87ceeb, 0 0 20px #4682b4;
  animation: projectileGlow 0.3s ease-out;
}

.projectile-effect {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  animation: pulseProjectile 0.5s infinite alternate;
}

.projectile-effect--arrow {
  background: radial-gradient(circle, #d8c08a 30%, #8b6914 70%, transparent 85%);
  box-shadow: 0 0 12px #c9a227;
}

.projectile-effect--arcane {
  background: radial-gradient(circle, #d8ccff 30%, #6b5ce7 65%, transparent 85%);
  box-shadow: 0 0 14px #8f7cff, 0 0 24px #6b5ce7;
}

@keyframes pulseProjectile {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes projectileGlow {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
</style>