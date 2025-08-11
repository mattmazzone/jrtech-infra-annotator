<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Zones</h3>
    <p v-if="!annotationsStore.zones.length" class="text-sm text-muted-foreground">
      Use the 'Zone' tool to draw deployment areas.
    </p>
    <Accordion v-else type="multiple" class="w-full" collapsible>
      <AccordionItem
        v-for="zone in annotationsStore.zones"
        :key="zone.id"
        :value="`zone-${zone.id}`"
      >
        <AccordionTrigger>
          <div class="flex items-center gap-2 flex-1 mr-4">
            <div
              class="w-4 h-4 border border-gray-400 rounded-sm shrink-0"
              :style="{
                backgroundColor: zoneColors[zone.colorIndex].fill,
                borderColor: zoneColors[zone.colorIndex].stroke,
              }"
            ></div>
            <span class="truncate">{{ zone.label }}</span>
          </div>
          <Button
            @click.stop="handleDeleteZone(zone.id)"
            variant="ghost"
            size="icon"
            class="h-7 w-7"
          >
            <Trash2 class="w-4 h-4 text-destructive" />
          </Button>
        </AccordionTrigger>
        <AccordionContent class="space-y-4 pt-2">
          <div class="space-y-1">
            <Label :for="`zone-label-${zone.id}`">Zone Label</Label>
            <Input :id="`zone-label-${zone.id}`" v-model="zone.label" @input="draw()" />
          </div>
          <div class="space-y-1">
            <Label :for="`zone-maxdist-${zone.id}`">Max distance between antennas (m)</Label>
            <Input
              :id="`zone-maxdist-${zone.id}`"
              type="number"
              step="0.1"
              v-model.number="zone.maxDist"
            />
          </div>
          <div class="space-y-1">
            <Label :for="`zone-covradius-${zone.id}`">Coverage radius per antenna (m)</Label>
            <Input
              :id="`zone-covradius-${zone.id}`"
              type="number"
              step="0.1"
              v-model.number="zone.coverageRadius"
              @input="draw()"
            />
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox
              :id="`show-coverage-${zone.id}`"
              :checked="zone.showCoverage"
              @click="handleToggleCoverage(zone)"
            />
            <Label :for="`show-coverage-${zone.id}`" class="text-sm font-medium leading-none">
              Show coverage circles
            </Label>
          </div>
          <div class="flex items-center gap-2">
            <Label class="text-sm">Color:</Label>
            <Button
              @click="handleChangeColor(zone.id, -1)"
              variant="outline"
              size="icon"
              class="h-7 w-7"
            >
              <ArrowLeft class="w-4 h-4" />
            </Button>
            <Button
              @click="handleChangeColor(zone.id, 1)"
              variant="outline"
              size="icon"
              class="h-7 w-7"
            >
              <ArrowRight class="w-4 h-4" />
            </Button>
          </div>
          <Button @click="handlePopulateAntennas(zone.id)" class="w-full">
            <Antenna class="w-4 h-4 mr-2" /> Populate Antennas
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Trash2, ArrowLeft, ArrowRight, Antenna } from 'lucide-vue-next'

import { zoneColors } from '@/utils/constants'
import { useAnnotationsStore } from '@/stores/annotations'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import type { Zone } from '@/types'

const annotationsStore = useAnnotationsStore()
const { draw } = useCanvasRenderer()

const handleDeleteZone = (id: number) => {
  annotationsStore.deleteZone(id)
  draw()
}

const handleToggleCoverage = (zone: Zone) => {
  zone.showCoverage = !zone.showCoverage
  draw()
}

const handleChangeColor = (zoneId: number, direction: number) => {
  annotationsStore.changeZoneColor(zoneId, direction)
  draw()
}

const handlePopulateAntennas = (zoneId: number) => {
  if (!annotationsStore.metersPerPx) {
    alert('Please set a scale first (draw scale line and enter meters).')
    return
  }
  annotationsStore.populateAntennasInZone(zoneId)
  draw()
}
</script>
