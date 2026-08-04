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

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;

    const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : defaultWidth;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 340;

    const spaceBelow = viewportHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;

    let placement: 'above' | 'below' = 'below';
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      placement = 'above';
    }

    let top: number;
    let maxHeight: number;

    if (placement === 'below') {
      top = triggerRect.bottom + 8;
      maxHeight = Math.max(120, viewportHeight - top - margin);
    } else {
      maxHeight = Math.max(120, spaceAbove - 8);
      top = Math.max(margin, triggerRect.top - Math.min(popoverHeight, maxHeight) - 8);
    }

    const targetLeft = triggerRect.right - popoverWidth;
    const minLeft = margin;
    const maxLeft = viewportWidth - popoverWidth - margin;
    const left = Math.max(minLeft, Math.min(maxLeft, targetLeft));

    setPosition({ top, left, placement, maxHeight });
  }, [isOpen, triggerRef, popoverRef, margin, defaultWidth]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onClose, triggerRef, popoverRef]);

  return { position, updatePosition };
}
