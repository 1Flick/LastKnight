/** FPS alvo do loop principal do jogo (canvas / combate). */
export const GAME_FPS = 30
export const FRAME_MS = 1000 / GAME_FPS

/**
 * Cria um gate para limitar atualização a ~GAME_FPS Hz usando requestAnimationFrame.
 * @param {number} [fps=GAME_FPS]
 * @returns {(timestamp: number) => number | null} ms desde o último frame aceito, ou null para pular
 */
export function createFrameGate(fps = GAME_FPS) {
  const frameMs = 1000 / fps
  let last = 0
  return (timestamp) => {
    if (!last) {
      last = timestamp
      return frameMs
    }
    const elapsed = timestamp - last
    if (elapsed < frameMs) return null
    last = timestamp
    return elapsed
  }
}
