<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import {
  Square,
  Ruler,
  BoxSelect,
  Antenna,
  MousePointer,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Maximize,
  ImagePlus,
  MousePointer2,
} from 'lucide-vue-next'
import { Icon } from '@iconify/vue'
import { useColorMode } from '@vueuse/core'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Pass { disableTransition: false } to enable transitions
const mode = useColorMode()
type Tool = 'perimeter' | 'scale' | 'zone' | 'antenna' | 'measure' | 'select' | 'multiselect'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const image = new Image()
const uploadedImageUrl = ref<string | null>(null)

const currentTool = ref<Tool>('perimeter')

// Zone colors that alternate
const zoneColors = [
  { stroke: '#10b981', fill: 'rgba(16,185,129,0.08)', text: '#065f46' }, // green
  { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.08)', text: '#1e3a8a' }, // blue
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.08)', text: '#92400e' }, // amber
  { stroke: '#ef4444', fill: 'rgba(239,68,68,0.08)', text: '#991b1b' }, // red
  { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', text: '#5b21b6' }, // violet
  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.08)', text: '#0e7490' }, // cyan
]

// Data
const perimeterPoints = reactive<{ x: number; y: number }[]>([])
const perimeterClosed = ref(false)
const scaleLine = reactive<{
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  meters?: number
}>({})
const zones = reactive<
  {
    id: number
    x: number
    y: number
    w: number
    h: number
    label: string
    maxDist: number
    coverageRadius: number
    showCoverage: boolean
    colorIndex: number
  }[]
>([])
const antennas = reactive<{ id: number; x: number; y: number; label: string; zoneId?: number }[]>(
  [],
)
const measures = reactive<
  { id: number; start: { x: number; y: number }; end: { x: number; y: number } }[]
>([])

// Multi-select state
const selectedAntennas = reactive<Set<number>>(new Set())
const selectionBox = reactive<{
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  active: boolean
}>({ active: false })

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

let zoneIdCounter = 1
let antennaIdCounter = 1
let measureIdCounter = 1

// temporary drawing state
let isDrawing = false
let tempStart: { x: number; y: number } | null = null
let tempEnd: { x: number; y: number } | null = null
let draggingAntenna: { idx: number; offsetX: number; offsetY: number } | null = null
let draggingSelectedGroup: {
  startX: number
  startY: number
  antennaPositions: { id: number; x: number; y: number }[]
} | null = null
let perimeterPreview: { x: number; y: number } | null = null
let highlightFirstPoint = false

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    uploadedImageUrl.value = reader.result as string
    image.src = uploadedImageUrl.value as string
    image.onload = () => {
      if (canvasRef.value) {
        canvasRef.value.width = image.width
        canvasRef.value.height = image.height
        // CSS size is now handled by flexbox/grid layout
        draw()
      }
    }
  }
  reader.readAsDataURL(file)
}

function getCanvasCoords(e: PointerEvent | MouseEvent) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  return {
    x: (('clientX' in e ? e.clientX : (e as any).x) - rect.left) * scaleX,
    y: (('clientY' in e ? e.clientY : (e as any).y) - rect.top) * scaleY,
  }
}

// Multi-select helper functions
function isPointInRect(
  px: number,
  py: number,
  rectStart: { x: number; y: number },
  rectEnd: { x: number; y: number },
) {
  const minX = Math.min(rectStart.x, rectEnd.x)
  const maxX = Math.max(rectStart.x, rectEnd.x)
  const minY = Math.min(rectStart.y, rectEnd.y)
  const maxY = Math.max(rectStart.y, rectEnd.y)
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}

function selectAntennasInRect(
  rectStart: { x: number; y: number },
  rectEnd: { x: number; y: number },
) {
  selectedAntennas.clear()
  antennas.forEach((antenna) => {
    if (isPointInRect(antenna.x, antenna.y, rectStart, rectEnd)) {
      selectedAntennas.add(antenna.id)
    }
  })
}

function clearSelection() {
  selectedAntennas.clear()
}

function deleteSelectedAntennas() {
  for (let i = antennas.length - 1; i >= 0; i--) {
    if (selectedAntennas.has(antennas[i].id)) {
      antennas.splice(i, 1)
    }
  }
  clearSelection()
  draw()
}

// ---- Interaction handlers (pointer events) ----
function onPointerDown(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = getCanvasCoords(e)
  canvasRef.value.setPointerCapture?.(e.pointerId)

  if (currentTool.value === 'perimeter') {
    // Check if clicking near first point to close perimeter
    if (perimeterPoints.length >= 3) {
      const firstPoint = perimeterPoints[0]
      const distToFirst = Math.hypot(x - firstPoint.x, y - firstPoint.y)
      if (distToFirst < 15) {
        perimeterClosed.value = true
        perimeterPreview = null
        highlightFirstPoint = false
        draw()
        return
      }
    }
    perimeterPoints.push({ x, y })
    draw()
  } else if (currentTool.value === 'scale') {
    isDrawing = true
    tempStart = { x, y }
    tempEnd = null
  } else if (currentTool.value === 'zone') {
    isDrawing = true
    tempStart = { x, y }
    tempEnd = null
  } else if (currentTool.value === 'measure') {
    isDrawing = true
    tempStart = { x, y }
    tempEnd = null
  } else if (currentTool.value === 'antenna') {
    antennas.push({ id: antennaIdCounter++, x, y, label: `A${antennas.length + 1}` })
    draw()
  } else if (currentTool.value === 'select') {
    // try antenna drag
    const idx = hitTestAntenna(x, y)
    if (idx != null) {
      draggingAntenna = { idx, offsetX: x - antennas[idx].x, offsetY: y - antennas[idx].y }
    }
  } else if (currentTool.value === 'multiselect') {
    // Check if clicking on a selected antenna to drag the group
    const clickedAntennaIdx = hitTestAntenna(x, y)
    if (clickedAntennaIdx !== null && selectedAntennas.has(antennas[clickedAntennaIdx].id)) {
      // Start dragging the selected group
      draggingSelectedGroup = {
        startX: x,
        startY: y,
        antennaPositions: antennas
          .filter((a) => selectedAntennas.has(a.id))
          .map((a) => ({ id: a.id, x: a.x, y: a.y })),
      }
    } else {
      // Start drawing selection box
      selectionBox.start = { x, y }
      selectionBox.end = { x, y }
      selectionBox.active = true
      clearSelection()
    }
  }
}

function onPointerMove(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = getCanvasCoords(e)

  if (currentTool.value === 'perimeter' && perimeterPoints.length > 0 && !perimeterClosed.value) {
    perimeterPreview = { x, y }

    // Check if mouse is near first point for closing
    if (perimeterPoints.length >= 3) {
      const firstPoint = perimeterPoints[0]
      const distToFirst = Math.hypot(x - firstPoint.x, y - firstPoint.y)
      highlightFirstPoint = distToFirst < 15
    }
    draw()
  } else if (isDrawing && tempStart) {
    tempEnd = { x, y }
    draw()
    // show preview dynamic (handled in draw)
  } else if (draggingAntenna) {
    const a = antennas[draggingAntenna.idx]
    a.x = x - draggingAntenna.offsetX
    a.y = y - draggingAntenna.offsetY
    draw()
  } else if (currentTool.value === 'multiselect') {
    if (selectionBox.active && selectionBox.start) {
      // Update selection box
      selectionBox.end = { x, y }
      draw()
    } else if (draggingSelectedGroup) {
      // Move all selected antennas
      const deltaX = x - draggingSelectedGroup.startX
      const deltaY = y - draggingSelectedGroup.startY

      antennas.forEach((antenna) => {
        if (selectedAntennas.has(antenna.id)) {
          const originalPos = draggingSelectedGroup!.antennaPositions.find(
            (p) => p.id === antenna.id,
          )
          if (originalPos) {
            antenna.x = originalPos.x + deltaX
            antenna.y = originalPos.y + deltaY
          }
        }
      })
      draw()
    }
  }
}

function onPointerUp(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = getCanvasCoords(e)
  canvasRef.value.releasePointerCapture?.(e.pointerId)

  if (isDrawing && tempStart) {
    tempEnd = tempEnd ?? { x, y }
    if (currentTool.value === 'scale') {
      scaleLine.start = { ...tempStart }
      scaleLine.end = { ...tempEnd }
      // leave scaleLine.meters for user input
    } else if (currentTool.value === 'zone') {
      const w = tempEnd.x - tempStart.x
      const h = tempEnd.y - tempStart.y
      const colorIndex = zones.length % zoneColors.length
      zones.push({
        id: zoneIdCounter++,
        x: tempStart.x,
        y: tempStart.y,
        w,
        h,
        label: `Zone ${zones.length + 1}`,
        maxDist: 3,
        coverageRadius: 2,
        showCoverage: false,
        colorIndex,
      })
    } else if (currentTool.value === 'measure') {
      measures.push({ id: measureIdCounter++, start: { ...tempStart }, end: { ...tempEnd } })
    }
  } else if (
    currentTool.value === 'multiselect' &&
    selectionBox.active &&
    selectionBox.start &&
    selectionBox.end
  ) {
    // Complete selection
    selectAntennasInRect(selectionBox.start, selectionBox.end)
    selectionBox.active = false
    selectionBox.start = undefined
    selectionBox.end = undefined
  }

  // reset temp state
  isDrawing = false
  tempStart = null
  tempEnd = null
  draggingAntenna = null
  draggingSelectedGroup = null
  perimeterPreview = null
  highlightFirstPoint = false
  draw()
}

// double click to close perimeter
function onDblClick() {
  if (currentTool.value === 'perimeter' && perimeterPoints.length >= 3) {
    perimeterClosed.value = true
    draw()
  }
}

// Keyboard shortcuts
function onKeyDown(e: KeyboardEvent) {
  if (currentTool.value === 'multiselect' && selectedAntennas.size > 0) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      deleteSelectedAntennas()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      clearSelection()
      draw()
    }
  }
}

// ---- Helpers ----
function hitTestAntenna(x: number, y: number) {
  for (let i = antennas.length - 1; i >= 0; i--) {
    const a = antennas[i]
    if (Math.hypot(a.x - x, a.y - y) < 8) return i
  }
  return null
}

function deleteZone(id: number) {
  const zi = zones.findIndex((z) => z.id === id)
  if (zi !== -1) zones.splice(zi, 1)
  // remove antennas assigned to this zone
  for (let i = antennas.length - 1; i >= 0; i--) {
    if (antennas[i].zoneId === id) antennas.splice(i, 1)
  }
  draw()
}

function deleteMeasure(id: number) {
  const mi = measures.findIndex((m) => m.id === id)
  if (mi !== -1) measures.splice(mi, 1)
  draw()
}

function changeZoneColor(zoneId: number, direction: number) {
  const zone = zones.find((z) => z.id === zoneId)
  if (!zone) return

  zone.colorIndex = (zone.colorIndex + direction + zoneColors.length) % zoneColors.length
  draw()
}

function isPointInPerimeter(x: number, y: number): boolean {
  if (!perimeterClosed.value || perimeterPoints.length < 3) return true

  // Ray casting algorithm for point-in-polygon
  let inside = false
  for (let i = 0, j = perimeterPoints.length - 1; i < perimeterPoints.length; j = i++) {
    const xi = perimeterPoints[i].x,
      yi = perimeterPoints[i].y
    const xj = perimeterPoints[j].x,
      yj = perimeterPoints[j].y

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function populateAntennasInZone(zoneId: number) {
  const zone = zones.find((z) => z.id === zoneId)
  if (!zone) return
  if (!metersPerPx.value) {
    alert('Please set a scale first (draw scale line and enter meters).')
    return
  }

  // remove existing antennas in this zone
  for (let i = antennas.length - 1; i >= 0; i--)
    if (antennas[i].zoneId === zoneId) antennas.splice(i, 1)

  const spacingPx = zone.maxDist / metersPerPx.value
  const coverageRadiusPx = zone.coverageRadius / metersPerPx.value

  // Generate candidate positions using the actual max distance spacing
  const candidatePositions = []

  // Start from zone corner and use proper spacing grid
  const startX = zone.x + spacingPx / 2
  const startY = zone.y + spacingPx / 2

  for (let x = startX; x < zone.x + zone.w; x += spacingPx) {
    for (let y = startY; y < zone.y + zone.h; y += spacingPx) {
      if (isPointInPerimeter(x, y)) {
        // Check if antenna position is far enough from perimeter edges
        const distanceToPerimeter = getDistanceToPerimeter(x, y)

        // Only consider positions where coverage efficiency is good
        if (distanceToPerimeter >= coverageRadiusPx * 0.7) {
          // Keep 70% of coverage inside
          const efficiency = calculateCoverageEfficiency(x, y, coverageRadiusPx)
          if (efficiency > 0.7) {
            candidatePositions.push({
              x: Math.round(x),
              y: Math.round(y),
              efficiency: efficiency,
              distanceToPerimeter: distanceToPerimeter,
            })
          }
        }
      }
    }
  }

  if (candidatePositions.length === 0) {
    // Fallback: try with relaxed constraints
    for (let x = startX; x < zone.x + zone.w; x += spacingPx) {
      for (let y = startY; y < zone.y + zone.h; y += spacingPx) {
        if (isPointInPerimeter(x, y)) {
          const efficiency = calculateCoverageEfficiency(x, y, coverageRadiusPx)
          if (efficiency > 0.5) {
            // More relaxed efficiency requirement
            candidatePositions.push({
              x: Math.round(x),
              y: Math.round(y),
              efficiency: efficiency,
              distanceToPerimeter: getDistanceToPerimeter(x, y),
            })
          }
        }
      }
    }
  }

  // If still no candidates, place one antenna in the center
  if (candidatePositions.length === 0) {
    const centerX = zone.x + zone.w / 2
    const centerY = zone.y + zone.h / 2
    if (isPointInPerimeter(centerX, centerY)) {
      antennas.push({
        id: antennaIdCounter++,
        x: Math.round(centerX),
        y: Math.round(centerY),
        label: `A${antennas.length + 1}`,
        zoneId,
      })
    }
    draw()
    return
  }

  // Sort by efficiency and distance from perimeter (prefer interior positions)
  candidatePositions.sort((a, b) => {
    const scoreA = a.efficiency * 0.7 + (a.distanceToPerimeter / coverageRadiusPx) * 0.3
    const scoreB = b.efficiency * 0.7 + (b.distanceToPerimeter / coverageRadiusPx) * 0.3
    return scoreB - scoreA
  })

  // Use greedy selection but respect minimum spacing
  const selectedAntennas = []

  for (const candidate of candidatePositions) {
    // Check if this position is too close to already selected antennas
    let tooClose = false
    for (const selected of selectedAntennas) {
      const distance = Math.hypot(candidate.x - selected.x, candidate.y - selected.y)
      const minDistancePx = spacingPx * 0.8 // Allow slight overlap (80% of max distance)
      if (distance < minDistancePx) {
        tooClose = true
        break
      }
    }

    if (!tooClose) {
      selectedAntennas.push(candidate)
    }

    // Stop if we have reasonable coverage
    if (selectedAntennas.length > 25) break
  }

  // Create antenna objects
  selectedAntennas.forEach((pos) => {
    antennas.push({
      id: antennaIdCounter++,
      x: pos.x,
      y: pos.y,
      label: `A${antennas.length + 1}`,
      zoneId,
    })
  })

  draw()
}

// Calculate what percentage of an antenna's coverage circle is inside the perimeter
function calculateCoverageEfficiency(centerX: number, centerY: number, radiusPx: number): number {
  if (!perimeterClosed.value || perimeterPoints.length < 3) return 1.0

  let insidePoints = 0
  let totalPoints = 0

  // Sample points in a circle around the antenna
  const sampleRadius = 8 // Number of sample rings
  const sampleAngles = 16 // Sample points per ring

  for (let ring = 0; ring <= sampleRadius; ring++) {
    const currentRadius = (ring / sampleRadius) * radiusPx
    const pointsInRing = ring === 0 ? 1 : sampleAngles

    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * 2 * Math.PI
      const x = centerX + currentRadius * Math.cos(angle)
      const y = centerY + currentRadius * Math.sin(angle)

      totalPoints++
      if (isPointInPerimeter(x, y)) {
        insidePoints++
      }
    }
  }

  return totalPoints > 0 ? insidePoints / totalPoints : 0
}

// Calculate distance from a point to the nearest perimeter edge
function getDistanceToPerimeter(x: number, y: number): number {
  if (!perimeterClosed.value || perimeterPoints.length < 3) return 1000 // Large number if no perimeter

  let minDistance = Infinity

  // Check distance to each edge of the perimeter polygon
  for (let i = 0; i < perimeterPoints.length; i++) {
    const p1 = perimeterPoints[i]
    const p2 = perimeterPoints[(i + 1) % perimeterPoints.length]

    const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y)
    minDistance = Math.min(minDistance, distance)
  }

  return minDistance
}

// Calculate shortest distance from point to line segment
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)

  if (length === 0) return Math.hypot(px - x1, py - y1)

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)))
  const projectionX = x1 + t * dx
  const projectionY = y1 + t * dy

  return Math.hypot(px - projectionX, py - projectionY)
}

function exportPNG() {
  if (!canvasRef.value) return
  const a = document.createElement('a')
  a.download = 'annotated-map.png'
  a.href = canvasRef.value.toDataURL('image/png')
  a.click()
}

function exportJSON() {
  const payload = {
    perimeter: { points: [...perimeterPoints], closed: perimeterClosed.value },
    scale: { start: scaleLine.start, end: scaleLine.end, meters: scaleLine.meters },
    zones: [...zones],
    antennas: [...antennas],
    measures: [...measures],
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'annotations.json'
  a.click()
}

// ---- Drawing ----
function draw() {
  console.log('Drawing...')
  if (!ctx.value || !canvasRef.value) return
  const canvas = canvasRef.value
  ctx.value.clearRect(0, 0, canvas.width, canvas.height)
  if (uploadedImageUrl.value) ctx.value.drawImage(image, 0, 0)

  // perimeter
  if (perimeterPoints.length > 0) {
    ctx.value.save()
    ctx.value.lineWidth = 3
    ctx.value.lineJoin = 'round'
    ctx.value.lineCap = 'round'
    ctx.value.strokeStyle = '#e11d48'
    ctx.value.beginPath()
    ctx.value.moveTo(perimeterPoints[0].x, perimeterPoints[0].y)
    for (let i = 1; i < perimeterPoints.length; i++)
      ctx.value.lineTo(perimeterPoints[i].x, perimeterPoints[i].y)
    if (perimeterClosed.value) ctx.value.closePath()
    ctx.value.stroke()

    // perimeter preview line while drawing
    if (perimeterPreview && !perimeterClosed.value) {
      ctx.value.setLineDash([4, 4])
      ctx.value.lineWidth = 2
      ctx.value.strokeStyle = '#f87171'
      ctx.value.beginPath()
      ctx.value.moveTo(
        perimeterPoints[perimeterPoints.length - 1].x,
        perimeterPoints[perimeterPoints.length - 1].y,
      )
      ctx.value.lineTo(perimeterPreview.x, perimeterPreview.y)
      ctx.value.stroke()
      ctx.value.setLineDash([])
    }

    // points
    perimeterPoints.forEach((p, i) => {
      ctx.value.beginPath()
      ctx.value.arc(p.x, p.y, highlightFirstPoint && i === 0 ? 8 : 5, 0, Math.PI * 2)
      ctx.value.fillStyle = highlightFirstPoint && i === 0 ? '#fbbf24' : '#e11d48'
      ctx.value.fill()
      if (highlightFirstPoint && i === 0) {
        ctx.value.strokeStyle = '#f59e0b'
        ctx.value.lineWidth = 2
        ctx.value.stroke()
      }
    })
    ctx.value.restore()
  }

  // scale (final)
  if (scaleLine.start && scaleLine.end) {
    ctx.value.save()
    ctx.value.lineWidth = 3
    ctx.value.strokeStyle = '#0ea5e9'
    ctx.value.beginPath()
    ctx.value.moveTo(scaleLine.start.x, scaleLine.start.y)
    ctx.value.lineTo(scaleLine.end.x, scaleLine.end.y)
    ctx.value.stroke()
    ctx.value.fillStyle = '#0ea5e9'
    ctx.value.font = '14px sans-serif'
    const pxDist = Math.hypot(
      scaleLine.end.x - scaleLine.start.x,
      scaleLine.end.y - scaleLine.start.y,
    )
    const metersStr = scaleLine.meters ? `${scaleLine.meters} m` : '? m'
    ctx.value.fillText(
      `${pxDist.toFixed(1)} px = ${metersStr}`,
      (scaleLine.start.x + scaleLine.end.x) / 2 + 6,
      (scaleLine.start.y + scaleLine.end.y) / 2 - 6,
    )
    ctx.value.restore()
  }

  // scale (preview while drawing)
  if (isDrawing && tempStart && tempEnd && currentTool.value === 'scale') {
    ctx.value.save()
    ctx.value.setLineDash([6, 4])
    ctx.value.lineWidth = 2
    ctx.value.strokeStyle = '#60a5fa'
    ctx.value.beginPath()
    ctx.value.moveTo(tempStart.x, tempStart.y)
    ctx.value.lineTo(tempEnd.x, tempEnd.y)
    ctx.value.stroke()
    ctx.value.restore()
  }

  // zone preview while drawing
  if (isDrawing && tempStart && tempEnd && currentTool.value === 'zone') {
    const w = tempEnd.x - tempStart.x
    const h = tempEnd.y - tempStart.y
    const colorIndex = zones.length % zoneColors.length
    const colors = zoneColors[colorIndex]

    ctx.value.save()
    ctx.value.setLineDash([6, 4])
    ctx.value.lineWidth = 2
    ctx.value.strokeStyle = colors.stroke
    ctx.value.strokeRect(tempStart.x, tempStart.y, w, h)
    ctx.value.fillStyle = colors.fill
    ctx.value.fillRect(tempStart.x, tempStart.y, w, h)
    ctx.value.fillStyle = colors.text
    ctx.value.font = '13px sans-serif'
    ctx.value.fillText(`Zone ${zones.length + 1} (preview)`, tempStart.x + 6, tempStart.y + 16)
    ctx.value.restore()
  }

  // zones (finalized)
  zones.forEach((z) => {
    console.log(`Zone ${z.id}:`, {
      showCoverage: z.showCoverage,
      metersPerPx: metersPerPx.value,
      coverageRadius: z.coverageRadius,
      antennasInZone: antennas.filter((a) => a.zoneId === z.id).length,
    })
    const colors = zoneColors[z.colorIndex]

    ctx.value.save()

    if (perimeterClosed.value && perimeterPoints.length >= 3) {
      // Clip zone drawing to perimeter
      ctx.value.beginPath()
      ctx.value.moveTo(perimeterPoints[0].x, perimeterPoints[0].y)
      for (let i = 1; i < perimeterPoints.length; i++) {
        ctx.value.lineTo(perimeterPoints[i].x, perimeterPoints[i].y)
      }
      ctx.value.closePath()
      ctx.value.clip()
    }

    ctx.value.lineWidth = 2
    ctx.value.strokeStyle = colors.stroke
    ctx.value.strokeRect(z.x, z.y, z.w, z.h)
    ctx.value.fillStyle = colors.fill
    ctx.value.fillRect(z.x, z.y, z.w, z.h)

    ctx.value.restore()

    // Draw label outside of clipping
    ctx.value.save()
    ctx.value.fillStyle = colors.text
    ctx.value.font = '13px sans-serif'
    ctx.value.fillText(`${z.label} (max ${z.maxDist} m)`, z.x + 6, z.y + 16)

    // coverage circles
    if (z.showCoverage && metersPerPx.value) {
      const zoneAntennas = antennas.filter((a) => a.zoneId === z.id)
      if (zoneAntennas.length > 0) {
        ctx.value.fillStyle = 'rgba(59,130,246,0.12)'
        ctx.value.strokeStyle = 'rgba(59,130,246,0.5)'
        ctx.value.lineWidth = 1
        zoneAntennas.forEach((a) => {
          const radiusPx = z.coverageRadius / metersPerPx.value
          ctx.value.beginPath()
          ctx.value.arc(a.x, a.y, radiusPx, 0, Math.PI * 2)
          ctx.value.fill()
          ctx.value.stroke()
        })
      }
    }
    ctx.value.restore()
  })

  // antennas
  antennas.forEach((a) => {
    ctx.value.save()
    ctx.value.beginPath()
    ctx.value.arc(a.x, a.y, 5, 0, Math.PI * 2)

    // Highlight selected antennas
    const isSelected = selectedAntennas.has(a.id)
    ctx.value.fillStyle = isSelected ? '#facc15' : '#f97316'
    ctx.value.fill()
    ctx.value.lineWidth = isSelected ? 3 : 1
    ctx.value.strokeStyle = isSelected ? '#eab308' : '#7c2d12'
    ctx.value.stroke()

    // Add selection ring for better visibility
    if (isSelected) {
      ctx.value.beginPath()
      ctx.value.arc(a.x, a.y, 8, 0, Math.PI * 2)
      ctx.value.lineWidth = 2
      ctx.value.strokeStyle = '#eab308'
      ctx.value.stroke()
    }

    ctx.value.fillStyle = '#111827'
    ctx.value.font = '12px sans-serif'
    if (a.label) ctx.value.fillText(a.label, a.x + 8, a.y + 4)
    ctx.value.restore()
  })

  // Selection box for multi-select
  if (
    currentTool.value === 'multiselect' &&
    selectionBox.active &&
    selectionBox.start &&
    selectionBox.end
  ) {
    ctx.value.save()
    const startX = selectionBox.start.x
    const startY = selectionBox.start.y
    const endX = selectionBox.end.x
    const endY = selectionBox.end.y
    const w = endX - startX
    const h = endY - startY

    // Selection box fill
    ctx.value.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.value.fillRect(startX, startY, w, h)

    // Selection box border
    ctx.value.strokeStyle = '#3b82f6'
    ctx.value.lineWidth = 2
    ctx.value.setLineDash([5, 5])
    ctx.value.strokeRect(startX, startY, w, h)
    ctx.value.restore()
  }

  // finalized measures
  measures.forEach((m) => {
    ctx.value.save()
    ctx.value.lineWidth = 2
    ctx.value.strokeStyle = '#7c3aed'
    ctx.value.beginPath()
    ctx.value.moveTo(m.start.x, m.start.y)
    ctx.value.lineTo(m.end.x, m.end.y)
    ctx.value.stroke()
    const dx = m.end.x - m.start.x
    const dy = m.end.y - m.start.y
    const meters = metersPerPx.value ? Math.hypot(dx, dy) * metersPerPx.value : null
    ctx.value.fillStyle = '#7c3aed'
    ctx.value.font = '13px sans-serif'
    const label = meters ? `M${m.id}: ${meters.toFixed(2)} m` : `M${m.id}: ? m`
    ctx.value.fillText(label, (m.start.x + m.end.x) / 2 + 6, (m.start.y + m.end.y) / 2 - 6)
    ctx.value.restore()
  })

  // measure preview while drawing
  if (isDrawing && tempStart && tempEnd && currentTool.value === 'measure') {
    ctx.value.save()
    ctx.value.setLineDash([6, 4])
    ctx.value.lineWidth = 2
    ctx.value.strokeStyle = '#a78bfa'
    ctx.value.beginPath()
    ctx.value.moveTo(tempStart.x, tempStart.y)
    ctx.value.lineTo(tempEnd.x, tempEnd.y)
    ctx.value.stroke()
    const dx = tempEnd.x - tempStart.x
    const dy = tempEnd.y - tempStart.y
    const meters = metersPerPx.value ? Math.hypot(dx, dy) * metersPerPx.value : null
    ctx.value.fillStyle = '#a78bfa'
    ctx.value.font = '13px sans-serif'
    const label = meters ? `${meters.toFixed(2)} m` : '? m'
    ctx.value.fillText(label, (tempStart.x + tempEnd.x) / 2 + 6, (tempStart.y + tempEnd.y) / 2 - 6)
    ctx.value.restore()
  }
}

const tools = [
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

onMounted(() => {
  if (!canvasRef.value) return
  ctx.value = canvasRef.value.getContext('2d')
  canvasRef.value.addEventListener('pointerdown', onPointerDown)
  canvasRef.value.addEventListener('pointermove', onPointerMove)
  canvasRef.value.addEventListener('pointerup', onPointerUp)
  canvasRef.value.addEventListener('dblclick', onDblClick)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  if (!canvasRef.value) return
  canvasRef.value.removeEventListener('pointerdown', onPointerDown)
  canvasRef.value.removeEventListener('pointermove', onPointerMove)
  canvasRef.value.removeEventListener('pointerup', onPointerUp)
  canvasRef.value.removeEventListener('dblclick', onDblClick)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <TooltipProvider :delay-duration="100">
    <div class="grid h-screen w-full grid-cols-[240px_1fr_380px] bg-muted/40">
      <aside class="flex h-full flex-col border-r bg-background p-4 gap-4">
        <div class="flex h-16 items-center border-b px-2">
          <h1 class="text-xl font-semibold flex items-center gap-2">
            <img src="/jrtech-on-logo.png" alt="Logo" class="h-7 w-7" />
            InfraAnnotator
          </h1>
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div class="flex flex-col gap-4">
            <Label
              for="file-upload"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
            >
              <Upload class="w-4 h-4 mr-2" />
              {{ uploadedImageUrl ? 'Change Image' : 'Upload Image' }}
            </Label>
            <input
              id="file-upload"
              type="file"
              class="sr-only"
              accept="image/png,image/jpeg"
              @change="handleFileUpload"
            />
            <Separator class="my-1" />

            <div class="flex flex-col gap-3">
              <Tooltip v-for="tool in tools" :key="tool.value">
                <TooltipTrigger as-child>
                  <button
                    type="button"
                    @click="currentTool = tool.value"
                    :class="[
                      'inline-flex items-center justify-start gap-3 h-11 px-4 rounded-md text-sm font-medium border shadow-sm cursor-pointer transition-colors',
                      currentTool === tool.value
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground',
                    ]"
                  >
                    <component :is="tool.icon" class="w-5 h-5" />
                    {{ tool.label }}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{{ tool.tooltip }}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Separator class="my-1" />
            <Button @click="exportPNG" variant="outline" class="justify-start">
              <Download class="w-4 h-4 mr-2" /> Export as PNG
            </Button>
            <Button @click="exportJSON" variant="outline" class="justify-start">
              <Download class="w-4 h-4 mr-2" /> Export as JSON
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline">
                  <Icon
                    icon="radix-icons:moon"
                    class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                  />
                  <Icon
                    icon="radix-icons:sun"
                    class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                  />
                  <span class="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="mode = 'light'"> Light </DropdownMenuItem>
                <DropdownMenuItem @click="mode = 'dark'"> Dark </DropdownMenuItem>
                <DropdownMenuItem @click="mode = 'auto'"> System </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <main class="flex-1 flex items-center justify-center p-8 bg-muted/40 overflow-hidden">
        <div
          v-show="!uploadedImageUrl"
          class="flex flex-col items-center gap-4 text-center p-10 border-2 border-dashed rounded-xl"
        >
          <ImagePlus class="h-24 w-24 text-muted-foreground" />
          <h3 class="text-2xl font-bold tracking-tight">Ready to Annotate?</h3>
          <p class="text-sm text-muted-foreground">Upload a PNG or JPEG map to get started.</p>
          <Label
            for="file-upload"
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 mt-4 cursor-pointer"
          >
            <Upload class="w-4 h-4 mr-2" />
            Upload Map
          </Label>
        </div>
        <div
          v-show="uploadedImageUrl"
          class="border rounded-lg overflow-hidden shadow-lg bg-background"
        >
          <canvas
            ref="canvasRef"
            style="
              max-width: 100%;
              max-height: 85vh;
              height: auto;
              touch-action: none;
              display: block;
            "
          ></canvas>
        </div>
      </main>

      <aside class="flex h-full flex-col border-l bg-background p-4 gap-6 overflow-y-auto">
        <div class="flex h-16 items-center border-b px-2">
          <h2 class="text-xl font-semibold">Properties</h2>
        </div>

        <!-- Multi-select status -->
        <Card v-if="currentTool === 'multiselect' && selectedAntennas.size > 0">
          <CardHeader>
            <CardTitle>Selected Antennas</CardTitle>
            <CardDescription>
              {{ selectedAntennas.size }} antenna{{ selectedAntennas.size > 1 ? 's' : '' }} selected
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex gap-2">
              <Button
                @click="
                  () => {
                    clearSelection()
                    draw()
                  }
                "
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
              <Button @click="deleteSelectedAntennas()" variant="destructive" size="sm">
                <Trash2 class="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Use Delete key or drag to move selected antennas together.
            </p>
          </CardContent>
        </Card>

        <Card v-if="scaleLine.start && scaleLine.end">
          <CardHeader>
            <CardTitle>Map Scale</CardTitle>
            <CardDescription> Enter the real-world length of the line you drew. </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <Label for="scale-meters">Scale Line Length (meters)</Label>
            <Input
              id="scale-meters"
              type="number"
              step="0.01"
              v-model.number="scaleLine.meters"
              @input="draw"
              placeholder="e.g., 10"
            />
            <p class="text-sm text-muted-foreground">
              1 px ≈ {{ metersPerPx ? metersPerPx.toFixed(4) : '?' }} m
            </p>
          </CardContent>
        </Card>

        <div>
          <h3 class="text-lg font-semibold mb-2">Zones</h3>
          <p v-if="!zones.length" class="text-sm text-muted-foreground">
            Use the 'Zone' tool to draw deployment areas.
          </p>
          <Accordion v-else type="multiple" class="w-full" collapsible>
            <AccordionItem v-for="z in zones" :key="z.id" :value="`zone-${z.id}`">
              <AccordionTrigger>
                <div class="flex items-center gap-2 flex-1 mr-4">
                  <div
                    class="w-4 h-4 border border-gray-400 rounded-sm shrink-0"
                    :style="{
                      backgroundColor: zoneColors[z.colorIndex].fill,
                      borderColor: zoneColors[z.colorIndex].stroke,
                    }"
                  ></div>
                  <span class="truncate">{{ z.label }}</span>
                </div>
                <Button @click.stop="deleteZone(z.id)" variant="ghost" size="icon" class="h-7 w-7">
                  <Trash2 class="w-4 h-4 text-destructive" />
                </Button>
              </AccordionTrigger>
              <AccordionContent class="space-y-4 pt-2">
                <div class="space-y-1">
                  <Label :for="`zone-label-${z.id}`">Zone Label</Label>
                  <Input :id="`zone-label-${z.id}`" v-model="z.label" @input="draw()" />
                </div>
                <div class="space-y-1">
                  <Label :for="`zone-maxdist-${z.id}`">Max distance between antennas (m)</Label>
                  <Input
                    :id="`zone-maxdist-${z.id}`"
                    type="number"
                    step="0.1"
                    v-model.number="z.maxDist"
                  />
                </div>
                <div class="space-y-1">
                  <Label :for="`zone-covradius-${z.id}`">Coverage radius per antenna (m)</Label>
                  <Input
                    :id="`zone-covradius-${z.id}`"
                    type="number"
                    step="0.1"
                    v-model.number="z.coverageRadius"
                    @input="draw()"
                  />
                </div>
                <div class="flex items-center space-x-2">
                  <Checkbox
                    :id="`show-coverage-${z.id}`"
                    :checked="z.showCoverage"
                    @click="
                      () => {
                        z.showCoverage = !z.showCoverage
                        console.log('Coverage toggled:', z.showCoverage)
                        draw()
                      }
                    "
                  />
                  <Label :for="`show-coverage-${z.id}`" class="text-sm font-medium leading-none">
                    Show coverage circles
                  </Label>
                </div>
                <div class="flex items-center gap-2">
                  <Label class="text-sm">Color:</Label>
                  <Button
                    @click="changeZoneColor(z.id, -1)"
                    variant="outline"
                    size="icon"
                    class="h-7 w-7"
                    ><ArrowLeft class="w-4 h-4"
                  /></Button>
                  <Button
                    @click="changeZoneColor(z.id, 1)"
                    variant="outline"
                    size="icon"
                    class="h-7 w-7"
                    ><ArrowRight class="w-4 h-4"
                  /></Button>
                </div>
                <Button @click="populateAntennasInZone(z.id)" class="w-full">
                  <Antenna class="w-4 h-4 mr-2" /> Populate Antennas
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <Separator />

        <div>
          <h3 class="text-lg font-semibold mb-2">Antennas</h3>
          <p v-if="!antennas.length" class="text-sm text-muted-foreground">
            Use the 'Add Antenna' tool or populate a zone.
          </p>
          <ul v-else class="space-y-2">
            <li v-for="(a, i) in antennas" :key="a.id" class="flex items-center gap-2 text-sm">
              <Input v-model="a.label" @input="draw()" class="h-8 flex-1" />
              <span v-if="a.zoneId" class="text-xs text-muted-foreground whitespace-nowrap">
                In {{ zones.find((z) => z.id === a.zoneId)?.label || '?' }}
              </span>
              <div
                v-if="selectedAntennas.has(a.id)"
                class="w-2 h-2 bg-yellow-500 rounded-full"
                title="Selected"
              ></div>
              <Button
                @click="
                  () => {
                    selectedAntennas.delete(a.id)
                    antennas.splice(i, 1)
                    draw()
                  }
                "
                variant="ghost"
                size="icon"
                class="h-7 w-7"
              >
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </li>
          </ul>
        </div>
        <Separator />

        <div>
          <h3 class="text-lg font-semibold mb-2">Measurements</h3>
          <p v-if="!measures.length" class="text-sm text-muted-foreground">
            Use the 'Measure' tool to create measurements.
          </p>
          <ul v-else class="space-y-2">
            <li v-for="m in measures" :key="m.id" class="flex items-center justify-between text-sm">
              <div class="flex items-baseline gap-2">
                <span class="font-medium">M{{ m.id }}:</span>
                <span>{{
                  (() => {
                    const dx = m.end.x - m.start.x
                    const dy = m.end.y - m.start.y
                    const meters = metersPerPx ? Math.hypot(dx, dy) * metersPerPx : null
                    return meters ? `${meters.toFixed(2)} m` : '? m'
                  })()
                }}</span>
              </div>
              <Button @click="deleteMeasure(m.id)" variant="ghost" size="icon" class="h-7 w-7">
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </TooltipProvider>
</template>
