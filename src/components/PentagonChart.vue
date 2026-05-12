<template>
  <svg
    class="pentagon-chart"
    :viewBox="`0 0 ${size} ${size}`"
  >
    <polygon
      v-for="(grid, index) in gridPolygons"
      :key="`grid-${index}`"
      :points="grid"
      class="pentagon-chart__grid"
    />
    <line
      v-for="(axis, index) in axisLines"
      :key="`axis-${index}`"
      :x1="center"
      :y1="center"
      :x2="axis.x"
      :y2="axis.y"
      class="pentagon-chart__axis"
    />
    <polygon
      :points="valuePolygon"
      class="pentagon-chart__fill"
      :style="{ fill: accent }"
    />
    <polyline
      :points="valuePolygon"
      class="pentagon-chart__stroke"
      :style="{ stroke: accent }"
    />
    <circle
      v-for="(point, index) in valuePoints"
      :key="`point-${index}`"
      :cx="point.x"
      :cy="point.y"
      r="3.5"
      class="pentagon-chart__point"
      :style="{ fill: accent }"
    />
    <text
      v-for="(label, index) in labels"
      :key="`label-${index}`"
      :x="label.x"
      :y="label.y"
      text-anchor="middle"
      dominant-baseline="middle"
      class="pentagon-chart__label"
    >
      {{ label.text }}
    </text>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
  labels: {
    type: Object,
    default: () => ({
      attack: 'Ataque',
      defense: 'Defesa',
      speed: 'Velocidade',
      maxHealth: 'Vida',
      maxStamina: 'Stamina',
    }),
  },
  accent: {
    type: String,
    default: '#c9a227',
  },
  size: {
    type: Number,
    default: 220,
  },
  maxValue: {
    type: Number,
    default: 10,
  },
});

const statKeys = ['attack', 'defense', 'speed', 'maxHealth', 'maxStamina'];
const center = computed(() => props.size / 2);
const radius = computed(() => props.size * 0.34);

function polarPoint(angle, distance) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: center.value + Math.cos(rad) * distance,
    y: center.value + Math.sin(rad) * distance,
  };
}

function polygonForScale(scale) {
  return statKeys
    .map((_, index) => {
      const angle = -90 + index * 72;
      const point = polarPoint(angle, radius.value * scale);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

const gridPolygons = computed(() => [0.25, 0.5, 0.75, 1].map((scale) => polygonForScale(scale)));

const axisLines = computed(() =>
  statKeys.map((_, index) => polarPoint(-90 + index * 72, radius.value)),
);

const valuePoints = computed(() =>
  statKeys.map((key, index) => {
    const value = Math.max(0, Math.min(props.maxValue, Number(props.stats[key] || 0)));
    const scale = value / props.maxValue;
    return polarPoint(-90 + index * 72, radius.value * scale);
  }),
);

const valuePolygon = computed(() =>
  valuePoints.value.map((point) => `${point.x},${point.y}`).join(' '),
);

const labels = computed(() =>
  statKeys.map((key, index) => {
    const point = polarPoint(-90 + index * 72, radius.value + 24);
    return {
      x: point.x,
      y: point.y,
      text: props.labels[key] || key,
    };
  }),
);
</script>

<style scoped>
.pentagon-chart {
  width: 100%;
  max-width: 240px;
  height: auto;
  display: block;
  margin: 0 auto;
}

.pentagon-chart__grid {
  fill: none;
  stroke: rgba(201, 162, 39, 0.22);
  stroke-width: 1;
}

.pentagon-chart__axis {
  stroke: rgba(232, 212, 180, 0.28);
  stroke-width: 1;
}

.pentagon-chart__fill {
  fill-opacity: 0.28;
}

.pentagon-chart__stroke {
  fill: none;
  stroke-width: 2.5;
}

.pentagon-chart__point {
  stroke: rgba(26, 15, 7, 0.85);
  stroke-width: 1;
}

.pentagon-chart__label {
  font-family: var(--game-ui-font);
  font-size: 11px;
  font-weight: 700;
  fill: #f5e6c8;
  paint-order: stroke;
  stroke: rgba(26, 15, 7, 0.9);
  stroke-width: 3px;
}
</style>
