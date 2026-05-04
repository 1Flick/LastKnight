export function useAudio() {
  const playAudio = (sound, options = {}) => {
    console.log(`Tocando som: ${sound}`, options);
  };
  return { playAudio };
}