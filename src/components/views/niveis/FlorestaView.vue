<template>
  <div class="floresta-view">
    <canvas ref="canvasRef" class="game-canvas"></canvas>
    <HUD />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onBeforeMount, watch } from 'vue'
import { useGameState } from '@/stores/gameState'
import HUD from '@/components/HUD.vue'
import { createFrameGate } from '@/utils/fpsLoop'
import { usePlayerSprite } from '@/composables/usePlayerSprite'

let nextGameFrame = createFrameGate()
const gameState = useGameState()
const { spriteUrl } = usePlayerSprite()

const canvasRef = ref(null)
let ctx = null
let animationFrameId = null
let isLoopRunning = false

const world = {
  width: 7000,
  height: 5200
}

/** < 1 = câmera mais “longe” (vê mais mapa ao redor do personagem) */
const CAMERA_ZOOM = 0.48

const keys = { w: false, a: false, s: false, d: false, shift: false }
const maxStamina = gameState.player.maxStamina
const staminaRecoveryRate = 10
const staminaConsumptionRate = 25

const backgroundImage = new Image()
const playerSpriteSheet = new Image()
const frameWidth = 96
const frameHeight = 96

const player = {
  x: world.width / 2,
  y: world.height / 2,
  size: 300,
  speed: 6,
  runSpeed: 9,
  direction: 'idle'
}

const animations = {
  idle: { row: 3, frames: [7, 1, 2, 3, 4, 5], frameInterval: 150 },
  walk_down: { row: 6, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], frameInterval: 100 },
  walk_up: { row: 4, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], frameInterval: 100 },
  walk_left: { row: 20.1, frames: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], frameInterval: 100 },
  walk_right: { row: 5, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], frameInterval: 100 }
}

let currentFrameIndex = 0
let frameTimer = 0

function resizeCanvas() {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
}

function onKeyDown(e) {
  const key = e.key.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(keys, key)) {
    keys[key] = true
  }
}

function onKeyUp(e) {
  const key = e.key.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(keys, key)) {
    keys[key] = false
  }
}

/** Ponto do mundo que fica no centro da tela (com zoom e limites do mapa). */
function getCameraCenter() {
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  const viewWorldW = w / CAMERA_ZOOM
  const viewWorldH = h / CAMERA_ZOOM
  const halfViewWorldW = viewWorldW / 2
  const halfViewWorldH = viewWorldH / 2

  let cx = player.x
  let cy = player.y

  if (world.width <= viewWorldW) {
    cx = world.width / 2
  } else {
    cx = Math.max(halfViewWorldW, Math.min(cx, world.width - halfViewWorldW))
  }

  if (world.height <= viewWorldH) {
    cy = world.height / 2
  } else {
    cy = Math.max(halfViewWorldH, Math.min(cy, world.height - halfViewWorldH))
  }

  return { x: cx, y: cy }
}

function update(deltaSeconds) {
  const { w, a, s, d, shift } = keys
  let moved = false
  let dx = 0
  let dy = 0

  if (w) {
    dy -= 1
    moved = true
  }
  if (s) {
    dy += 1
    moved = true
  }
  if (a) {
    dx -= 1
    moved = true
  }
  if (d) {
    dx += 1
    moved = true
  }

  if (dx !== 0 && dy !== 0) {
    const invSqrt2 = 1 / Math.sqrt(2)
    dx *= invSqrt2
    dy *= invSqrt2
  }

  if (!moved) {
    player.direction = 'idle'
    gameState.player.stamina = Math.min(maxStamina, gameState.player.stamina + staminaRecoveryRate * deltaSeconds)
    return
  }

  let speed = player.speed
  const canRun = shift && gameState.player.stamina > 0

  if (canRun) {
    speed = player.runSpeed
    gameState.player.stamina = Math.max(0, gameState.player.stamina - staminaConsumptionRate * deltaSeconds)
  } else {
    gameState.player.stamina = Math.min(maxStamina, gameState.player.stamina + staminaRecoveryRate * deltaSeconds)
  }

  if (dy < 0) player.direction = 'walk_up'
  else if (dy > 0) player.direction = 'walk_down'
  else if (dx < 0) player.direction = 'walk_left'
  else if (dx > 0) player.direction = 'walk_right'

  player.x = Math.min(Math.max(player.x + dx * speed, 0), world.width)
  player.y = Math.min(Math.max(player.y + dy * speed, 0), world.height)
}

function updateAnimation(deltaSeconds) {
  const anim = animations[player.direction] || animations.idle
  frameTimer += deltaSeconds * 1000
  if (frameTimer > anim.frameInterval) {
    frameTimer = 0
    currentFrameIndex = (currentFrameIndex + 1) % anim.frames.length
  }
}

function drawWorld() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    ctx.drawImage(backgroundImage, 0, 0, world.width, world.height)
    return
  }

  // Fallback visual caso o fundo não carregue.
  ctx.fillStyle = '#18361f'
  ctx.fillRect(0, 0, world.width, world.height)
}

function drawGrid() {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 0 / CAMERA_ZOOM
  const step = 300

  for (let x = 0; x <= world.width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, world.height)
    ctx.stroke()
  }

  for (let y = 0; y <= world.height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(world.width, y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawPlayer() {
  const anim = animations[player.direction] || animations.idle
  const frame = anim.frames[currentFrameIndex]
  const sx = frame * frameWidth
  const sy = anim.row * frameHeight

  if (playerSpriteSheet.complete && playerSpriteSheet.naturalWidth > 0) {
    ctx.drawImage(
      playerSpriteSheet,
      sx,
      sy,
      frameWidth,
      frameHeight,
      player.x - player.size / 2,
      player.y - player.size / 2,
      player.size,
      player.size
    )
    return
  }

  ctx.fillStyle = '#e65f5f'
  ctx.fillRect(player.x - 20, player.y - 20, 40, 40)
}

function draw() {
  if (!ctx || !canvasRef.value) return

  const w = canvasRef.value.width
  const h = canvasRef.value.height
  const center = getCameraCenter()

  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM)
  ctx.translate(-center.x, -center.y)
  drawWorld()
  drawGrid()
  drawPlayer()
  ctx.restore()
}

function gameLoop(timestamp) {
  animationFrameId = requestAnimationFrame(gameLoop)
  const elapsed = nextGameFrame(timestamp)
  if (elapsed === null) return

  const deltaSeconds = elapsed / 1000
  update(deltaSeconds)
  updateAnimation(deltaSeconds)
  draw()
}

function tryStartLoop() {
  if (isLoopRunning || !ctx || !canvasRef.value) return
  const imagesReady =
    playerSpriteSheet.complete &&
    playerSpriteSheet.naturalWidth > 0

  if (!imagesReady) return
  isLoopRunning = true
  animationFrameId = requestAnimationFrame(gameLoop)
}

onBeforeMount(() => {
  nextGameFrame = createFrameGate()
})

onMounted(() => {
  if (!canvasRef.value) return

  ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  backgroundImage.src = '/img/Floresta/floresta-bg.jpg'
  playerSpriteSheet.src = spriteUrl.value

  watch(spriteUrl, (nextUrl) => {
    playerSpriteSheet.src = nextUrl
  })

  backgroundImage.onload = tryStartLoop
  backgroundImage.onerror = () => {
    tryStartLoop()
  }
  playerSpriteSheet.onload = tryStartLoop

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  // Permite iniciar mesmo com cache carregado.
  tryStartLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)

  if (animationFrameId != null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  isLoopRunning = false
})
</script>

<style scoped>
.floresta-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.game-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: #000;
}
</style>