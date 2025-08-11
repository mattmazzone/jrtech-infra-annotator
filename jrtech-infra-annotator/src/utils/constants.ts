import type { Component } from 'vue'
import {
  Antenna,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  MousePointer,
  Square,
  Ruler,
  MapPin,
  Target,
} from 'lucide-vue-next'
import type { Tool } from '@/types'

export const zoneColors = [
  { fill: 'rgba(34,197,94,0.2)', stroke: '#22c55e', text: '#15803d' },
  { fill: 'rgba(59,130,246,0.2)', stroke: '#3b82f6', text: '#1d4ed8' },
  { fill: 'rgba(168,85,247,0.2)', stroke: '#a855f7', text: '#7c3aed' },
  { fill: 'rgba(234,179,8,0.2)', stroke: '#eab308', text: '#a16207' },
  { fill: 'rgba(239,68,68,0.2)', stroke: '#ef4444', text: '#dc2626' },
]

export interface ToolConfig {
  value: Tool
  label: string
  tooltip: string
  icon: Component
}

export const tools: ToolConfig[] = [
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
  },
  {
    value: 'zone',
    label: 'Zone',
    tooltip: 'Draw coverage zones',
    icon: Square,
  },
  {
    value: 'antenna',
    label: 'Add Antenna',
    tooltip: 'Place individual antennas',
    icon: Antenna,
  },
  {
    value: 'measure',
    label: 'Measure',
    tooltip: 'Measure distances',
    icon: MapPin,
  },
  {
    value: 'select',
    label: 'Select',
    tooltip: 'Select and move antennas',
    icon: MousePointer,
  },
  {
    value: 'multiselect',
    label: 'Multi-Select',
    tooltip: 'Select multiple antennas',
    icon: Target,
  },
]
