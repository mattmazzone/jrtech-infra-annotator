import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { Point, Zone, Antenna, Measure, ScaleLine, Perimeter, SelectionBox } from '@/types'
import { zoneColors } from '@/utils/constants'
import {
  isPointInPerimeter,
  calculateCoverageEfficiency,
  getDistanceToPerimeter,
} from '@/utils/geometry'

export const useAnnotationsStore = defineStore('annotations', () => {
  // Perimeter
  const perimeter = reactive<Perimeter>({
    points: [],
    closed: false,
  })

  // Scale
  const scaleLine = reactive<ScaleLine>({})

  const metersPerPx = computed(() => {
    if (scaleLine.start && scaleLine.end && scaleLine.meters && scaleLine.meters > 0) {
      const dx = scaleLine.end.x - scaleLine.start.x
      const dy = scaleLine.end.y - scaleLine.start.y
      const pxDist = Math.hypot(dx, dy)
      if (pxDist === 0) return null
      return scaleLine.meters / pxDist
    }
    return null
  })

  // Zones
  const zones = reactive<Zone[]>([])
  let zoneIdCounter = 1

  // Antennas
  const antennas = reactive<Antenna[]>([])
  let antennaIdCounter = 1

  // Measurements
  const measures = reactive<Measure[]>([])
  let measureIdCounter = 1

  // Selection
  const selectedAntennas = reactive<Set<number>>(new Set())
  const selectionBox = reactive<SelectionBox>({ active: false })

  // Perimeter methods
  const addPerimeterPoint = (point: Point) => {
    perimeter.points.push(point)
  }

  const closePerimeter = () => {
    perimeter.closed = true
  }

  const clearPerimeter = () => {
    perimeter.points.length = 0
    perimeter.closed = false
  }

  // Scale methods
  const setScaleLine = (start: Point, end: Point) => {
    scaleLine.start = start
    scaleLine.end = end
  }

  const setScaleMeters = (meters: number) => {
    scaleLine.meters = meters
  }

  // Zone methods
  const addZone = (x: number, y: number, w: number, h: number) => {
    const colorIndex = zones.length % zoneColors.length
    zones.push({
      id: zoneIdCounter++,
      x,
      y,
      w,
      h,
      label: `Zone ${zones.length + 1}`,
      maxDist: 3,
      coverageRadius: 2,
      showCoverage: false,
      colorIndex,
    })
  }

  const deleteZone = (id: number) => {
    const index = zones.findIndex((z) => z.id === id)
    if (index !== -1) {
      zones.splice(index, 1)
      // Remove antennas in this zone
      for (let i = antennas.length - 1; i >= 0; i--) {
        if (antennas[i].zoneId === id) {
          antennas.splice(i, 1)
        }
      }
    }
  }

  const changeZoneColor = (zoneId: number, direction: number) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (!zone) return
    zone.colorIndex = (zone.colorIndex + direction + zoneColors.length) % zoneColors.length
  }

  // Antenna methods
  const addAntenna = (x: number, y: number, zoneId?: number) => {
    antennas.push({
      id: antennaIdCounter++,
      x,
      y,
      label: `A${antennas.length + 1}`,
      zoneId,
    })
  }

  const deleteAntenna = (id: number) => {
    const index = antennas.findIndex((a) => a.id === id)
    if (index !== -1) {
      antennas.splice(index, 1)
      selectedAntennas.delete(id)
    }
  }

  const updateAntennaPosition = (id: number, x: number, y: number) => {
    const antenna = antennas.find((a) => a.id === id)
    if (antenna) {
      antenna.x = x
      antenna.y = y
    }
  }

  // Measurement methods
  const addMeasure = (start: Point, end: Point) => {
    measures.push({
      id: measureIdCounter++,
      start,
      end,
    })
  }

  const deleteMeasure = (id: number) => {
    const index = measures.findIndex((m) => m.id === id)
    if (index !== -1) {
      measures.splice(index, 1)
    }
  }

  // Selection methods
  const selectAntenna = (id: number) => {
    selectedAntennas.add(id)
  }

  const deselectAntenna = (id: number) => {
    selectedAntennas.delete(id)
  }

  const clearSelection = () => {
    selectedAntennas.clear()
  }

  const deleteSelectedAntennas = () => {
    for (let i = antennas.length - 1; i >= 0; i--) {
      if (selectedAntennas.has(antennas[i].id)) {
        antennas.splice(i, 1)
      }
    }
    clearSelection()
  }

  // Complex operations
  const populateAntennasInZone = (zoneId: number) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (!zone || !metersPerPx.value) return

    // Remove existing antennas in this zone
    for (let i = antennas.length - 1; i >= 0; i--) {
      if (antennas[i].zoneId === zoneId) {
        antennas.splice(i, 1)
      }
    }

    const spacingPx = zone.maxDist / metersPerPx.value
    const coverageRadiusPx = zone.coverageRadius / metersPerPx.value

    // Generate candidate positions
    const candidatePositions = []
    const startX = zone.x + spacingPx / 2
    const startY = zone.y + spacingPx / 2

    for (let x = startX; x < zone.x + zone.w; x += spacingPx) {
      for (let y = startY; y < zone.y + zone.h; y += spacingPx) {
        if (isPointInPerimeter(x, y, perimeter.points, perimeter.closed)) {
          const distanceToPerimeter = getDistanceToPerimeter(
            x,
            y,
            perimeter.points,
            perimeter.closed,
          )
          if (distanceToPerimeter >= coverageRadiusPx * 0.7) {
            const efficiency = calculateCoverageEfficiency(
              x,
              y,
              coverageRadiusPx,
              perimeter.points,
              perimeter.closed,
            )
            if (efficiency > 0.7) {
              candidatePositions.push({
                x: Math.round(x),
                y: Math.round(y),
                efficiency,
                distanceToPerimeter,
              })
            }
          }
        }
      }
    }

    // Sort and select best positions
    candidatePositions.sort((a, b) => {
      const scoreA = a.efficiency * 0.7 + (a.distanceToPerimeter / coverageRadiusPx) * 0.3
      const scoreB = b.efficiency * 0.7 + (b.distanceToPerimeter / coverageRadiusPx) * 0.3
      return scoreB - scoreA
    })

    const selectedPositions = []
    for (const candidate of candidatePositions) {
      let tooClose = false
      for (const selected of selectedPositions) {
        const distance = Math.hypot(candidate.x - selected.x, candidate.y - selected.y)
        if (distance < spacingPx * 0.8) {
          tooClose = true
          break
        }
      }
      if (!tooClose) {
        selectedPositions.push(candidate)
      }
      if (selectedPositions.length > 25) break
    }

    // Create antennas
    selectedPositions.forEach((pos) => {
      addAntenna(pos.x, pos.y, zoneId)
    })
  }

  // Export functionality
  const exportData = () => {
    return {
      perimeter: { points: [...perimeter.points], closed: perimeter.closed },
      scale: { start: scaleLine.start, end: scaleLine.end, meters: scaleLine.meters },
      zones: [...zones],
      antennas: [...antennas],
      measures: [...measures],
    }
  }

  return {
    // State
    perimeter,
    scaleLine,
    zones,
    antennas,
    measures,
    selectedAntennas,
    selectionBox,
    metersPerPx,

    // Perimeter
    addPerimeterPoint,
    closePerimeter,
    clearPerimeter,

    // Scale
    setScaleLine,
    setScaleMeters,

    // Zones
    addZone,
    deleteZone,
    changeZoneColor,

    // Antennas
    addAntenna,
    deleteAntenna,
    updateAntennaPosition,

    // Measurements
    addMeasure,
    deleteMeasure,

    // Selection
    selectAntenna,
    deselectAntenna,
    clearSelection,
    deleteSelectedAntennas,

    // Complex operations
    populateAntennasInZone,

    // Export
    exportData,
  }
})
