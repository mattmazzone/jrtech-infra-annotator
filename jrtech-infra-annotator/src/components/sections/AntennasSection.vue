<template>
  <div>
    <!-- Multi-select status -->
    <Card
      v-if="toolsStore.currentTool === 'multiselect' && annotationsStore.selectedAntennas.size > 0"
      class="mb-4"
    >
      <CardHeader>
        <CardTitle>Selected Antennas</CardTitle>
        <CardDescription>
          {{ annotationsStore.selectedAntennas.size }} antenna{{
            annotationsStore.selectedAntennas.size > 1 ? 's' : ''
          }}
          selected
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <div class="flex gap-2">
          <Button @click="handleClearSelection" variant="outline" size="sm">
            Clear Selection
          </Button>
          <Button @click="handleDeleteSelected" variant="destructive" size="sm">
            <Trash2 class="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Use Delete key or drag to move selected antennas together.
        </p>
      </CardContent>
    </Card>

    <Separator class="mb-4" />

    <h3 class="text-lg font-semibold mb-2">Antennas</h3>
    <p v-if="!annotationsStore.antennas.length" class="text-sm text-muted-foreground">
      Use the 'Add Antenna' tool or populate a zone.
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="(antenna, index) in annotationsStore.antennas"
        :key="antenna.id"
        class="flex items-center gap-2 text-sm"
      >
        <Input v-model="antenna.label" @input="draw()" class="h-8 flex-1" />
        <span v-if="antenna.zoneId" class="text-xs text-muted-foreground whitespace-nowrap">
          In {{ getZoneLabel(antenna.zoneId) }}
        </span>
        <div
          v-if="annotationsStore.selectedAntennas.has(antenna.id)"
          class="w-2 h-2 bg-yellow-500 rounded-full"
          title="Selected"
        ></div>
        <Button
          @click="handleDeleteAntenna(antenna.id, index)"
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
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trash2 } from 'lucide-vue-next'

import { useToolsStore } from '@/stores/tools'
import { useAnnotationsStore } from '@/stores/annotations'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'

const toolsStore = useToolsStore()
const annotationsStore = useAnnotationsStore()
const { draw } = useCanvasRenderer()

const getZoneLabel = (zoneId: number): string => {
  const zone = annotationsStore.zones.find((z) => z.id === zoneId)
  return zone?.label || '?'
}

const handleClearSelection = () => {
  annotationsStore.clearSelection()
  draw()
}

const handleDeleteSelected = () => {
  annotationsStore.deleteSelectedAntennas()
  draw()
}

const handleDeleteAntenna = (id: number, index: number) => {
  annotationsStore.selectedAntennas.delete(id)
  annotationsStore.antennas.splice(index, 1)
  draw()
}
</script>
