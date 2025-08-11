<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Measurements</h3>
    <p v-if="!annotationsStore.measures.length" class="text-sm text-muted-foreground">
      Use the 'Measure' tool to create measurements.
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="measure in annotationsStore.measures"
        :key="measure.id"
        class="flex items-center justify-between text-sm"
      >
        <div class="flex items-baseline gap-2">
          <span class="font-medium">M{{ measure.id }}:</span>
          <span>{{ getMeasureDistance(measure) }}</span>
        </div>
        <Button
          @click="handleDeleteMeasure(measure.id)"
          variant="ghost"
          size="icon"
          class="h-7 w-7"
        >
          <Trash2 class="w-4 h-4 text-destructive" />
        </Button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-vue-next'

import { useAnnotationsStore } from '@/stores/annotations'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import type { Measure } from '@/types'

const annotationsStore = useAnnotationsStore()
const { draw } = useCanvasRenderer()

const getMeasureDistance = (measure: Measure): string => {
  const dx = measure.end.x - measure.start.x
  const dy = measure.end.y - measure.start.y
  const meters = annotationsStore.metersPerPx
    ? Math.hypot(dx, dy) * annotationsStore.metersPerPx
    : null
  return meters ? `${meters.toFixed(2)} m` : '? m'
}

const handleDeleteMeasure = (id: number) => {
  annotationsStore.deleteMeasure(id)
  draw()
}
</script>
