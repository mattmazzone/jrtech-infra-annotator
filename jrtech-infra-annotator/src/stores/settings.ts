import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { GridSnapSettings, ExportOptions } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const openImportExportDialog = ref(false)
  const exportOptions = reactive<ExportOptions>({
    includePerimeter: true,
    includeScale: true,
    includeZones: true,
    includeAntennas: true,
    includeMeasurements: true,
  })
  const gridSnap = reactive<GridSnapSettings>({
    enabled: true,
    orthogonalSnapAngle: 15, // degrees - snap when within 15° of horizontal/vertical
    diagonalSnapAngle: 10, // degrees - snap when within 10° of 45° angles
    enableDiagonalSnap: true,
  })

  const updateGridSnapSettings = (settings: Partial<GridSnapSettings>) => {
    Object.assign(gridSnap, settings)
  }

  const toggleGridSnap = () => {
    gridSnap.enabled = !gridSnap.enabled
  }

  return {
    openImportExportDialog,
    gridSnap,
    exportOptions,
    updateGridSnapSettings,
    toggleGridSnap,
  }
})
