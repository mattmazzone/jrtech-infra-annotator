import type { Component } from 'vue'

export type Tool = 'perimeter' | 'scale' | 'zone' | 'antenna' | 'measure' | 'select' | 'multiselect'

export interface Point {
  x: number
  y: number
}

export interface Zone {
  id: number
  x: number
  y: number
  w: number
  h: number
  label: string
  ceilingHeight: number
  shelfHeight: number
  coverageRadius: number
  showCoverage: boolean
  colorIndex: number
}

export interface Antenna {
  id: number
  x: number
  y: number
  label: string
  zoneId?: number
}

export interface Measure {
  id: number
  start: Point
  end: Point
}

export interface ScaleLine {
  start?: Point
  end?: Point
  meters?: number
}

export interface Perimeter {
  points: Point[]
  closed: boolean
}

export interface SelectionBox {
  start?: Point
  end?: Point
  active: boolean
}

export interface ToolConfig {
  value: Tool
  label: string
  tooltip: string
  icon: Component
  disabled?: boolean
}
