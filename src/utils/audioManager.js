export function playAudio(src, options = {}) {
  console.log('[AudioManager] Tocar:', src, options);
  try {
    const audio = new Audio(src);
    audio.loop = options.loop || false;
    audio.play().catch(error => {
      console.error('Audio play error:', error.message, 'for path:', src);
      return null; // Return null on play error
    });
    return audio; // Return the Audio object
  } catch (error) {
    console.error('Error creating audio:', error.message, 'for path:', src);
    return null; // Return null on creation error
  }
}

export function stopAudio(src) {
  if (src) {
    const audio = typeof src === 'string' ? new Audio(src) : src;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}