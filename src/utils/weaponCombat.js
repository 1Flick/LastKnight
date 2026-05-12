import { ITEMS } from '@/stores/gameState.js';

export function getEquippedWeapon(gameState) {
  const weaponId = gameState.player.equipment?.weapon;
  return weaponId ? ITEMS[weaponId] : null;
}

export function isRangedWeapon(weapon) {
  return weapon?.attackType === 'ranged';
}

export function getProjectileKind(weapon) {
  if (!weapon) return 'arrow';
  if (weapon.projectileKind) return weapon.projectileKind;
  if (weapon.id?.includes('staff') || weapon.id?.includes('cajado')) return 'arcane';
  return 'arrow';
}
