import type { GridSnapSettings } from '@/types'

export interface SnapResult {
  x: number
  y: number
  snapped: boolean
  snapType?: 'horizontal' | 'vertical' | 'diagonal45' | 'diagonal135'
}

export class GridSnapper {
  private settings: GridSnapSettings

  constructor(settings: GridSnapSettings) {
    this.settings = settings
  }

  updateSettings(settings: Partial<GridSnapSettings>) {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Snap a line from start point to end point based on grid settings
   */
  snapLine(startX: number, startY: number, endX: number, endY: number): SnapResult {
    if (!this.settings.enabled) {
      return { x: endX, y: endY, snapped: false }
    }

    const deltaX = endX - startX
    const deltaY = endY - startY

    // Calculate angle in degrees
    const angleRad = Math.atan2(deltaY, deltaX)
    const angleDeg = (angleRad * 180) / Math.PI

    // Normalize angle to 0-360
    const normalizedAngle = ((angleDeg % 360) + 360) % 360

    // Check for horizontal snap (0° or 180°)
    if (
      this.isCloseToAngle(normalizedAngle, 0, this.settings.orthogonalSnapAngle) ||
      this.isCloseToAngle(normalizedAngle, 180, this.settings.orthogonalSnapAngle)
    ) {
      return {
        x: endX,
        y: startY, // Snap to horizontal
        snapped: true,
        snapType: 'horizontal',
      }
    }

    // Check for vertical snap (90° or 270°)
    if (
      this.isCloseToAngle(normalizedAngle, 90, this.settings.orthogonalSnapAngle) ||
      this.isCloseToAngle(normalizedAngle, 270, this.settings.orthogonalSnapAngle)
    ) {
      return {
        x: startX, // Snap to vertical
        y: endY,
        snapped: true,
        snapType: 'vertical',
      }
    }

    // Check for diagonal snaps if enabled
    if (this.settings.enableDiagonalSnap) {
      // 45° diagonal (northeast and southwest)
      if (
        this.isCloseToAngle(normalizedAngle, 45, this.settings.diagonalSnapAngle) ||
        this.isCloseToAngle(normalizedAngle, 225, this.settings.diagonalSnapAngle)
      ) {
        // For 45° diagonal, deltaX should equal deltaY
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2
        const snapX = startX + avgDelta * Math.sign(deltaX)
        const snapY = startY + avgDelta * Math.sign(deltaY)
        return {
          x: snapX,
          y: snapY,
          snapped: true,
          snapType: 'diagonal45',
        }
      }

      // 135° diagonal (northwest and southeast)
      if (
        this.isCloseToAngle(normalizedAngle, 135, this.settings.diagonalSnapAngle) ||
        this.isCloseToAngle(normalizedAngle, 315, this.settings.diagonalSnapAngle)
      ) {
        // For 135° diagonal, deltaX should equal -deltaY
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2
        const snapX = startX + avgDelta * Math.sign(deltaX)
        const snapY = startY - avgDelta * Math.sign(deltaX) // Note: opposite sign
        return {
          x: snapX,
          y: snapY,
          snapped: true,
          snapType: 'diagonal135',
        }
      }
    }

    // No snapping applied
    return { x: endX, y: endY, snapped: false }
  }

  private isCloseToAngle(currentAngle: number, targetAngle: number, tolerance: number): boolean {
    const diff = Math.min(
      Math.abs(currentAngle - targetAngle),
      Math.abs(currentAngle - targetAngle + 360),
      Math.abs(currentAngle - targetAngle - 360),
    )
    return diff <= tolerance
  }
}
