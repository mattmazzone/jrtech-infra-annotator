<template>
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
        style="max-width: 100%; max-height: 85vh; height: auto; touch-action: none; display: block"
      ></canvas>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Label } from '@/components/ui/label'
import { ImagePlus, Upload } from 'lucide-vue-next'
import { useCanvasStore } from '@/stores/canvas'
import { useImageStore } from '@/stores/image'
import { useAnnotationsStore } from '@/stores/annotations'
import { useToolsStore } from '@/stores/tools'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import { setupCanvasEventListeners, resizeCanvasToImage } from '@/utils/canvas-helpers'
import { isPointInRect } from '@/utils/geometry'
import { useSettingsStore } from '@/stores/settings'
import { GridSnapper } from '@/utils/grid-snapping'

const settingsStore = useSettingsStore()
const { gridSnap } = storeToRefs(settingsStore)

const gridSnapper = new GridSnapper(gridSnap.value)

// Watch for settings changes and update snapper
watch(
  gridSnap,
  (newSettings) => {
    gridSnapper.updateSettings(newSettings)
  },
  { deep: true },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Store instances
const canvasStore = useCanvasStore()
const imageStore = useImageStore()
const annotationsStore = useAnnotationsStore()
const toolsStore = useToolsStore()

// Canvas renderer
const { draw, setDrawingState, setPerimeterPreview } = useCanvasRenderer()

// Get reactive refs from stores
const { uploadedImageUrl, image } = storeToRefs(imageStore)
const { currentTool } = storeToRefs(toolsStore)
const { perimeter, antennas, selectedAntennas, selectionBox } = storeToRefs(annotationsStore)

// Drawing state
let draggingAntenna: { idx: number; offsetX: number; offsetY: number } | null = null
let draggingSelectedGroup: {
  startX: number
  startY: number
  antennaPositions: { id: number; x: number; y: number }[]
} | null = null
let tempStartPoint: { x: number; y: number } | null = null

// ID counters
let zoneIdCounter = 1
let measureIdCounter = 1

// Helper function to find antenna at position
function hitTestAntenna(x: number, y: number) {
  for (let i = antennas.value.length - 1; i >= 0; i--) {
    const a = antennas.value[i]
    if (Math.hypot(a.x - x, a.y - y) < 8) return i
  }
  return null
}

// Pointer event handlers
function onPointerDown(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = canvasStore.getCanvasCoords(e)
  canvasRef.value.setPointerCapture?.(e.pointerId)

  if (currentTool.value === 'perimeter') {
    // Check if clicking near first point to close perimeter
    if (perimeter.value.points.length >= 3) {
      const firstPoint = perimeter.value.points[0]
      const distToFirst = Math.hypot(x - firstPoint.x, y - firstPoint.y)
      if (distToFirst < 15) {
        annotationsStore.closePerimeter()
        setPerimeterPreview(null, false)
        draw()
        return
      }
    }
    annotationsStore.addPerimeterPoint({ x, y })
    draw()
  } else if (currentTool.value === 'scale') {
    tempStartPoint = { x, y }
    setDrawingState(true, { x, y })
  } else if (currentTool.value === 'zone') {
    tempStartPoint = { x, y }
    setDrawingState(true, { x, y })
  } else if (currentTool.value === 'measure') {
    tempStartPoint = { x, y }
    setDrawingState(true, { x, y })
  } else if (currentTool.value === 'antenna') {
    annotationsStore.addAntenna(x, y, zoneIdCounter)
    draw()
  } else if (currentTool.value === 'select') {
    // Try antenna drag
    const idx = hitTestAntenna(x, y)
    if (idx !== null) {
      draggingAntenna = {
        idx,
        offsetX: x - antennas.value[idx].x,
        offsetY: y - antennas.value[idx].y,
      }
    }
  } else if (currentTool.value === 'multiselect') {
    // Check if clicking on a selected antenna to drag the group
    const clickedAntennaIdx = hitTestAntenna(x, y)
    if (
      clickedAntennaIdx !== null &&
      selectedAntennas.value.has(antennas.value[clickedAntennaIdx].id)
    ) {
      // Start dragging the selected group
      draggingSelectedGroup = {
        startX: x,
        startY: y,
        antennaPositions: antennas.value
          .filter((a) => selectedAntennas.value.has(a.id))
          .map((a) => ({ id: a.id, x: a.x, y: a.y })),
      }
    } else {
      // Start drawing selection box
      annotationsStore.selectionBox = { start: { x, y }, end: { x, y }, active: true }
      annotationsStore.clearSelection()
    }
  }
}

function onPointerMove(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = canvasStore.getCanvasCoords(e)

  if (
    currentTool.value === 'perimeter' &&
    perimeter.value.points.length > 0 &&
    !perimeter.value.closed
  ) {
    // Check if mouse is near first point for closing
    let highlight = false
    if (perimeter.value.points.length >= 3) {
      const firstPoint = perimeter.value.points[0]
      const distToFirst = Math.hypot(x - firstPoint.x, y - firstPoint.y)
      highlight = distToFirst < 15
    }
    setPerimeterPreview({ x, y }, highlight)
    draw()
  } else if (draggingAntenna) {
    const antenna = antennas.value[draggingAntenna.idx]
    annotationsStore.updateAntennaPosition(
      antenna.id,
      x - draggingAntenna.offsetX,
      y - draggingAntenna.offsetY,
    )
    draw()
  } else if (currentTool.value === 'multiselect') {
    if (selectionBox.value.active && selectionBox.value.start) {
      annotationsStore.selectionBox = {
        start: selectionBox.value.start,
        end: { x, y },
        active: true,
      }
      draw()
    } else if (draggingSelectedGroup) {
      const deltaX = x - draggingSelectedGroup.startX
      const deltaY = y - draggingSelectedGroup.startY

      antennas.value.forEach((antenna) => {
        if (selectedAntennas.value.has(antenna.id)) {
          const originalPos = draggingSelectedGroup!.antennaPositions.find(
            (p) => p.id === antenna.id,
          )
          if (originalPos) {
            annotationsStore.updateAntennaPosition(
              antenna.id,
              originalPos.x + deltaX,
              originalPos.y + deltaY,
            )
          }
        }
      })
      draw()
    }
  } else if (currentTool.value === 'measure' && tempStartPoint) {
    // Apply grid snapping for measure tool
    const snapResult = gridSnapper.snapLine(tempStartPoint.x, tempStartPoint.y, x, y)
    setDrawingState(true, undefined, { x: snapResult.x, y: snapResult.y })
    draw()
  } else if (
    // Only update drawing state for other drawing tools
    currentTool.value === 'scale' ||
    currentTool.value === 'zone'
  ) {
    setDrawingState(true, undefined, { x, y })
    draw()
  }
}

function onPointerUp(e: PointerEvent) {
  if (!canvasRef.value) return
  const { x, y } = canvasStore.getCanvasCoords(e)
  canvasRef.value.releasePointerCapture?.(e.pointerId)

  if (currentTool.value === 'scale') {
    if (tempStartPoint) {
      annotationsStore.setScaleLine(tempStartPoint, { x, y })
    }
    setDrawingState(false)
  } else if (currentTool.value === 'zone') {
    if (tempStartPoint) {
      const w = x - tempStartPoint.x
      const h = y - tempStartPoint.y
      annotationsStore.addZone(tempStartPoint.x, tempStartPoint.y, w, h)
    }
    setDrawingState(false)
  } else if (currentTool.value === 'measure') {
    if (tempStartPoint) {
      // Apply final snapping when creating the measure
      const snapResult = gridSnapper.snapLine(tempStartPoint.x, tempStartPoint.y, x, y)
      annotationsStore.addMeasure(tempStartPoint, { x: snapResult.x, y: snapResult.y })
    }
    setDrawingState(false)
  } else if (
    currentTool.value === 'multiselect' &&
    selectionBox.value.active &&
    selectionBox.value.start &&
    selectionBox.value.end
  ) {
    const antennasInRect = antennas.value.filter((antenna) =>
      isPointInRect(antenna.x, antenna.y, selectionBox.value.start!, selectionBox.value.end!),
    )
    annotationsStore.selectedAntennas = new Set(antennasInRect.map((a) => a.id))
    annotationsStore.selectionBox = { active: false }
  }

  tempStartPoint = null
  draggingAntenna = null
  draggingSelectedGroup = null
  setPerimeterPreview(null, false)
  draw()
}

// Double click to close perimeter
function onDblClick() {
  if (currentTool.value === 'perimeter' && perimeter.value.points.length >= 3) {
    annotationsStore.closePerimeter()
    draw()
  }
}

// Add keyboard shortcut for toggling grid snap
function onKeyDown(e: KeyboardEvent) {
  if (currentTool.value === 'multiselect' && selectedAntennas.value.size > 0) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      annotationsStore.deleteSelectedAntennas()
      draw()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      annotationsStore.clearSelection()
      draw()
    }
  }

  // Toggle grid snap with 'G' key
  if (e.key === 'g' || e.key === 'G') {
    e.preventDefault()
    settingsStore.toggleGridSnap()
  }
}

// Set up canvas and event listeners
onMounted(() => {
  if (!canvasRef.value) return

  canvasStore.initCanvas(canvasRef.value)

  // Set up image loading handler
  if (uploadedImageUrl.value) {
    image.value.onload = () => {
      if (canvasRef.value) {
        resizeCanvasToImage(canvasRef.value, image.value)
        draw()
      }
    }
    if (image.value.complete) {
      resizeCanvasToImage(canvasRef.value, image.value)
      draw()
    }
  }

  // Set up event listeners
  const cleanup = setupCanvasEventListeners(canvasRef.value, {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDblClick,
  })

  document.addEventListener('keydown', onKeyDown)

  // Cleanup function
  onBeforeUnmount(() => {
    cleanup()
    document.removeEventListener('keydown', onKeyDown)
  })
})

onBeforeUnmount(() => {
  // Cleanup is handled in the onMounted cleanup function
})
</script>
