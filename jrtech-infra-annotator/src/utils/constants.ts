import {
  Square,
  Ruler,
  BoxSelect,
  Antenna,
  MousePointer,
  Maximize,
  MousePointer2,
} from 'lucide-vue-next'

// Zone colors that alternate
export const zoneColors = [
  { stroke: '#10b981', fill: 'rgba(16,185,129,0.08)', text: '#065f46' }, // green
  { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.08)', text: '#1e3a8a' }, // blue
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.08)', text: '#92400e' }, // amber
  { stroke: '#ef4444', fill: 'rgba(239,68,68,0.08)', text: '#991b1b' }, // red
  { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', text: '#5b21b6' }, // violet
  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.08)', text: '#0e7490' }, // cyan
]

export const tools = [
  {
    value: 'select',
    label: 'Select / Move',
    icon: MousePointer,
    tooltip: 'Select and move individual antennas.',
  },
  {
    value: 'multiselect',
    label: 'Multi-Select',
    icon: MousePointer2,
    tooltip:
      'Draw a rectangle to select multiple antennas. Drag to move them together. Delete or Escape to clear selection.',
  },
  {
    value: 'perimeter',
    label: 'Perimeter',
    icon: Square,
    tooltip: 'Draw the outer boundary of the area.',
  },
  {
    value: 'scale',
    label: 'Scale',
    icon: Ruler,
    tooltip: 'Draw a line to set the scale in meters.',
  },
  {
    value: 'zone',
    label: 'Zone',
    icon: BoxSelect,
    tooltip: 'Draw rectangular zones for antenna placement.',
  },
  {
    value: 'antenna',
    label: 'Add Antenna',
    icon: Antenna,
    tooltip: 'Manually place individual antennas.',
  },
  {
    value: 'measure',
    label: 'Measure',
    icon: Maximize,
    tooltip: 'Measure distances on the map.',
  },
]
