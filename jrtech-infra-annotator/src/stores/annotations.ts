import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
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

  // Helper function to determine antenna placement rules based on zone parameters
  const getAntennaPlacementRules = (ceilingHeight: number, shelfHeight: number) => {
    if (ceilingHeight <= 3 && shelfHeight <= 2.1) {
      const maxDistance = Math.max(10, 12) // Use the larger of horizontal/vertical
      return {
        maxHorizontalDistance: 10, // meters
        maxVerticalDistance: 12, // meters
        maxHorizontalWallDistance: 5, // meters
        maxVerticalWallDistance: 6, // meters
        coverageRadius: (maxDistance / 2) * 1.15, // meters - 1.15x radius
      }
    } else if (ceilingHeight >= 4 && shelfHeight <= 2.1) {
      const maxDistance = Math.max(12, 14) // Use the larger of horizontal/vertical
      return {
        maxHorizontalDistance: 12, // meters
        maxVerticalDistance: 14, // meters
        maxHorizontalWallDistance: 6, // meters
        maxVerticalWallDistance: 7, // meters
        coverageRadius: (maxDistance / 2) * 1.15, // meters - 1.15x radius
      }
    }

    // Default case (fallback)
    const maxDistance = Math.max(10, 12)
    return {
      maxHorizontalDistance: 10,
      maxVerticalDistance: 12,
      maxHorizontalWallDistance: 5,
      maxVerticalWallDistance: 6,
      coverageRadius: (maxDistance / 2) * 1.15, // meters - 1.15x radius
    }
  }

  // Helper function to check if a position respects distance rules from all existing antennas
  const isPositionValid = (x: number, y: number, rules: any, metersPerPixel: number) => {
    const maxHorizontalPx = rules.maxHorizontalDistance / metersPerPixel
    const maxVerticalPx = rules.maxVerticalDistance / metersPerPixel

    // Check distance from all existing antennas (in all zones)
    for (const antenna of antennas) {
      const horizontalDistance = Math.abs(x - antenna.x)
      const verticalDistance = Math.abs(y - antenna.y)

      if (horizontalDistance < maxHorizontalPx * 0.8 && verticalDistance < maxVerticalPx * 0.8) {
        const euclideanDistance = Math.hypot(horizontalDistance, verticalDistance)
        const minDistance = Math.min(maxHorizontalPx, maxVerticalPx) * 0.8
        if (euclideanDistance < minDistance) {
          return false
        }
      }
    }
    return true
  }

  // Helper function to check distance from perimeter walls
  const isWithinWallDistanceLimit = (x: number, y: number, rules: any, metersPerPixel: number) => {
    if (!perimeter.closed || perimeter.points.length < 3) return true

    const maxHorizontalWallPx = rules.maxHorizontalWallDistance / metersPerPixel
    const maxVerticalWallPx = rules.maxVerticalWallDistance / metersPerPixel

    const distanceToPerimeter = getDistanceToPerimeter(x, y, perimeter.points, perimeter.closed)

    // Use the more restrictive wall distance limit
    const maxWallDistance = Math.min(maxHorizontalWallPx, maxVerticalWallPx)

    return distanceToPerimeter <= maxWallDistance
  }

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

  // Zone methods - Updated to use ceiling_height and shelf_height
  const addZone = (
    x: number,
    y: number,
    w: number,
    h: number,
    ceilingHeight = 3,
    shelfHeight = 2.1,
  ) => {
    const colorIndex = zones.length % zoneColors.length
    const rules = getAntennaPlacementRules(ceilingHeight, shelfHeight)

    zones.push({
      id: zoneIdCounter++,
      x,
      y,
      w,
      h,
      label: `Zone ${zones.length + 1}`,
      ceilingHeight,
      shelfHeight,
      coverageRadius: rules.coverageRadius,
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

  // Update zone parameters
  const updateZoneParameters = (zoneId: number, ceilingHeight: number, shelfHeight: number) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (zone) {
      zone.ceilingHeight = ceilingHeight
      zone.shelfHeight = shelfHeight
      // Update coverage radius based on new parameters
      const rules = getAntennaPlacementRules(ceilingHeight, shelfHeight)
      zone.coverageRadius = rules.coverageRadius
    }
  }

  // Toggle coverage display for a zone
  const toggleZoneCoverage = (zoneId: number) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (zone) {
      zone.showCoverage = !zone.showCoverage
    }
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

  // Complex operations - Updated with new logic
  const populateAntennasInZone = (zoneId: number) => {
    const zone = zones.find((z) => z.id === zoneId)
    if (!zone || !metersPerPx.value) return

    // Get placement rules for this zone
    const rules = getAntennaPlacementRules(zone.ceilingHeight, zone.shelfHeight)

    // Remove existing antennas in this zone only
    for (let i = antennas.length - 1; i >= 0; i--) {
      if (antennas[i].zoneId === zoneId) {
        antennas.splice(i, 1)
      }
    }

    // Convert distances to pixels - use conservative spacing
    const spacingXPx = (rules.maxHorizontalDistance * 0.8) / metersPerPx.value
    const spacingYPx = (rules.maxVerticalDistance * 0.8) / metersPerPx.value

    // Simple grid generation
    const startX = zone.x + spacingXPx / 2
    const startY = zone.y + spacingYPx / 2

    for (let x = startX; x < zone.x + zone.w; x += spacingXPx) {
      for (let y = startY; y < zone.y + zone.h; y += spacingYPx) {
        // Basic checks only
        const roundedX = Math.round(x)
        const roundedY = Math.round(y)

        // Check if within perimeter
        if (!isPointInPerimeter(roundedX, roundedY, perimeter.points, perimeter.closed)) {
          continue
        }

        // Check minimum distance from perimeter walls
        const distToWall = getDistanceToPerimeter(
          roundedX,
          roundedY,
          perimeter.points,
          perimeter.closed,
        )
        const minWallDistance =
          Math.min(rules.maxHorizontalWallDistance, rules.maxVerticalWallDistance) /
          metersPerPx.value

        if (distToWall < minWallDistance * 0.5) {
          continue
        }

        // Check distance from existing antennas (simple approach)
        let tooClose = false
        const minDistancePx = Math.min(spacingXPx, spacingYPx) * 0.7

        for (const existingAntenna of antennas) {
          const distance = Math.hypot(roundedX - existingAntenna.x, roundedY - existingAntenna.y)
          if (distance < minDistancePx) {
            tooClose = true
            break
          }
        }

        if (!tooClose) {
          addAntenna(roundedX, roundedY, zoneId)
        }
      }
    }
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

  const importData = (data: any) => {
    try {
      // Validate the imported data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format')
      }

      // Clear existing data
      clearPerimeter()
      zones.length = 0
      antennas.length = 0
      measures.length = 0
      clearSelection()

      // Reset counters to avoid ID conflicts
      let maxZoneId = 0
      let maxAntennaId = 0
      let maxMeasureId = 0

      // Import perimeter
      if (data.perimeter) {
        if (Array.isArray(data.perimeter.points)) {
          perimeter.points.push(...data.perimeter.points)
        }
        if (data.perimeter.closed) {
          perimeter.closed = data.perimeter.closed
        }
      }

      // Import scale
      if (data.scale) {
        if (data.scale.start) scaleLine.start = data.scale.start
        if (data.scale.end) scaleLine.end = data.scale.end
        if (data.scale.meters) scaleLine.meters = data.scale.meters
      }

      // Import zones
      if (Array.isArray(data.zones)) {
        data.zones.forEach((zone: any) => {
          if (zone.id && zone.id > maxZoneId) maxZoneId = zone.id
          zones.push({
            id: zone.id || zoneIdCounter++,
            x: zone.x || 0,
            y: zone.y || 0,
            w: zone.w || 100,
            h: zone.h || 100,
            label: zone.label || `Zone ${zones.length + 1}`,
            ceilingHeight: zone.ceilingHeight || 3,
            shelfHeight: zone.shelfHeight || 2.1,
            coverageRadius: zone.coverageRadius || 6,
            showCoverage: zone.showCoverage || false,
            colorIndex: zone.colorIndex || 0,
          })
        })
      }

      // Import antennas
      if (Array.isArray(data.antennas)) {
        data.antennas.forEach((antenna: any) => {
          if (antenna.id && antenna.id > maxAntennaId) maxAntennaId = antenna.id
          antennas.push({
            id: antenna.id || antennaIdCounter++,
            x: antenna.x || 0,
            y: antenna.y || 0,
            label: antenna.label || `A${antennas.length + 1}`,
            zoneId: antenna.zoneId,
          })
        })
      }

      // Import measures
      if (Array.isArray(data.measures)) {
        data.measures.forEach((measure: any) => {
          if (measure.id && measure.id > maxMeasureId) maxMeasureId = measure.id
          measures.push({
            id: measure.id || measureIdCounter++,
            start: measure.start || { x: 0, y: 0 },
            end: measure.end || { x: 0, y: 0 },
          })
        })
      }

      // Update counters to avoid future ID conflicts
      if (maxZoneId >= zoneIdCounter) zoneIdCounter = maxZoneId + 1
      if (maxAntennaId >= antennaIdCounter) antennaIdCounter = maxAntennaId + 1
      if (maxMeasureId >= measureIdCounter) measureIdCounter = maxMeasureId + 1

      return true
    } catch (error) {
      console.error('Error importing data:', error)
      return false
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
    updateZoneParameters,
    toggleZoneCoverage,

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

    // Export/Import
    exportData,
    importData,

    // Utility
    getAntennaPlacementRules,
  }
})
