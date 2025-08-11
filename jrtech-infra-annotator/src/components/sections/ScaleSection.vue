<template>
  <Card v-if="annotationsStore.scaleLine.start && annotationsStore.scaleLine.end">
    <CardHeader>
      <CardTitle>Map Scale</CardTitle>
      <CardDescription>Enter the real-world length of the line you drew.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <Label for="scale-meters">Scale Line Length (meters)</Label>
      <Input
        id="scale-meters"
        type="number"
        step="0.01"
        :model-value="annotationsStore.scaleLine.meters"
        @input="handleScaleInput"
        placeholder="e.g., 10"
      />
      <p class="text-sm text-muted-foreground">
        1 px ≈ {{ annotationsStore.metersPerPx ? annotationsStore.metersPerPx.toFixed(4) : '?' }} m
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAnnotationsStore } from '@/stores/annotations'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'

const annotationsStore = useAnnotationsStore()
const { draw } = useCanvasRenderer()

const handleScaleInput = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(value)) {
    annotationsStore.setScaleMeters(value)
    draw()
  }
}
</script>
