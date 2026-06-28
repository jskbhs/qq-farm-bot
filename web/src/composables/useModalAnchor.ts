import { ref } from 'vue'

export interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface AnchorStyleOptions {
  preferredWidth?: number
  minHeight?: number
  gap?: number
  maxHeightLimit?: number
}

export function computeAnchorStyle(
  anchor: AnchorRect | null | undefined,
  options: AnchorStyleOptions = {},
): Record<string, string> | null {
  if (!anchor)
    return null

  const {
    preferredWidth = 384,
    minHeight = 180,
    gap = 8,
    maxHeightLimit = 600,
  } = options

  const vw = window.innerWidth
  const vh = window.innerHeight

  const width = Math.min(preferredWidth, vw - gap * 2)
  let left = anchor.left
  if (left + width > vw - gap) {
    left = Math.max(gap, vw - width - gap)
  }

  const spaceBelow = vh - anchor.bottom - gap
  const spaceAbove = anchor.top - gap

  let position: 'below' | 'above' = 'below'
  let maxHeight: number

  if (spaceBelow >= minHeight) {
    position = 'below'
    maxHeight = spaceBelow
  }
  else if (spaceAbove >= minHeight) {
    position = 'above'
    maxHeight = spaceAbove
  }
  else {
    if (spaceBelow >= spaceAbove) {
      position = 'below'
      maxHeight = spaceBelow
    }
    else {
      position = 'above'
      maxHeight = spaceAbove
    }
  }

  maxHeight = Math.max(minHeight, Math.min(maxHeight, Math.min(maxHeightLimit, vh - gap * 2)))

  return {
    position: 'fixed',
    left: `${left}px`,
    top: position === 'below' ? `${anchor.bottom + gap}px` : undefined,
    bottom: position === 'above' ? `${vh - anchor.top + gap}px` : undefined,
    width: `${width}px`,
    maxWidth: `${width}px`,
    maxHeight: `${maxHeight}px`,
  } as Record<string, string>
}

export function useModalAnchor() {
  const anchorRect = ref<AnchorRect | null>(null)

  function setAnchorFromEvent(event: MouseEvent | TouchEvent) {
    const target = event.currentTarget as HTMLElement | null
    if (target) {
      anchorRect.value = target.getBoundingClientRect() as AnchorRect
    }
  }

  function clearAnchor() {
    anchorRect.value = null
  }

  function computeStyle(options?: AnchorStyleOptions): Record<string, string> | null {
    return computeAnchorStyle(anchorRect.value, options)
  }

  return {
    anchorRect,
    setAnchorFromEvent,
    clearAnchor,
    computeStyle,
  }
}
