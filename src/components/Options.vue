<template>
  <div class="options-container slide-down">
    <div class="options-box">
      <h1 class="options-title">{{ texts[language].title }}</h1>
      <div class="options-content">
        <div class="option-group">
          <label for="musicVolume">🎵 {{ texts[language].musicVolume }}</label>
          <input type="range" id="musicVolume" v-model.number="musicVolume" min="0" max="100"
            @input="updateVolume('music')" />
          <span>{{ musicVolume }}%</span>
        </div>

        <div class="option-group">
          <label for="resolution">🖥️ Resolução {{ texts[language].resolution }}</label>
          <select id="resolution" v-model="selectedResolution">
            <option value="1">1920x1080</option>
            <option value="2">1366x768</option>
          </select>
        </div>

        <div class="option-group">
          <label for="language">🌐 {{ texts[language].language }}</label>
          <select id="language" v-model="language">
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </select>
        </div>

        <div class="option-group">
          <label>✨ {{ texts[language].shaders }}</label>
          <div class="toggle-container" @click="toggleShaders">
            <div class="toggle-switch" :class="{ 'active': shadersEnabled }">
              <div class="toggle-button"></div>
            </div>
            <span class="toggle-label">{{ shadersEnabled ? texts[language].on : texts[language].off }}</span>
          </div>
        </div>

        <div class="buttons">
          <div class="menu-button" @click="saveSettings">{{ texts[language].save }}</div>
          <div class="menu-button" @click="goBack">{{ texts[language].back }}</div>
          <div class="menu-button danger-button" @click="resetProgress">
            {{ texts[language].reset }}
          </div>
        </div>
      </div>

      <p :class="['saved-msg', 'game-ui-toast--saved', { show: saved }]">✔️ {{ texts[language].savedMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameState } from '@/stores/gameState';
import { useUiOverlayStore } from '@/stores/uiOverlay';


const emit = defineEmits(["close"]); // ✅ movido aqui para funcionar em goBack

const router = useRouter();
const gameState = useGameState();
const uiOverlay = useUiOverlayStore();
const selectedResolution = ref(gameState.resolution || 1);

const texts = {
  pt: {
    title: "OPÇÕES",
    musicVolume: "Volume da Música",
    resolution: "Resolução da Tela",
    language: "Idioma",
    save: "SALVAR",
    back: "VOLTAR",
    reset: "RESETAR PROGRESSO",
    savedMsg: "Configurações salvas!",
    shaders: "Efeitos de Luz",
    on: "Ligado",
    off: "Desligado",
    confirmReset: "Tem certeza que deseja resetar todo o progresso?"
  },
  en: {
    title: "OPTIONS",
    musicVolume: "Music Volume",
    resolution: "Screen Resolution",
    language: "Language",
    save: "SAVE",
    back: "BACK",
    reset: "RESET PROGRESS",
    savedMsg: "Settings saved!",
    shaders: "Light Effects",
    on: "On",
    off: "Off",
    confirmReset: "Are you sure you want to reset all progress?"
  }
};

const musicVolume = ref(50);
const language = ref("pt");
const shadersEnabled = ref(true);
const saved = ref(false);
let clickSound;

onMounted(() => {
  const storedMusicVolume = localStorage.getItem("musicVolume");
  musicVolume.value = storedMusicVolume !== null ? Number(storedMusicVolume) : 50;

  const storedLanguage = localStorage.getItem("language");
  language.value = storedLanguage && ['pt', 'en'].includes(storedLanguage) ? storedLanguage : "pt";

  shadersEnabled.value = gameState.shaders !== undefined ? gameState.shaders : true;

  clickSound = new Audio("/sounds/click.wav");
  clickSound.volume = 0.4;

  updateVolume("music");
});

watch(language, (newLang) => {
  localStorage.setItem("language", newLang);
});

const resetProgress = async () => {
  playClick();
  const ok = await uiOverlay.showConfirm(texts[language.value].confirmReset);
  if (ok) {
    localStorage.clear();
    location.reload();
  }
};

const saveSettings = () => {
  playClick();
  localStorage.setItem("musicVolume", musicVolume.value);
  localStorage.setItem("language", language.value);
  gameState.shaders = shadersEnabled.value;
  gameState.saveState();
  updateVolume("music");
  saved.value = true;
  setTimeout(() => (saved.value = false), 1500);
  gameState.resolution = Number(selectedResolution.value);
};

const toggleShaders = () => {
  playClick();
  shadersEnabled.value = !shadersEnabled.value;
};

const goBack = () => {
  playClick();
  emit("close"); // ✅ agora realmente fecha o overlay
};

const updateVolume = (type) => {
  const value = type === "music" ? musicVolume.value : 0;
  if (window.gameAudio?.music) {
    window.gameAudio.music.volume = value / 100;
  }
};

function playClick() {
  if (clickSound) clickSound.play();
}
</script>

<style scoped>
.options-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--game-overlay-scrim);
  backdrop-filter: blur(3px);
  z-index: 100;
}

.slide-down {
  animation: slideDown 1s ease-out;
}

@keyframes slideDown {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }

  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.options-box {
  position: relative;
  background: linear-gradient(
    165deg,
    var(--game-honey-light) 0%,
    var(--game-honey) 50%,
    var(--game-honey-shadow) 100%
  );
  border: 5px solid var(--game-wood-dark);
  padding: 30px;
  border-radius: 12px;
  min-width: 400px;
  box-shadow: var(--game-shadow-modal);
  font-family: var(--game-ui-font);
}

.options-title {
  font-size: 40px;
  color: var(--game-wood-dark);
  text-align: center;
  margin-bottom: 20px;
  text-shadow: 2px 2px var(--game-honey-shadow);
  font-family: var(--game-ui-font);
}

.options-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: transparent;
  font-size: 18px;
  text-align: left;
  margin-bottom: 20px;
  color: var(--game-wood-dark);
}

.option-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

label {
  font-size: 20px;
  color: var(--game-wood-dark);
  margin-bottom: 8px;
}

input[type="range"] {
  width: 100%;
  height: 20px;
  background: var(--game-honey-shadow);
  border: 2px solid var(--game-wood-dark);
  border-radius: 5px;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb,
input[type="range"]::-moz-range-thumb {
  width: 30px;
  height: 30px;
  background: var(--game-wood-dark);
  border: 2px solid var(--game-honey-light);
  border-radius: 5px;
  cursor: pointer;
}

span {
  margin-top: 5px;
  text-align: center;
  font-size: 16px;
  color: var(--game-wood-dark);
}

select {
  width: 100%;
  padding: 10px;
  background: var(--game-honey-shadow);
  border: 2px solid var(--game-wood-dark);
  border-radius: 5px;
  font-size: 16px;
  color: var(--game-wood-dark);
  font-family: var(--game-ui-font);
  background-image: url('data:image/svg+xml;utf8,<svg fill="%235c2c1d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5H7z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 20px;
  appearance: none;
}

select:focus {
  outline: none;
  background-color: var(--game-honey-light);
}

.toggle-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-top: 5px;
}

.toggle-switch {
  position: relative;
  width: 60px;
  height: 30px;
  background: var(--game-honey-shadow);
  border: 2px solid var(--game-wood-dark);
  border-radius: 15px;
  transition: all 0.3s;
}

.toggle-switch.active {
  background: var(--game-wood-dark);
}

.toggle-button {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 26px;
  height: 26px;
  background: var(--game-honey-light);
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch.active .toggle-button {
  left: 32px;
}

.toggle-label {
  margin-left: 10px;
  font-size: 18px;
  font-weight: bold;
  color: var(--game-wood-dark);
}

.buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.menu-button {
  font-family: var(--game-ui-font);
  background-color: var(--game-honey);
  color: var(--game-wood-dark);
  border: 4px solid var(--game-wood-dark);
  padding: 10px 40px;
  width: 200px;
  height: 50px;
  font-size: 24px;
  text-align: center;
  cursor: pointer;
  box-shadow: inset -6px -6px var(--game-honey-shadow),
    inset 6px 6px var(--game-honey-light);
  font-weight: bold;
}

.menu-button:hover {
  background-color: #f4b76a;
  color: #3e1e14;
}

.menu-button:active {
  transform: translateY(2px);
}

.danger-button {
  background-color: var(--game-danger);
  color: #fff2cc;
  border-color: var(--game-danger-dark);
  box-shadow: inset -6px -6px #8b0000, inset 6px 6px #ff4040;
}

.danger-button:hover {
  background-color: #9b1d1d;
}

.danger-button:active {
  transform: translateY(2px);
}

.saved-msg {
  position: absolute;
  bottom: 11px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  pointer-events: none;
}

.saved-msg.show {
  opacity: 1;
}

.options-content::-webkit-scrollbar {
  width: 10px;
}

.options-content::-webkit-scrollbar-track {
  background: var(--game-honey-shadow);
}

.options-content::-webkit-scrollbar-thumb {
  background: var(--game-wood-dark);
  border-radius: 5px;
}

:global(html, body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
}
</style>