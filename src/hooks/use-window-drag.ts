import { useEffect, useRef } from "react";

type Handlers = {
  /** Chamado no máximo uma vez por quadro de animação. */
  onMove: (event: PointerEvent) => void;
  /** Chamado ao soltar; o último movimento pendente é aplicado antes. */
  onUp?: (event: PointerEvent) => void;
  /** Chamado quando o navegador cancela o ponteiro ou a janela perde o foco. */
  onCancel?: () => void;
};

/**
 * Instala listeners de ponteiro na janela enquanto `active` for verdadeiro.
 * Movimentos são agrupados por requestAnimationFrame para não re-renderizar
 * a página a cada pixel, e `pointercancel`/`blur` encerram o arraste.
 */
export function useWindowDrag(active: boolean, handlers: Handlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let pending: PointerEvent | null = null;

    const flush = () => {
      frame = 0;
      if (pending) {
        const event = pending;
        pending = null;
        latest.current.onMove(event);
      }
    };
    const move = (event: PointerEvent) => {
      pending = event;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const up = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      flush();
      latest.current.onUp?.(event);
    };
    const cancel = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      latest.current.onCancel?.();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [active]);
}

/** Converte coordenadas do cliente para o espaço do viewBox de um SVG quadrado/proporcional. */
export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewWidth: number,
  viewHeight: number,
) {
  const r = svg.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * viewWidth,
    y: ((clientY - r.top) / r.height) * viewHeight,
  };
}
