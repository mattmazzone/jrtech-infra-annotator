<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="w-[500px]">
      <DialogHeader>
        <DialogTitle>Import/Export Options</DialogTitle>
        <DialogDescription> Choose an option below to import or export data </DialogDescription>
      </DialogHeader>

      <!-- Export as PNG with options -->
      <div class="flex items-start gap-6">
        <Button @click="handleExportPNG" variant="outline" class="w-40 justify-start">
          <Download class="w-4 h-4 mr-2" /> Export PNG
        </Button>
        <div class="flex flex-col space-y-1">
          <label class="inline-flex items-center">
            <Checkbox v-model="settings.exportOptions.includePerimeter" />
            <span class="ml-2 text-sm">Include Perimeter</span>
          </label>
          <label class="inline-flex items-center">
            <Checkbox v-model="settings.exportOptions.includeScale" />
            <span class="ml-2 text-sm">Include Scale</span>
          </label>
          <label class="inline-flex items-center">
            <Checkbox v-model="settings.exportOptions.includeZones" />
            <span class="ml-2 text-sm">Include Zones</span>
          </label>
          <label class="inline-flex items-center">
            <Checkbox v-model="settings.exportOptions.includeAntennas" />
            <span class="ml-2 text-sm">Include Antennas</span>
          </label>
          <label class="inline-flex items-center">
            <Checkbox v-model="settings.exportOptions.includeMeasurements" />
            <span class="ml-2 text-sm">Include Measurements</span>
          </label>
        </div>
      </div>

      <Separator class="my-4" />

      <!-- JSON Buttons -->
      <div class="flex gap-4">
        <Button @click="handleExportJSON" variant="outline" class="w-40 justify-start">
          <Download class="w-4 h-4 mr-2" /> Export JSON
        </Button>
        <Button @click="handleImportJSON" variant="outline" class="w-40 justify-start">
          <Upload class="w-4 h-4 mr-2" /> Import JSON
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Upload, Download } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useCanvasStore } from '@/stores/canvas'
import { useAnnotationsStore } from '@/stores/annotations'
import { exportPNG, exportJSON, importJSON } from '@/utils/export'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'

const settings = useSettingsStore()
const canvasStore = useCanvasStore()
const annotationsStore = useAnnotationsStore()
const { draw } = useCanvasRenderer()

interface Props {
  open: boolean
}

defineProps<Props>()
defineEmits<{ 'update:open': [value: boolean] }>()

const handleExportPNG = () => {
  if (canvasStore.canvasRef) {
    draw(true)
    exportPNG(canvasStore.canvasRef)
    draw(false)
  }
}

const handleExportJSON = () => {
  const data = annotationsStore.exportData()
  exportJSON(data)
}

const handleImportJSON = async () => {
  try {
    const data = await importJSON()
    const success = annotationsStore.importData(data)
    if (success) {
      console.log('Data imported successfully')
      draw()
    } else {
      console.error('Failed to import data')
    }
  } catch (error) {
    console.error('Import failed:', error)
  }
}
</script>
