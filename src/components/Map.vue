<template>
  <div class="map-screen">

    <!-- FUNDO BORRADO -->
    <div class="map-background-blur"></div>

    <!-- MAPA AO FUNDO -->
    <div class="map-background"></div>

    <!-- LUZES -->
    <div class="ambient-light ambient-light-1"></div>
    <div class="ambient-light ambient-light-2"></div>

    <!-- FOG -->
    <div class="fog-layer fog-1"></div>
    <div class="fog-layer fog-2"></div>

    <!-- VINHETA -->
    <div class="map-vignette"></div>

    <!-- EMBERS -->
    <div class="embers">
      <span
        v-for="i in 80"
        :key="'ember-' + i"
        class="ember"
      />
    </div>

    <!-- BOTÃO -->
    <button
      class="back-button"
      @click="goBack"
    >
      ⟵ Retornar
    </button>

    <!-- WRAPPER -->
    <div
      class="map-wrapper"
      @wheel.prevent="handleZoom"
      @mousedown="startDrag"
    >

      <!-- MAPA -->
      <div
        class="map-container"
        ref="mapContainer"
      >

        <!-- IMAGEM -->
        <img
          src="@/assets/Mapa.png"
          class="map-image"
          draggable="false"
        />

        <!-- ÁREAS -->
        <div
          v-for="(area, i) in areas"
          :key="i"
          class="map-area"
          :style="{
            top: area.top,
            left: area.left,
            width: area.width,
            height: area.height
          }"
          @click.stop="handleClick(area)"
        >

          <div class="area-glow"></div>

          <div class="area-name">
            {{ area.name }}
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onUnmounted
} from 'vue';

import { useRouter } from 'vue-router';

const router = useRouter();

const mapContainer = ref(null);

/* 🔥 COMEÇA COM ZOOM */
const scale = ref(1.8);

const position = ref({
  x: 0,
  y: 0
});

const velocity = ref({
  x: 0,
  y: 0
});

const isDragging = ref(false);
const hasMoved = ref(false);

let rect;

let last = {
  x: 0,
  y: 0
};

/* ================= ÁREAS ================= */

const areas = ref([
  {
    name: 'Albadia',
    top: '49%',
    left: '38%',
    width: '10%',
    height: '10%',
    route: '/level/albadia'
  },
  {
    name: 'Floresta Sombria',
    top: '25%',
    left: '36%',
    width: '12%',
    height: '14%',
    route: '/level/floresta'
  },
  {
    name: 'Rio Azul',
    top: '54%',
    left: '48%',
    width: '10%',
    height: '10%',
    route: '/level/rio'
  },
  {
    name: 'Ruínas Antigas',
    top: '60%',
    left: '63%',
    width: '16%',
    height: '18%',
    route: '/level/ruinas'
  },
  {
    name: 'Montanha Glacial',
    top: '18%',
    left: '57%',
    width: '16%',
    height: '20%',
    route: '/level/montanha'
  },
  {
    name: 'Castelo de Magnus',
    top: '3%',
    left: '76%',
    width: '18%',
    height: '18%',
    route: '/level/castelo'
  }
]);

/* ================= INIT ================= */

onMounted(() => {

  rect =
    mapContainer.value.getBoundingClientRect();

  window.addEventListener(
    'mousemove',
    onDrag
  );

  window.addEventListener(
    'mouseup',
    stopDrag
  );

  window.addEventListener(
    'resize',
    updateRect
  );

  setTimeout(() => {

    const currentRoute =
      router.currentRoute.value.path;

    const currentArea =
      areas.value.find(a =>
        currentRoute.includes(a.route)
      );

    if (currentArea) {
      focusArea(currentArea);
    }

  }, 100);

  animate();
});

onUnmounted(() => {

  window.removeEventListener(
    'mousemove',
    onDrag
  );

  window.removeEventListener(
    'mouseup',
    stopDrag
  );

  window.removeEventListener(
    'resize',
    updateRect
  );

});

const updateRect = () => {
  rect =
    mapContainer.value.getBoundingClientRect();
};

/* ================= ZOOM ================= */

const handleZoom = (e) => {

  const zoomIntensity = 0.0025;

  let next =
    scale.value +
    (-e.deltaY * zoomIntensity);

  scale.value =
    Math.max(1, Math.min(5, next));
};

/* ================= DRAG ================= */

const startDrag = (e) => {

  isDragging.value = true;

  hasMoved.value = false;

  velocity.value = {
    x: 0,
    y: 0
  };

  last = {
    x: e.clientX,
    y: e.clientY
  };
};

const onDrag = (e) => {

  if (!isDragging.value) return;

  const dx =
    e.clientX - last.x;

  const dy =
    e.clientY - last.y;

  if (
    Math.abs(dx) > 2 ||
    Math.abs(dy) > 2
  ) {
    hasMoved.value = true;
  }

  position.value.x += dx;
  position.value.y += dy;

  velocity.value.x = dx;
  velocity.value.y = dy;

  last = {
    x: e.clientX,
    y: e.clientY
  };
};

const stopDrag = () => {
  isDragging.value = false;
};

/* ================= LIMITES ================= */

const applyBounds = () => {

  const limitX =
    ((rect.width * scale.value) - rect.width) / 2 + 250;

  const limitY =
    ((rect.height * scale.value) - rect.height) / 2 + 250;

  position.value.x =
    Math.max(-limitX, Math.min(limitX, position.value.x));

  position.value.y =
    Math.max(-limitY, Math.min(limitY, position.value.y));
};

/* ================= FOCO ================= */

const focusArea = (area) => {

  const cx =
    parseFloat(area.left) +
    parseFloat(area.width) / 2;

  const cy =
    parseFloat(area.top) +
    parseFloat(area.height) / 2;

  const px =
    (cx / 100) * rect.width;

  const py =
    (cy / 100) * rect.height;

  position.value.x =
    rect.width / 2 - px;

  position.value.y =
    rect.height / 2 - py;
};

/* ================= LOOP ================= */

const animate = () => {

  requestAnimationFrame(animate);

  if (!isDragging.value) {

    position.value.x += velocity.value.x;
    position.value.y += velocity.value.y;

    velocity.value.x *= 0.90;
    velocity.value.y *= 0.90;
  }

  applyBounds();

  mapContainer.value.style.transform =
    `
      translate3d(
        ${position.value.x}px,
        ${position.value.y}px,
        0
      )
      scale(${scale.value})
    `;
};

/* ================= CLICK ================= */

const handleClick = (area) => {

  if (hasMoved.value) return;

  focusArea(area);

  setTimeout(() => {
    router.push(area.route);
  }, 250);
};

/* ================= BACK ================= */

const goBack = () => {
  router.back();
};
</script>

<style scoped>

/* 🔥 CURSOR MEDIEVAL */

* {
  cursor:
    url('/cursor/sword_cursor.png') 4 4,
    auto;
}

/* agarrando */

.map-wrapper:active {
  cursor:
    url('/cursor/grab_cursor.png') 16 16,
    grabbing;
}

/* ================= BASE ================= */

.map-screen {
  width: 100vw;
  height: 100vh;

  overflow: hidden;

  position: relative;

  background:
    radial-gradient(circle at center, #3a2717 0%, #120b05 100%);

  font-family: 'Cinzel', serif;
}

/* ================= FUNDO BORRADO ================= */

.map-background-blur {
  position: absolute;
  inset: -5%;

  background-image:
    url('@/assets/Mapa.png');

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  filter:
    blur(30px)
    brightness(0.38)
    saturate(1.15);

  transform: scale(1.15);

  z-index: -2;
}

/* ================= MAPA FUNDO ================= */

.map-background {
  position: absolute;
  inset: 0;

  background-image:
    url('@/assets/Mapa.png');

  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;

  filter:
    brightness(0.70)
    saturate(1.08)
    contrast(1.02);

  opacity: 1;

  z-index: -1;
}

/* ================= LUZES ================= */

.ambient-light {
  position: absolute;

  border-radius: 50%;

  filter: blur(120px);

  mix-blend-mode: screen;

  pointer-events: none;

  animation:
    ambientFloat 14s ease-in-out infinite alternate;

  z-index: 0;
}

.ambient-light-1 {
  width: 700px;
  height: 700px;

  left: -200px;
  top: -100px;

  background:
    rgba(255,180,80,0.10);
}

.ambient-light-2 {
  width: 600px;
  height: 600px;

  right: -120px;
  bottom: -150px;

  background:
    rgba(255,220,140,0.08);

  animation-duration: 18s;
}

/* ================= FOG ================= */

.fog-layer {
  position: absolute;
  inset: -20%;

  pointer-events: none;

  filter: blur(70px);

  opacity: 0.22;

  z-index: 1;
}

.fog-1 {
  background:
    radial-gradient(
      circle at 20% 40%,
      rgba(255,255,255,0.12),
      transparent 45%
    ),
    radial-gradient(
      circle at 80% 70%,
      rgba(255,255,255,0.08),
      transparent 40%
    );

  animation:
    fogMove1 35s linear infinite alternate;
}

.fog-2 {
  background:
    radial-gradient(
      circle at 60% 30%,
      rgba(255,255,255,0.07),
      transparent 40%
    ),
    radial-gradient(
      circle at 40% 80%,
      rgba(255,255,255,0.05),
      transparent 45%
    );

  animation:
    fogMove2 50s linear infinite alternate;
}

/* ================= VINHETA ================= */

.map-vignette {
  position: absolute;
  inset: 0;

  background:
    radial-gradient(
      circle,
      rgba(0,0,0,0) 55%,
      rgba(0,0,0,0.30) 100%
    );

  pointer-events: none;

  z-index: 2;
}

/* ================= EMBERS ================= */

.embers {
  position: absolute;
  inset: 0;

  overflow: hidden;

  pointer-events: none;

  z-index: 2;
}

.ember {
  position: absolute;

  width: 3px;
  height: 3px;

  border-radius: 50%;

  background:
    rgba(255,210,120,0.75);

  box-shadow:
    0 0 10px rgba(255,180,50,0.35);

  animation:
    emberFloat linear infinite;
}

.ember:nth-child(odd) {
  width: 2px;
  height: 2px;
}

.ember:nth-child(1) { left: 2%; animation-duration: 14s; }
.ember:nth-child(2) { left: 6%; animation-duration: 20s; }
.ember:nth-child(3) { left: 10%; animation-duration: 16s; }
.ember:nth-child(4) { left: 14%; animation-duration: 22s; }
.ember:nth-child(5) { left: 18%; animation-duration: 15s; }
.ember:nth-child(6) { left: 22%; animation-duration: 18s; }
.ember:nth-child(7) { left: 26%; animation-duration: 12s; }
.ember:nth-child(8) { left: 30%; animation-duration: 19s; }
.ember:nth-child(9) { left: 34%; animation-duration: 17s; }
.ember:nth-child(10) { left: 38%; animation-duration: 24s; }

/* ================= BOTÃO ================= */

.back-button {
  position: absolute;

  top: 22px;
  right: 22px;

  z-index: 20;

  padding:
    12px 18px;

  border-radius: 12px;

  border:
    1px solid rgba(255,215,120,0.4);

  background:
    linear-gradient(
      to bottom,
      rgba(40,25,12,0.90),
      rgba(10,6,3,0.90)
    );

  color: #ffd76a;

  font-size: 14px;
  font-weight: 700;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.back-button:hover {
  transform: translateY(-2px);

  box-shadow:
    0 8px 28px rgba(255,215,0,0.18);
}

/* ================= WRAPPER ================= */

.map-wrapper {
  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;

  z-index: 5;
}

/* ================= MAPA ================= */

.map-container {
  position: absolute;

  width: 100%;
  height: 100%;

  top: 0;
  left: 0;

  transform-origin: center center;

  will-change: transform;

  user-select: none;

  z-index: 5;
}

/* ================= IMAGEM ================= */

.map-image {
  width: 100%;
  height: 100%;

  object-fit: contain;

  image-rendering: auto;

  filter:
    brightness(1.02)
    contrast(1.02)
    saturate(1.05);

  pointer-events: none;

  user-select: none;

  -webkit-user-drag: none;

  backface-visibility: hidden;

  transform: translateZ(0);
}

/* ================= ÁREAS ================= */

.map-area {
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 8;
}

/* ================= GLOW ================= */

.area-glow {
  position: absolute;
  inset: 0;

  border-radius: 16px;

  background:
    radial-gradient(
      circle,
      rgba(255,215,0,0.08),
      transparent 70%
    );

  opacity: 0;

  transition:
    opacity 0.2s ease;
}

.map-area:hover .area-glow {
  opacity: 1;
}

/* ================= NOMES ================= */

.area-name {
  position: absolute;

  bottom: -28px;

  color: #d7c6a2;

  font-size: 15px;

  font-weight: 700;

  letter-spacing: 0.8px;

  white-space: nowrap;

  text-shadow:
    0 2px 6px rgba(0,0,0,0.9),
    0 0 12px rgba(0,0,0,0.5);

  transition:
    color 0.2s ease,
    transform 0.2s ease,
    text-shadow 0.2s ease;

  pointer-events: none;
}

.map-area:hover .area-name {
  color: #ffd76a;

  transform: scale(1.05);

  text-shadow:
    0 0 10px rgba(255,215,0,0.55),
    0 0 22px rgba(255,215,0,0.35);
}

/* ================= ANIMAÇÕES ================= */

@keyframes emberFloat {

  from {
    transform:
      translateY(110vh)
      translateX(0px);

    opacity: 0;
  }

  15% {
    opacity: 0.75;
  }

  50% {
    transform:
      translateY(40vh)
      translateX(20px);
  }

  to {
    transform:
      translateY(-20vh)
      translateX(-15px);

    opacity: 0;
  }
}

@keyframes ambientFloat {

  from {
    transform:
      translateX(-20px)
      translateY(-10px)
      scale(1);
  }

  to {
    transform:
      translateX(20px)
      translateY(10px)
      scale(1.08);
  }
}

@keyframes fogMove1 {

  from {
    transform:
      translateX(-3%)
      translateY(-1%);
  }

  to {
    transform:
      translateX(3%)
      translateY(2%);
  }
}

@keyframes fogMove2 {

  from {
    transform:
      translateX(2%)
      translateY(-2%);
  }

  to {
    transform:
      translateX(-2%)
      translateY(2%);
  }
}

/* ================= PERFORMANCE ================= */

.map-container,
.map-image,
.map-area {
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

</style>