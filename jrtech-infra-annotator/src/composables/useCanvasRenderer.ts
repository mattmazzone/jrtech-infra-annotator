import { useCanvasStore } from '@/stores/canvas'
import { useImageStore } from '@/stores/image'
import { useAnnotationsStore } from '@/stores/annotations'
import { useSettingsStore } from '@/stores/settings'
import { useToolsStore } from '@/stores/tools'
import { zoneColors } from '@/utils/constants'

export function useCanvasRenderer() {
  const canvasStore = useCanvasStore()
  const settingsStore = useSettingsStore()
  const imageStore = useImageStore()
  const annotationsStore = useAnnotationsStore()
  const toolsStore = useToolsStore()

  // Temporary drawing state for previews
  let isDrawing = false
  let tempStart: { x: number; y: number } | null = null
  let tempEnd: { x: number; y: number } | null = null
  let perimeterPreview: { x: number; y: number } | null = null
  let highlightFirstPoint = false

  const setDrawingState = (
    drawing: boolean,
    start?: { x: number; y: number },
    end?: { x: number; y: number },
  ) => {
    isDrawing = drawing
    if (drawing) {
      // When starting to draw, set the start point
      if (start !== undefined) {
        tempStart = start
        tempEnd = start // Initialize end to start
      }
      // Update end point if provided
      if (end !== undefined) {
        tempEnd = end
      }
    } else {
      // When stopping drawing, reset everything
      tempStart = null
      tempEnd = null
    }
  }

  const setPerimeterPreview = (preview: { x: number; y: number } | null, highlight = false) => {
    perimeterPreview = preview
    highlightFirstPoint = highlight
  }

  const draw = (exporting = false) => {
    const ctx = canvasStore.ctx
    const canvas = canvasStore.canvasRef
    if (!ctx || !canvas) return

    // Clear canvas and apply current transform
    ctx.setTransform(1, 0, 0, 1, 0, 0) // reset transform
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvasStore.applyTransform()

    // Draw background image if present
    if (imageStore.uploadedImageUrl) {
      ctx.drawImage(imageStore.image, 0, 0)
    }

    if (exporting) {
      // Only draw items enabled in export settings
      const exportDrawSteps = [
        { enabled: settingsStore.exportOptions.includePerimeter, fn: drawPerimeter },
        { enabled: settingsStore.exportOptions.includeScale, fn: drawScale },
        { enabled: settingsStore.exportOptions.includeZones, fn: drawZones },
        { enabled: settingsStore.exportOptions.includeAntennas, fn: drawAntennas },
        { enabled: settingsStore.exportOptions.includeMeasurements, fn: drawMeasurements },
      ]

      exportDrawSteps.forEach((step) => step.enabled && step.fn(ctx))
    } else {
      // Full drawing flow while editing
      const editDrawSteps = [
        drawPerimeter,
        drawScale,
        drawTempScale,
        drawZones,
        drawTempZone,
        drawAntennas,
        drawSelectionBox,
        drawMeasurements,
        drawTempMeasure,
      ]

      editDrawSteps.forEach((fn) => fn(ctx))
    }
  }

  const drawPerimeter = (ctx: CanvasRenderingContext2D) => {
    const { points, closed } = annotationsStore.perimeter

    if (points.length === 0) return

    ctx.save()
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#e11d48'
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }

    if (closed) ctx.closePath()
    ctx.stroke()

    // Draw perimeter preview line while drawing
    if (perimeterPreview && !closed && points.length > 0) {
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 2
      ctx.strokeStyle = '#f87171'
      ctx.beginPath()
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y)
      ctx.lineTo(perimeterPreview.x, perimeterPreview.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw points
    points.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, highlightFirstPoint && i === 0 ? 8 : 5, 0, Math.PI * 2)
      ctx.fillStyle = highlightFirstPoint && i === 0 ? '#fbbf24' : '#e11d48'
      ctx.fill()
      if (highlightFirstPoint && i === 0) {
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    ctx.restore()
  }

  const drawScale = (ctx: CanvasRenderingContext2D) => {
    const { start, end, meters } = annotationsStore.scaleLine

    if (!start || !end) return

    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#0ea5e9'
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    ctx.fillStyle = '#0ea5e9'
    ctx.font = '14px sans-serif'
    const pxDist = Math.hypot(end.x - start.x, end.y - start.y)
    const metersStr = meters ? `${meters} m` : '? m'
    ctx.fillText(
      `${pxDist.toFixed(1)} px = ${metersStr}`,
      (start.x + end.x) / 2 + 6,
      (start.y + end.y) / 2 - 6,
    )
    ctx.restore()
  }

  const drawTempScale = (ctx: CanvasRenderingContext2D) => {
    if (!isDrawing || !tempStart || !tempEnd || toolsStore.currentTool !== 'scale') return

    ctx.save()
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2
    ctx.strokeStyle = '#60a5fa'
    ctx.beginPath()
    ctx.moveTo(tempStart.x, tempStart.y)
    ctx.lineTo(tempEnd.x, tempEnd.y)
    ctx.stroke()

    // Show preview distance
    ctx.fillStyle = '#60a5fa'
    ctx.font = '13px sans-serif'
    const pxDist = Math.hypot(tempEnd.x - tempStart.x, tempEnd.y - tempStart.y)
    ctx.fillText(
      `${pxDist.toFixed(1)} px`,
      (tempStart.x + tempEnd.x) / 2 + 6,
      (tempStart.y + tempEnd.y) / 2 - 6,
    )
    ctx.restore()
  }

  const drawZones = (ctx: CanvasRenderingContext2D) => {
    annotationsStore.zones.forEach((zone) => {
      const colors = zoneColors[zone.colorIndex]

      ctx.save()

      // Clip to perimeter if closed
      if (annotationsStore.perimeter.closed && annotationsStore.perimeter.points.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(annotationsStore.perimeter.points[0].x, annotationsStore.perimeter.points[0].y)
        for (let i = 1; i < annotationsStore.perimeter.points.length; i++) {
          ctx.lineTo(annotationsStore.perimeter.points[i].x, annotationsStore.perimeter.points[i].y)
        }
        ctx.closePath()
        ctx.clip()
      }

      ctx.lineWidth = 2
      ctx.strokeStyle = colors.stroke
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)
      ctx.fillStyle = colors.fill
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h)

      ctx.restore()

      // Draw label
      ctx.save()
      ctx.fillStyle = colors.text
      ctx.font = '13px sans-serif'
      ctx.fillText(`${zone.label}`, zone.x + 6, zone.y + 16) // TODO: ADD celigingHeight and shelfHeight to label

      // Draw coverage circles
      if (zone.showCoverage && annotationsStore.metersPerPx !== null) {
        const zoneAntennas = annotationsStore.antennas.filter((a) => a.zoneId === zone.id)
        if (zoneAntennas.length > 0) {
          ctx.fillStyle = 'rgba(59,130,246,0.12)'
          ctx.strokeStyle = 'rgba(59,130,246,0.5)'
          ctx.lineWidth = 1
          zoneAntennas.forEach((antenna) => {
            const radiusPx = zone.coverageRadius / annotationsStore.metersPerPx!
            ctx.beginPath()
            ctx.arc(antenna.x, antenna.y, radiusPx, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          })
        }
      }

      ctx.restore()
    })
  }

  const drawTempZone = (ctx: CanvasRenderingContext2D) => {
    if (!isDrawing || !tempStart || !tempEnd || toolsStore.currentTool !== 'zone') return

    const w = tempEnd.x - tempStart.x
    const h = tempEnd.y - tempStart.y
    const colorIndex = annotationsStore.zones.length % zoneColors.length
    const colors = zoneColors[colorIndex]

    ctx.save()
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2
    ctx.strokeStyle = colors.stroke
    ctx.strokeRect(tempStart.x, tempStart.y, w, h)
    ctx.fillStyle = colors.fill.replace('0.2)', '0.1)') // Make preview more transparent
    ctx.fillRect(tempStart.x, tempStart.y, w, h)
    ctx.fillStyle = colors.text
    ctx.font = '13px sans-serif'
    ctx.fillText(
      `Zone ${annotationsStore.zones.length + 1} (preview)`,
      tempStart.x + 6,
      tempStart.y + 16,
    )
    ctx.restore()
  }

  const drawAntennas = (ctx: CanvasRenderingContext2D) => {
    annotationsStore.antennas.forEach((antenna) => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(antenna.x, antenna.y, 5, 0, Math.PI * 2)

      const isSelected = annotationsStore.selectedAntennas.has(antenna.id)
      ctx.fillStyle = isSelected ? '#facc15' : '#f97316'
      ctx.fill()
      ctx.lineWidth = isSelected ? 3 : 1
      ctx.strokeStyle = isSelected ? '#eab308' : '#7c2d12'
      ctx.stroke()

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(antenna.x, antenna.y, 8, 0, Math.PI * 2)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#eab308'
        ctx.stroke()
      }

      ctx.fillStyle = '#111827'
      ctx.font = '12px sans-serif'
      if (antenna.label) {
        ctx.fillText(antenna.label, antenna.x + 8, antenna.y + 4)
      }
      ctx.restore()
    })
  }

  const drawSelectionBox = (ctx: CanvasRenderingContext2D) => {
    if (
      toolsStore.currentTool === 'multiselect' &&
      annotationsStore.selectionBox.active &&
      annotationsStore.selectionBox.start &&
      annotationsStore.selectionBox.end
    ) {
      ctx.save()
      const { start, end } = annotationsStore.selectionBox
      const w = end.x - start.x
      const h = end.y - start.y

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.fillRect(start.x, start.y, w, h)

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(start.x, start.y, w, h)
      ctx.restore()
    }
  }

  const drawMeasurements = (ctx: CanvasRenderingContext2D) => {
    annotationsStore.measures.forEach((measure) => {
      ctx.save()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#7c3aed'
      ctx.beginPath()
      ctx.moveTo(measure.start.x, measure.start.y)
      ctx.lineTo(measure.end.x, measure.end.y)
      ctx.stroke()

      const dx = measure.end.x - measure.start.x
      const dy = measure.end.y - measure.start.y
      const meters = annotationsStore.metersPerPx
        ? Math.hypot(dx, dy) * annotationsStore.metersPerPx
        : null

      ctx.fillStyle = '#7c3aed'
      ctx.font = '13px sans-serif'
      const label = meters ? `M${measure.id}: ${meters.toFixed(2)} m` : `M${measure.id}: ? m`
      ctx.fillText(
        label,
        (measure.start.x + measure.end.x) / 2 + 6,
        (measure.start.y + measure.end.y) / 2 - 6,
      )
      ctx.restore()
    })
  }

  const drawTempMeasure = (ctx: CanvasRenderingContext2D) => {
    if (!isDrawing || !tempStart || !tempEnd || toolsStore.currentTool !== 'measure') return

    ctx.save()
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2
    ctx.strokeStyle = '#a78bfa'
    ctx.beginPath()
    ctx.moveTo(tempStart.x, tempStart.y)
    ctx.lineTo(tempEnd.x, tempEnd.y)
    ctx.stroke()

    const dx = tempEnd.x - tempStart.x
    const dy = tempEnd.y - tempStart.y
    const meters = annotationsStore.metersPerPx
      ? Math.hypot(dx, dy) * annotationsStore.metersPerPx
      : null

    ctx.fillStyle = '#a78bfa'
    ctx.font = '13px sans-serif'
    const label = meters ? `${meters.toFixed(2)} m` : '? m'
    ctx.fillText(label, (tempStart.x + tempEnd.x) / 2 + 6, (tempStart.y + tempEnd.y) / 2 - 6)
    ctx.restore()
  }

  return {
    draw,
    setDrawingState,
    setPerimeterPreview,
  }
}
