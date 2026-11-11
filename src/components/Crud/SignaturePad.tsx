import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

/** Draw-to-sign canvas (mouse, pen or touch). Always black ink on white so it prints correctly. */
const SignaturePad = forwardRef<SignaturePadHandle, { width?: number; height?: number }>(({ width = 460, height = 160 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const reset = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    dirty.current = false;
  };

  useEffect(reset, []);

  useImperativeHandle(ref, () => ({
    clear: reset,
    isEmpty: () => !dirty.current,
    toDataURL: () => canvasRef.current!.toDataURL('image/png'),
  }));

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * e.currentTarget.width) / rect.width, y: ((e.clientY - rect.top) * e.currentTarget.height) / rect.height };
  };

  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ border: '1px solid #94a3b8', borderRadius: 6, background: '#fff', touchAction: 'none', cursor: 'crosshair', maxWidth: '100%' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const ctx = e.currentTarget.getContext('2d')!;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        drawing.current = true;
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = e.currentTarget.getContext('2d')!;
        const p = point(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        dirty.current = true;
      }}
      onPointerUp={() => { drawing.current = false; }}
      onPointerCancel={() => { drawing.current = false; }}
    />
  );
});

export default SignaturePad;
