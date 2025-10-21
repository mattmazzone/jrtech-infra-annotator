import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)

  // Pan and zoom state
  const panX = ref(0)
  const panY = ref(0)
  const zoom = ref(1)

  // Zoom constraints
  const MIN_ZOOM = 1
  const MAX_ZOOM = 10

  const initCanvas = (canvas: HTMLCanvasElement) => {
    canvasRef.value = canvas
    ctx.value = canvas.getContext('2d')
  }

  // Convert screen coordinates to canvas coordinates (accounting for pan/zoom)
  const getCanvasCoords = (e: PointerEvent | MouseEvent) => {
    if (!canvasRef.value) return { x: 0, y: 0 }
    const rect = canvasRef.value.getBoundingClientRect()
    const scaleX = canvasRef.value.width / rect.width
    const scaleY = canvasRef.value.height / rect.height

    const screenX = (('clientX' in e ? e.clientX : (e as any).x) - rect.left) * scaleX
    const screenY = (('clientY' in e ? e.clientY : (e as any).y) - rect.top) * scaleY

    // Convert screen coordinates to world coordinates
    return {
      x: (screenX - panX.value) / zoom.value,
      y: (screenY - panY.value) / zoom.value,
    }
  }

  // Apply current transform to canvas context
  const applyTransform = () => {
    if (!ctx.value) return
    ctx.value.setTransform(zoom.value, 0, 0, zoom.value, panX.value, panY.value)
  }

  // Reset transform
  const resetTransform = () => {
    if (!ctx.value) return
    ctx.value.setTransform(1, 0, 0, 1, 0, 0)
  }

  // Pan the canvas with optional bounds checking
  const pan = (deltaX: number, deltaY: number, imageWidth?: number, imageHeight?: number) => {
    if (!canvasRef.value) return

    // Calculate new pan values
    const newPanX = panX.value + deltaX
    const newPanY = panY.value + deltaY

    // If no image dimensions provided, pan without bounds
    if (!imageWidth || !imageHeight) {
      panX.value = newPanX
      panY.value = newPanY
      return
    }

    // Calculate bounds - prevent panning away from image entirely
    const canvasWidth = canvasRef.value.width
    const canvasHeight = canvasRef.value.height
    const scaledImageWidth = imageWidth * zoom.value
    const scaledImageHeight = imageHeight * zoom.value

    // If image is smaller than canvas, center it and don't allow panning
    if (scaledImageWidth <= canvasWidth && scaledImageHeight <= canvasHeight) {
      panX.value = (canvasWidth - scaledImageWidth) / 2
      panY.value = (canvasHeight - scaledImageHeight) / 2
      return
    }

    // Calculate max/min pan values to keep image filling the viewport
    let maxPanX: number, minPanX: number, maxPanY: number, minPanY: number

    if (scaledImageWidth <= canvasWidth) {
      // Image width fits in canvas - center horizontally
      maxPanX = minPanX = (canvasWidth - scaledImageWidth) / 2
    } else {
      // Image is wider - allow panning but keep edges within view
      maxPanX = 0 // Left edge of image can't go past left edge of canvas
      minPanX = canvasWidth - scaledImageWidth // Right edge of image can't go past right edge of canvas
    }

    if (scaledImageHeight <= canvasHeight) {
      // Image height fits in canvas - center vertically
      maxPanY = minPanY = (canvasHeight - scaledImageHeight) / 2
    } else {
      // Image is taller - allow panning but keep edges within view
      maxPanY = 0 // Top edge of image can't go past top edge of canvas
      minPanY = canvasHeight - scaledImageHeight // Bottom edge of image can't go past bottom edge of canvas
    }

    // Apply bounds
    panX.value = Math.max(minPanX, Math.min(maxPanX, newPanX))
    panY.value = Math.max(minPanY, Math.min(maxPanY, newPanY))
  }

  // Apply bounds to current pan position (useful after zoom)
  const clampPan = (imageWidth: number, imageHeight: number) => {
    pan(0, 0, imageWidth, imageHeight)
  }

  // Zoom at a specific point with smooth scaling
  const zoomAt = (
    screenX: number,
    screenY: number,
    delta: number,
    imageWidth?: number,
    imageHeight?: number,
  ) => {
    if (!canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const scaleX = canvasRef.value.width / rect.width
    const scaleY = canvasRef.value.height / rect.height

    const canvasScreenX = screenX * scaleX
    const canvasScreenY = screenY * scaleY

    // Calculate world position before zoom
    const worldX = (canvasScreenX - panX.value) / zoom.value
    const worldY = (canvasScreenY - panY.value) / zoom.value

    // Update zoom with clamping
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * delta))

    // Only update if zoom actually changed
    if (newZoom !== zoom.value) {
      zoom.value = newZoom

      // Adjust pan to keep the world position under the cursor
      panX.value = canvasScreenX - worldX * zoom.value
      panY.value = canvasScreenY - worldY * zoom.value

      // Apply bounds if image dimensions provided
      if (imageWidth && imageHeight) {
        clampPan(imageWidth, imageHeight)
      }
    }
  }

  // Reset pan and zoom
  const resetView = () => {
    panX.value = 0
    panY.value = 0
    zoom.value = 1
  }

  // Fit canvas to view
  const fitToView = (imageWidth: number, imageHeight: number) => {
    if (!canvasRef.value) return

    const rect = canvasRef.value.getBoundingClientRect()
    const padding = 40

    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - padding * 2

    const scaleX = availableWidth / imageWidth
    const scaleY = availableHeight / imageHeight

    zoom.value = Math.min(scaleX, scaleY, 1)

    // Center the image
    panX.value = (rect.width * (canvasRef.value.width / rect.width) - imageWidth * zoom.value) / 2
    panY.value =
      (rect.height * (canvasRef.value.height / rect.height) - imageHeight * zoom.value) / 2
  }

  return {
    canvasRef,
    ctx,
    panX,
    panY,
    zoom,
    initCanvas,
    getCanvasCoords,
    applyTransform,
    resetTransform,
    pan,
    clampPan,
    zoomAt,
    resetView,
    fitToView,
  }
})
