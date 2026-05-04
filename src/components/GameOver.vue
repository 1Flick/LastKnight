<template>
  <div class="game-over-screen">
    <h1 class="title">GAME OVER</h1>
    <p class="message">A jornada terminou... mas todo herói pode recomeçar.</p>
    <button @click="restartGame()">Voltar ao Menu</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useGameState } from '@/stores/gameState.js';

const router = useRouter();
const gameState = useGameState();

const restartGame = async () => {
  try {
    console.log('Botão clicado, iniciando redirecionamento...');
    router.push('/'); // Redireciona para a rota raiz (Menu.vue dentro de App.vue)
    gameState.resetGame(); // Reseta o estado do jogo
    console.log('Redirecionamento concluído');
  } catch (error) {
    console.error('Erro ao redirecionar:', error);
  }
};
</script>

<style scoped>
.game-over-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: radial-gradient(ellipse at center, #2b0000 0%, #000000 100%);
  color: #f8dada;
  text-align: center;
}

.title {
  font-size: 64px;
  margin-bottom: 20px;
  text-shadow: 4px 4px 0 #900;
}

.message {
  font-size: 20px;
  margin-bottom: 40px;
}

button {
  padding: 12px 32px;
  font-size: 18px;
  background-color: #8b0000;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  transition: 0.2s;
}

button:hover {
  background-color: #a30000;
  transform: scale(1.05);
}
</style>