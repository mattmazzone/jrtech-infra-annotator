export function setupCanvasEventListeners(
  canvas: HTMLCanvasElement,
  handlers: {
    onPointerDown: (e: PointerEvent) => void
    onPointerMove: (e: PointerEvent) => void
    onPointerUp: (e: PointerEvent) => void
    onDblClick: () => void
  },
) {
  canvas.addEventListener('pointerdown', handlers.onPointerDown)
  canvas.addEventListener('pointermove', handlers.onPointerMove)
  canvas.addEventListener('pointerup', handlers.onPointerUp)
  canvas.addEventListener('dblclick', handlers.onDblClick)

  return () => {
    canvas.removeEventListener('pointerdown', handlers.onPointerDown)
    canvas.removeEventListener('pointermove', handlers.onPointerMove)
    canvas.removeEventListener('pointerup', handlers.onPointerUp)
    canvas.removeEventListener('dblclick', handlers.onDblClick)
  }
}

export function resizeCanvasToImage(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  canvas.width = image.width
  canvas.height = image.height
}
