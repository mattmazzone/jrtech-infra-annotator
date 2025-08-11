import type { Point } from '@/types'

export function isPointInPerimeter(
  x: number,
  y: number,
  points: Point[],
  closed: boolean,
): boolean {
  if (!closed || points.length < 3) return true

  // Ray casting algorithm for point-in-polygon
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x,
      yi = points[i].y
    const xj = points[j].x,
      yj = points[j].y

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function calculateCoverageEfficiency(
  centerX: number,
  centerY: number,
  radiusPx: number,
  perimeterPoints: Point[],
  perimeterClosed: boolean,
): number {
  if (!perimeterClosed || perimeterPoints.length < 3) return 1.0

  let insidePoints = 0
  let totalPoints = 0

  const sampleRadius = 8
  const sampleAngles = 16

  for (let ring = 0; ring <= sampleRadius; ring++) {
    const currentRadius = (ring / sampleRadius) * radiusPx
    const pointsInRing = ring === 0 ? 1 : sampleAngles

    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * 2 * Math.PI
      const x = centerX + currentRadius * Math.cos(angle)
      const y = centerY + currentRadius * Math.sin(angle)

      totalPoints++
      if (isPointInPerimeter(x, y, perimeterPoints, perimeterClosed)) {
        insidePoints++
      }
    }
  }

  return totalPoints > 0 ? insidePoints / totalPoints : 0
}

export function getDistanceToPerimeter(
  x: number,
  y: number,
  perimeterPoints: Point[],
  perimeterClosed: boolean,
): number {
  if (!perimeterClosed || perimeterPoints.length < 3) return 1000

  let minDistance = Infinity

  for (let i = 0; i < perimeterPoints.length; i++) {
    const p1 = perimeterPoints[i]
    const p2 = perimeterPoints[(i + 1) % perimeterPoints.length]
    const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y)
    minDistance = Math.min(minDistance, distance)
  }

  return minDistance
}

export function pointToLineDistance(
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

export function isPointInRect(px: number, py: number, rectStart: Point, rectEnd: Point): boolean {
  const minX = Math.min(rectStart.x, rectEnd.x)
  const maxX = Math.max(rectStart.x, rectEnd.x)
  const minY = Math.min(rectStart.y, rectEnd.y)
  const maxY = Math.max(rectStart.y, rectEnd.y)
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}
