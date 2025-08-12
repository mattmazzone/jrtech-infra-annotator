import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tool, ToolConfig } from '@/types'
import { useImageStore } from './image'
import { useAnnotationsStore } from './annotations'

import { Antenna, MousePointer, Square, Ruler, MapPin, Target } from 'lucide-vue-next'

export const useToolsStore = defineStore('tools', () => {
  const currentTool = ref<Tool>('perimeter')

  const imageStore = useImageStore()
  const annotationsStore = useAnnotationsStore()

  const tools = computed((): ToolConfig[] => [
    {
      value: 'perimeter',
      label: 'Perimeter',
      tooltip: 'Draw the site boundary',
      icon: Target,
    },
    {
      value: 'scale',
      label: 'Scale',
      tooltip: 'Set map scale',
      icon: Ruler,
      disabled: annotationsStore.perimeter.closed === false, // Disable if perimeter is not set
    },
    {
      value: 'zone',
      label: 'Zone',
      tooltip: 'Draw coverage zones',
      icon: Square,
      disabled: annotationsStore.scaleLine.meters === undefined, // Disable if scale line is not set
    },
    {
      value: 'antenna',
      label: 'Add Antenna',
      tooltip: 'Place individual antennas',
      icon: Antenna,
      disabled: annotationsStore.scaleLine.meters === undefined, // Disable if scale line is not set
    },
    {
      value: 'measure',
      label: 'Measure',
      tooltip: 'Measure distances',
      icon: MapPin,
      disabled: annotationsStore.scaleLine.meters === undefined, // Disable if scale line is not set
    },
    {
      value: 'select',
      label: 'Select',
      tooltip: 'Select and move antennas',
      icon: MousePointer,
      disabled: annotationsStore.scaleLine.meters === undefined, // Disable if scale line is not set
    },
    {
      value: 'multiselect',
      label: 'Multi-Select',
      tooltip: 'Select multiple antennas',
      icon: Target,
      disabled: annotationsStore.scaleLine.meters === undefined, // Disable if scale line is not set
    },
  ])

  const setTool = (tool: Tool) => {
    currentTool.value = tool
  }

  return {
    currentTool,
    tools,
    setTool,
  }
})
