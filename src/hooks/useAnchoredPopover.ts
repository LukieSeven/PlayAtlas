import { useState, useEffect, useCallback, RefObject } from 'react';

export interface AnchoredPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
  maxHeight: number;
}

export interface UseAnchoredPopoverOptions {
  margin?: number;
  width?: number;
}

/**
 * Detects the effective rendered scale factor caused by root-level zoom/transform.
 *
 * When `html { zoom: 0.9 }` is set, `getBoundingClientRect()` returns visual viewport
 * coordinates, but CSS `top`/`left` on `position:fixed` elements are interpreted in the
 * zoomed CSS coordinate space. This function calculates the ratio to convert between them.
 *
 * Uses the popover element itself: `getBoundingClientRect().width / offsetWidth` gives
 * the effective scale. Falls back to computed zoom or 1 if popover is unavailable.
 */
function getEffectiveScale(popoverEl: HTMLElement | null): { scaleX: number; scaleY: number } {
  if (popoverEl && popoverEl.offsetWidth > 0 && popoverEl.offsetHeight > 0) {
    const rect = popoverEl.getBoundingClientRect();
    const scaleX = rect.width / popoverEl.offsetWidth;
    const scaleY = rect.height / popoverEl.offsetHeight;

    const validX = Number.isFinite(scaleX) && scaleX > 0.1 && scaleX < 5 ? scaleX : 1;
    const validY = Number.isFinite(scaleY) && scaleY > 0.1 && scaleY < 5 ? scaleY : 1;

    return { scaleX: validX, scaleY: validY };
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.getComputedStyle === 'function' &&
    document.documentElement
  ) {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const zoomStr = (htmlStyle as any)?.zoom || htmlStyle?.getPropertyValue?.('zoom');
    const parsedZoom = parseFloat(zoomStr);
    if (!isNaN(parsedZoom) && parsedZoom > 0) {
      return { scaleX: parsedZoom, scaleY: parsedZoom };
    }
  }

  return { scaleX: 1, scaleY: 1 };
}

export function useAnchoredPopover(
  isOpen: boolean,
  onClose: () => void,
  triggerRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  options: UseAnchoredPopoverOptions = {}
) {
  const [position, setPosition] = useState<AnchoredPosition | null>(null);
  const margin = options.margin ?? 12;
  const defaultWidth = options.width ?? 224;

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const triggerEl = triggerRef.current;
    const popoverEl = popoverRef.current;

    // 1. Measure trigger rect in visual viewport space
    const triggerRect = triggerEl.getBoundingClientRect();

    // 2. Measure viewport visual dimensions
    const viewportWidth = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1024;
    const viewportHeight = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 768;

    // 3. Detect zoom/transform scale factor dynamically
    const { scaleX, scaleY } = getEffectiveScale(popoverEl);

    // 4. Measure popover size in visual viewport space
    let popoverVisualWidth: number;
    let popoverVisualHeight: number;

    if (popoverEl && popoverEl.offsetWidth > 0 && popoverEl.offsetHeight > 0) {
      const popoverRect = popoverEl.getBoundingClientRect();
      popoverVisualWidth = popoverRect.width;
      popoverVisualHeight = popoverRect.height;
    } else {
      popoverVisualWidth = defaultWidth * scaleX;
      popoverVisualHeight = 340 * scaleY;
    }

    // 5. Margin and gap in visual viewport space
    const visualMargin = margin * scaleX;
    const gap = 8 * scaleY;

    // 6. Placement decision in visual viewport space
    const spaceBelow = viewportHeight - triggerRect.bottom - visualMargin;
    const spaceAbove = triggerRect.top - visualMargin;

    let placement: 'above' | 'below' = 'below';
    if (spaceBelow < popoverVisualHeight && spaceAbove > spaceBelow) {
      placement = 'above';
    }

    // 7. Compute target top and maxHeight in visual viewport space
    let visualTop: number;
    let maxHeightCSS: number;

    if (placement === 'below') {
      visualTop = triggerRect.bottom + gap;
      maxHeightCSS = Math.max(120, (viewportHeight - visualTop - visualMargin) / scaleY);
    } else {
      const availableVisual = triggerRect.top - gap - visualMargin;
      maxHeightCSS = Math.max(120, availableVisual / scaleY);
      const actualVisualHeight = Math.min(popoverVisualHeight, maxHeightCSS * scaleY);
      visualTop = Math.max(visualMargin, triggerRect.top - actualVisualHeight - gap);
    }

    // 8. Compute target left in visual viewport space (right-aligned to trigger)
    let visualLeft = triggerRect.right - popoverVisualWidth;

    // Viewport clamping in visual space
    const minVisualLeft = visualMargin;
    const maxVisualLeft = viewportWidth - popoverVisualWidth - visualMargin;
    visualLeft = Math.max(minVisualLeft, Math.min(maxVisualLeft, visualLeft));

    // 9. Convert visual viewport coordinates to CSS coordinates for position: fixed
    const cssTop = visualTop / scaleY;
    const cssLeft = visualLeft / scaleX;

    setPosition({
      top: cssTop,
      left: cssLeft,
      placement,
      maxHeight: maxHeightCSS,
    });
  }, [isOpen, triggerRef, popoverRef, margin, defaultWidth]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    // Measure-then-reveal lifecycle:
    // Defer updatePosition to the first RAF after DOM mount so popover has been
    // inserted into DOM at sentinel (-9999px, opacity 0), then do a second RAF pass
    // to refine once layout settles. Position is set non-null ONLY after measurement.
    let rafId2: number | null = null;
    const rafId1 = requestAnimationFrame(() => {
      updatePosition();
      rafId2 = requestAnimationFrame(() => {
        updatePosition();
      });
    });

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      cancelAnimationFrame(rafId1);
      if (rafId2 !== null) {
        cancelAnimationFrame(rafId2);
      }
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Outside pointerdown & Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];

      const isInsideTrigger = Boolean(
        triggerRef.current && (
          (target && triggerRef.current.contains(target)) ||
          path.includes(triggerRef.current)
        )
      );

      const isInsidePopover = Boolean(
        popoverRef.current && (
          (target && popoverRef.current.contains(target)) ||
          path.includes(popoverRef.current)
        )
      );

      if (isInsideTrigger || isInsidePopover) {
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    let rafId: number | null = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handlePointerDown, true);
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen, onClose, triggerRef, popoverRef]);

  return { position, updatePosition };
}
