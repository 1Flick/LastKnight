export const CLASS_ORDER = ['Guerreiro', 'Mago', 'Arqueiro', 'Ladino'];

export const CLASSES = {
  Guerreiro: {
    id: 'Guerreiro',
    name: 'Guerreiro',
    description: 'Combatente equilibrado, focado em dano corpo a corpo e resistência.',
    baseStats: { attack: 12, defense: 10, speed: 7, maxHealth: 110, maxStamina: 90 },
    chartStats: { attack: 9, defense: 9, speed: 5, maxHealth: 10, maxStamina: 7 },
    startItems: { weapon: 'sword_wood' },
    sprite: '/img/sprites/player/player_sprite.png',
    preview: '/img/sprites/player/previews/player_guerreiro.png',
    accent: '#c9a227',
  },
  Mago: {
    id: 'Mago',
    name: 'Mago',
    description: 'Conjurador frágil, mas devastador em ataques arcanos.',
    baseStats: { attack: 14, defense: 5, speed: 8, maxHealth: 80, maxStamina: 120 },
    chartStats: { attack: 10, defense: 4, speed: 6, maxHealth: 6, maxStamina: 10 },
    startItems: { weapon: 'staff_old' },
    sprite: '/img/sprites/player/player_mago.png',
    preview: '/img/sprites/player/previews/player_mago.png',
    accent: '#6b5ce7',
  },
  Arqueiro: {
    id: 'Arqueiro',
    name: 'Arqueiro',
    description: 'Atirador ágil que domina o campo de batalha à distância.',
    baseStats: { attack: 11, defense: 6, speed: 13, maxHealth: 90, maxStamina: 100 },
    chartStats: { attack: 7, defense: 5, speed: 10, maxHealth: 7, maxStamina: 8 },
    startItems: { weapon: 'bow_improvised' },
    sprite: '/img/sprites/player/player_arqueiro.png',
    preview: '/img/sprites/player/previews/player_arqueiro.png',
    accent: '#4a8f3a',
  },
  Ladino: {
    id: 'Ladino',
    name: 'Ladino',
    description: 'Assassino furtivo com golpes rápidos e esquiva letal.',
    baseStats: { attack: 13, defense: 5, speed: 14, maxHealth: 85, maxStamina: 105 },
    chartStats: { attack: 8, defense: 4, speed: 9, maxHealth: 6, maxStamina: 9 },
    startItems: { weapon: 'dagger_iron' },
    sprite: '/img/sprites/player/player_ladino.png',
    preview: '/img/sprites/player/previews/player_ladino.png',
    accent: '#8b3a3a',
  },
};

export const CHART_LABELS = {
  attack: 'Ataque',
  defense: 'Defesa',
  speed: 'Velocidade',
  maxHealth: 'Vida',
  maxStamina: 'Stamina',
};

export function normalizeClassName(className) {
  if (!className) return 'Guerreiro';
  const normalized = String(className).trim().toLowerCase();
  const match = CLASS_ORDER.find((key) => key.toLowerCase() === normalized);
  return match || 'Guerreiro';
}

export function getClassData(className) {
  return CLASSES[normalizeClassName(className)] || CLASSES.Guerreiro;
}

export function getPlayerSpriteUrl(className) {
  return getClassData(className).sprite;
}
