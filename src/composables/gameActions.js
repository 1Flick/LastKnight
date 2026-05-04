import { useGameState } from '@/stores/gameState';

export function useGameActions() {
  const gameState = useGameState();
  return {
    damagePlayer: gameState.damagePlayer,
    damageBoss: gameState.damageBoss,
    useStamina: gameState.useStamina,
    restoreStamina: gameState.restoreStamina,
    drainBossStamina: gameState.drainBossStamina,
    restoreBossStamina: gameState.restoreBossStamina,
    markFinalBossDefeated: gameState.markFinalBossDefeated
  };
}