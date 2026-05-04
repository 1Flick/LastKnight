import { defineStore } from 'pinia'

/**
 * Modais in-game (substitui alert/confirm do navegador) com visual medieval.
 */
export const useUiOverlayStore = defineStore('uiOverlay', {
  state: () => ({
    alert: { open: false, message: '', resolve: null },
    confirm: { open: false, message: '', resolve: null },
  }),
  actions: {
    showAlert(message) {
      return new Promise((resolve) => {
        this.alert = { open: true, message, resolve }
      })
    },
    dismissAlert() {
      const fn = this.alert.resolve
      this.alert = { open: false, message: '', resolve: null }
      fn?.()
    },
    showConfirm(message) {
      return new Promise((resolve) => {
        this.confirm = { open: true, message, resolve }
      })
    },
    confirmYes() {
      const fn = this.confirm.resolve
      this.confirm = { open: false, message: '', resolve: null }
      fn?.(true)
    },
    confirmNo() {
      const fn = this.confirm.resolve
      this.confirm = { open: false, message: '', resolve: null }
      fn?.(false)
    },
  },
})
