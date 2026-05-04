<template>
  <router-view :key="$route.fullPath" />
  <GameUiModals />
</template>

<script setup>
import GameUiModals from '@/components/GameUiModals.vue'
</script>

<style>
body {
  margin: 0;
  background-color: black;
}
</style>