import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';

export const useLanguageStore = defineStore('language', () => {
  const language = ref('pt');
  const textsData = {
    pt: {
      classTitle: 'Escolha seu herói e comece a aventura!',
      classSubtitle: 'Selecione uma classe, compare os atributos e nomeie seu cavaleiro.',
      statsTitle: 'Atributos da classe',
      placeholder: 'Digite o nome do seu herói...',
      start: 'Iniciar Jornada',
      // Other existing texts (story, options, etc.)
    },
    en: {
      classTitle: 'Choose your hero and start the adventure!',
      classSubtitle: 'Pick a class, compare attributes, and name your knight.',
      statsTitle: 'Class attributes',
      placeholder: 'Enter your hero\'s name...',
      start: 'Start Journey',
      // Other existing texts
    },
  };

  function initializeLanguage() {
    const storedLanguage = localStorage.getItem('language');
    if (storedLanguage && ['pt', 'en'].includes(storedLanguage)) {
      language.value = storedLanguage;
    }
  }

  watch(language, (newLang) => {
    localStorage.setItem('language', newLang);
  });

  const texts = computed(() => textsData[language.value]);

  return {
    language,
    texts,
    initializeLanguage,
  };
});