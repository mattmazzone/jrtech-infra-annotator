import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)

  const initCanvas = (canvas: HTMLCanvasElement) => {
    canvasRef.value = canvas
    ctx.value = canvas.getContext('2d')
  }

  const getCanvasCoords = (e: PointerEvent | MouseEvent) => {
    if (!canvasRef.value) return { x: 0, y: 0 }
    const rect = canvasRef.value.getBoundingClientRect()
    const scaleX = canvasRef.value.width / rect.width
    const scaleY = canvasRef.value.height / rect.height
    return {
      x: (('clientX' in e ? e.clientX : (e as any).x) - rect.left) * scaleX,
      y: (('clientY' in e ? e.clientY : (e as any).y) - rect.top) * scaleY,
    }
  }

  return {
    canvasRef,
    ctx,
    initCanvas,
    getCanvasCoords,
  }
})
