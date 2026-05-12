import { computed } from 'vue';
import { useGameState } from '@/stores/gameState.js';
import { getPlayerSpriteUrl } from '@/data/classes.js';

export function usePlayerSprite() {
  const gameState = useGameState();
  const spriteUrl = computed(() => getPlayerSpriteUrl(gameState.player.classe));
  return { spriteUrl };
}
