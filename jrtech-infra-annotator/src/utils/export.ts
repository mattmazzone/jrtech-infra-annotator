export function exportPNG(canvas: HTMLCanvasElement, filename = 'annotated-map.png') {
  const a = document.createElement('a')
  a.download = filename
  a.href = canvas.toDataURL('image/png')
  a.click()
}

export function exportJSON(data: any, filename = 'annotations.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
