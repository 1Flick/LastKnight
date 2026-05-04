<template>
  <Teleport to="body">
    <div
      v-if="store.alert.open"
      class="game-ui-modal-overlay"
      role="presentation"
      @click.self="store.dismissAlert"
    >
      <div
        class="game-ui-modal game-ui-modal--alert"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'game-ui-alert-msg'"
      >
        <div class="game-ui-modal__ornament game-ui-modal__ornament--top" aria-hidden="true" />
        <p id="game-ui-alert-msg" class="game-ui-modal__text">{{ store.alert.message }}</p>
        <button type="button" class="game-ui-btn game-ui-modal__primary" @click="store.dismissAlert">
          {{ labels.ok }}
        </button>
        <div class="game-ui-modal__ornament game-ui-modal__ornament--bottom" aria-hidden="true" />
      </div>
    </div>

    <div
      v-if="store.confirm.open"
      class="game-ui-modal-overlay"
      role="presentation"
      @click.self="store.confirmNo"
    >
      <div
        class="game-ui-modal game-ui-modal--confirm"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'game-ui-confirm-msg'"
      >
        <div class="game-ui-modal__ornament game-ui-modal__ornament--top" aria-hidden="true" />
        <p id="game-ui-confirm-msg" class="game-ui-modal__text">{{ store.confirm.message }}</p>
        <div class="game-ui-modal__actions">
          <button type="button" class="game-ui-btn game-ui-modal__secondary" @click="store.confirmNo">
            {{ labels.no }}
          </button>
          <button type="button" class="game-ui-btn game-ui-modal__primary" @click="store.confirmYes">
            {{ labels.yes }}
          </button>
        </div>
        <div class="game-ui-modal__ornament game-ui-modal__ornament--bottom" aria-hidden="true" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiOverlayStore } from '@/stores/uiOverlay'

const store = useUiOverlayStore()
const { alert: alertRef, confirm: confirmRef } = storeToRefs(store)
const lang = ref('pt')

const labels = computed(() => {
  const en = lang.value === 'en'
  return {
    ok: en ? 'OK' : 'Entendido',
    yes: en ? 'Yes' : 'Sim',
    no: en ? 'No' : 'Não',
  }
})

function refreshLang() {
  lang.value = localStorage.getItem('language') === 'en' ? 'en' : 'pt'
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (store.confirm.open) store.confirmNo()
  else if (store.alert.open) store.dismissAlert()
}

watch(
  () => [alertRef.value.open, confirmRef.value.open],
  ([a, c]) => {
    if (a || c) refreshLang()
  }
)

onMounted(() => {
  refreshLang()
  window.addEventListener('storage', refreshLang)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('storage', refreshLang)
  document.removeEventListener('keydown', onKeydown)
})
</script>
