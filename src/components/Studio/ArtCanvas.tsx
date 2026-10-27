import React, { useRef, useState, useEffect } from 'react';
import { StudioElement, StudioProject } from '../../types/studio';
import { formatBRL } from '../../lib/formatCurrency';
import { Lock, Unlock, Trash2, ArrowUp, ArrowDown, Copy, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ArtCanvasProps {
  project: StudioProject;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StudioElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function ArtCanvas({
  project,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  zoom,
  setZoom,
  canvasRef
}: ArtCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0 });
  const [showCenterGuideX, setShowCenterGuideX] = useState(false);
  const [showCenterGuideY, setShowCenterGuideY] = useState(false);

  const selectedElement = project.elements.find(el => el.id === selectedElementId);

  // Aspect ratio calculation
  const aspectRatio = `${project.width} / ${project.height}`;

  // Handle pointer down on element for dragging
  const handleElementPointerDown = (e: React.PointerEvent, element: StudioElement) => {
    e.stopPropagation();
    onSelectElement(element.id);
    if (element.locked) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: element.x,
      elY: element.y,
      elW: element.width,
      elH: element.height
    });
  };

  // Handle pointer down on resize handle
  const handleResizeHandleDown = (e: React.PointerEvent, element: StudioElement) => {
    e.stopPropagation();
    if (element.locked) return;

    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: element.x,
      elY: element.y,
      elW: element.width,
      elH: element.height
    });
  };

  // Window pointer move and up handlers
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const rect = canvasEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (isDragging && selectedElement && !selectedElement.locked) {
        const deltaXPct = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaYPct = ((e.clientY - dragStart.y) / rect.height) * 100;

        let newX = Math.round((dragStart.elX + deltaXPct) * 10) / 10;
        let newY = Math.round((dragStart.elY + deltaYPct) * 10) / 10;

        // Snapping to center
        const isNearCenterX = Math.abs(newX - 50) < 1.5;
        const isNearCenterY = Math.abs(newY - 50) < 1.5;

        if (isNearCenterX) {
          newX = 50;
          setShowCenterGuideX(true);
        } else {
          setShowCenterGuideX(false);
        }

        if (isNearCenterY) {
          newY = 50;
          setShowCenterGuideY(true);
        } else {
          setShowCenterGuideY(false);
        }

        onUpdateElement(selectedElement.id, { x: newX, y: newY });
      }

      if (isResizing && selectedElement && !selectedElement.locked) {
        const deltaXPct = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaYPct = ((e.clientY - dragStart.y) / rect.height) * 100;

        const newW = Math.max(8, Math.round((dragStart.elW + deltaXPct) * 10) / 10);
        const newH = Math.max(3, Math.round((dragStart.elH + deltaYPct) * 10) / 10);

        onUpdateElement(selectedElement.id, { width: newW, height: newH });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setShowCenterGuideX(false);
      setShowCenterGuideY(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isResizing, dragStart, selectedElement, onUpdateElement, canvasRef]);

  // Click on background deselects
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectElement(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-zinc-950 overflow-auto select-none min-h-[480px]"
      onClick={() => onSelectElement(null)}
    >
      {/* Zoom and Fit Overlay Controls */}
      <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-750 p-1 rounded-xl shadow-2xl backdrop-blur-md">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1)))); }}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Diminuir Zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono font-bold text-zinc-300 px-1.5 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(1)))); }}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Aumentar Zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(1); }}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Ajustar 100%"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Canvas Container with Scale */}
      <div 
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        className="transition-transform duration-100 ease-out flex items-center justify-center"
      >
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            aspectRatio,
            background: project.backgroundGradient || project.backgroundColor || '#09090b',
            backgroundImage: project.backgroundImage ? `url(${project.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: project.width > project.height ? '560px' : '360px',
            maxWidth: '90vw',
            maxHeight: '82vh'
          }}
          className="relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden border border-zinc-800 cursor-default"
        >
          {/* Centering Magnetic Guides */}
          {showCenterGuideX && (
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-amber-500/80 z-30 pointer-events-none -translate-x-1/2" />
          )}
          {showCenterGuideY && (
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-amber-500/80 z-30 pointer-events-none -translate-y-1/2" />
          )}

          {/* Render All Elements */}
          {project.elements
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
              const isSelected = selectedElementId === element.id;

              return (
                <div
                  key={element.id}
                  onPointerDown={(e) => handleElementPointerDown(e, element)}
                  style={{
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    width: `${element.width}%`,
                    height: `${element.height}%`,
                    transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
                    opacity: (element.opacity !== undefined ? element.opacity : 100) / 100,
                    zIndex: element.zIndex
                  }}
                  className={`absolute flex items-center justify-center cursor-move transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-black/50 shadow-lg'
                      : 'hover:ring-1 hover:ring-amber-400/40'
                  }`}
                >
                  {/* Element Content Renderers */}

                  {/* 1. TEXT */}
                  {element.type === 'text' && (
                    <div
                      style={{
                        fontFamily: element.fontFamily || 'Inter, sans-serif',
                        fontSize: `${(element.fontSize || 24) * 0.45}px`,
                        fontWeight: element.fontWeight === 'black' ? 900 : (element.fontWeight === 'extrabold' ? 800 : (element.fontWeight === 'bold' ? 700 : 500)),
                        color: element.color || '#ffffff',
                        textAlign: element.textAlign || 'center',
                        letterSpacing: `${element.letterSpacing || 0}px`,
                        textShadow: element.shadow ? '0 4px 12px rgba(0,0,0,0.9)' : undefined,
                        textTransform: element.textTransform || 'none',
                        lineHeight: 1.15
                      }}
                      className="w-full h-full flex items-center justify-center p-1 break-words select-none pointer-events-none"
                    >
                      {element.content || 'Texto'}
                    </div>
                  )}

                  {/* 2. IMAGE */}
                  {element.type === 'image' && (
                    <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                      <img
                        src={element.src}
                        alt="Produto"
                        crossOrigin="anonymous"
                        style={{
                          objectFit: element.objectFit || 'contain',
                          borderRadius: `${element.borderRadius || 0}px`,
                          filter: `brightness(${element.brightness || 100}%) contrast(${element.contrast || 100}%) saturate(${element.saturation || 100}%)`,
                          mixBlendMode: (element.blendMode as any) || 'normal'
                        }}
                        className="w-full h-full drop-shadow-2xl"
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* 3. BADGE */}
                  {element.type === 'badge' && (
                    <div
                      style={{
                        backgroundColor: element.badgeBg || 'rgba(245, 158, 11, 0.15)',
                        color: element.badgeTextColor || '#fbbf24',
                        borderColor: element.badgeBorderColor || 'rgba(245, 158, 11, 0.5)'
                      }}
                      className="px-3 py-1 rounded-full border text-[11px] sm:text-xs font-black tracking-wider uppercase text-center flex items-center justify-center shadow-lg pointer-events-none"
                    >
                      {element.label || 'OFERTA ESPECIAL'}
                    </div>
                  )}

                  {/* 4. PRICE CARD */}
                  {element.type === 'price' && (
                    <div 
                      style={{ borderColor: element.highlightColor || '#f59e0b' }}
                      className="w-full h-full bg-zinc-950/80 border-2 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md pointer-events-none"
                    >
                      <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                        À Vista no Pix
                      </div>
                      <div 
                        style={{ color: element.highlightColor || '#f59e0b' }}
                        className="text-xl sm:text-2xl font-black font-mono tracking-tight"
                      >
                        {formatBRL(element.cashPrice || 0)}
                      </div>
                      {Boolean(element.installmentCount && element.installmentValue) && (
                        <div className="text-[10px] text-zinc-300 font-medium mt-0.5">
                          ou <strong className="text-white">{element.installmentCount}x</strong> de <strong className="text-white">{formatBRL(element.installmentValue || 0)}</strong>
                        </div>
                      )}
                      {element.paymentNote && (
                        <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                          {element.paymentNote}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. SHAPE */}
                  {element.type === 'shape' && (
                    <div
                      style={{
                        backgroundColor: element.fillColor || '#f59e0b',
                        borderColor: element.strokeColor || 'transparent',
                        borderWidth: `${element.strokeWidth || 0}px`,
                        borderRadius: element.shapeType === 'circle' ? '50%' : (element.shapeType === 'pill' ? '9999px' : '16px')
                      }}
                      className="w-full h-full pointer-events-none shadow"
                    />
                  )}

                  {/* Active Selection Overlay & Controls */}
                  {isSelected && (
                    <>
                      {/* Resize Handle at Bottom-Right */}
                      <div
                        onPointerDown={(e) => handleResizeHandleDown(e, element)}
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      />

                      {/* Element Floating Toolbar */}
                      <div 
                        className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-1 rounded-xl shadow-2xl z-50 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onBringForward(element.id)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Trazer para Frente"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onSendBackward(element.id)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Enviar para Trás"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDuplicateElement(element.id)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onUpdateElement(element.id, { locked: !element.locked })}
                          className={`p-1 hover:bg-zinc-800 rounded transition-colors cursor-pointer ${
                            element.locked ? 'text-amber-500' : 'text-zinc-300 hover:text-white'
                          }`}
                          title={element.locked ? "Desbloquear" : "Bloquear"}
                        >
                          {element.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => onDeleteElement(element.id)}
                          className="p-1 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Excluir Elemento"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
