import React, { useState, useRef, useEffect } from 'react';
import { StudioVideoProject, StudioVideoScene } from '../../types/studio';
import { studioService } from '../../services/studioService';
import { formatBRL } from '../../lib/formatCurrency';
import { toast } from 'sonner';
import { 
  Play, Pause, RotateCcw, Download, Plus, Trash2, Film, Clock, 
  Sparkles, Check, ChevronRight, Layers, Sliders, Smartphone, Square
} from 'lucide-react';

interface VideoEditorProps {
  onBackToStudio: () => void;
}

const DEFAULT_SCENES: StudioVideoScene[] = [
  {
    id: 'sc_1',
    title: 'IPHONE 15 PRO MAX',
    subtitle: 'O Mais Desejado da GodShop',
    badge: 'LANÇAMENTO EXCLUSIVO',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
    duration: 3,
    transition: 'zoom',
    backgroundColor: '#09090b',
    backgroundGradient: 'radial-gradient(circle, #1c1917 0%, #09090b 100%)',
    tagline: 'TITÂNIO NATURAL'
  },
  {
    id: 'sc_2',
    title: 'DESIGN & PERFORMANCE',
    subtitle: 'Câmera de 48MP e Chip A17 Pro',
    badge: 'QUALIDADE MÁXIMA',
    imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
    duration: 3,
    transition: 'fade',
    backgroundColor: '#09090b',
    backgroundGradient: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
    tagline: 'IMPECÁVEL • SEM MARCAS'
  },
  {
    id: 'sc_3',
    title: 'CONDIÇÃO IMBATÍVEL',
    subtitle: 'Em até 12x Sem Juros ou Desconto no Pix',
    priceText: 'R$ 5.890,00',
    installmentText: 'ou 12x de R$ 539,90',
    badge: 'GARANTIA DE 1 ANO',
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
    duration: 4,
    transition: 'pulse',
    backgroundColor: '#09090b',
    backgroundGradient: 'radial-gradient(circle, #27272a 0%, #09090b 80%)',
    tagline: 'CHAME NO WHATSAPP E GARANTA O SEU!'
  }
];

export default function VideoEditor({ onBackToStudio }: VideoEditorProps) {
  const [videoProject, setVideoProject] = useState<StudioVideoProject>({
    id: `vid_${Date.now()}`,
    name: 'Vídeo Promocional iPhone',
    format: 'story',
    width: 720,
    height: 1280,
    scenes: DEFAULT_SCENES,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const totalDuration = videoProject.scenes.reduce((acc, s) => acc + s.duration, 0);
  const activeScene = videoProject.scenes[activeSceneIndex] || videoProject.scenes[0];

  // Draw current scene onto canvas
  const renderFrame = (scene: StudioVideoScene, progressInScene: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, w * 0.8);
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Animated Header Brand
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 36px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '8px';
    ctx.fillText('GODSHOP', w / 2, h * 0.1);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '700 16px Inter, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('CELULARES & GAMES', w / 2, h * 0.13);

    // 3. Badge with Pulse
    if (scene.badge) {
      const pulseScale = 1 + Math.sin(progressInScene * Math.PI * 4) * 0.04;
      ctx.save();
      ctx.translate(w / 2, h * 0.2);
      ctx.scale(pulseScale, pulseScale);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-160, -22, 320, 44, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 16px Montserrat, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(scene.badge, 0, 6);
      ctx.restore();
    }

    // 4. Product Image with Camera Zoom
    if (scene.imageUrl) {
      const zoomFactor = scene.transition === 'zoom' 
        ? 1 + progressInScene * 0.12 
        : 1 + Math.sin(progressInScene * Math.PI) * 0.05;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = scene.imageUrl;
      if (img.complete) {
        ctx.save();
        ctx.translate(w / 2, h * 0.45);
        ctx.scale(zoomFactor, zoomFactor);
        const imgSize = w * 0.65;
        ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        ctx.restore();
      }
    }

    // 5. Scene Title & Subtitle with Fade-In
    const textAlpha = Math.min(1, progressInScene * 3);
    ctx.save();
    ctx.globalAlpha = textAlpha;

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(scene.title, w / 2, h * 0.72);

    ctx.fillStyle = '#d4d4d8';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(scene.subtitle, w / 2, h * 0.76);

    // 6. Price Reveal if present
    if (scene.priceText) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 54px Montserrat, sans-serif';
      ctx.fillText(scene.priceText, w / 2, h * 0.83);

      if (scene.installmentText) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '700 18px Inter, sans-serif';
        ctx.fillText(scene.installmentText, w / 2, h * 0.87);
      }
    }

    // 7. Footer Call to Action
    if (scene.tagline) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '800 18px Montserrat, sans-serif';
      ctx.fillText(scene.tagline, w / 2, h * 0.94);
    }

    ctx.restore();
  };

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderFrame(activeScene, 0.5);
      return;
    }

    const start = performance.now() - (currentTime * 1000);

    const step = (now: number) => {
      const elapsedSec = (now - start) / 1000;
      if (elapsedSec >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        setActiveSceneIndex(0);
        return;
      }

      setCurrentTime(elapsedSec);

      // Determine active scene
      let accumulated = 0;
      for (let i = 0; i < videoProject.scenes.length; i++) {
        const sc = videoProject.scenes[i];
        if (elapsedSec >= accumulated && elapsedSec < accumulated + sc.duration) {
          setActiveSceneIndex(i);
          const progressInScene = (elapsedSec - accumulated) / sc.duration;
          renderFrame(sc, progressInScene);
          break;
        }
        accumulated += sc.duration;
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration, videoProject.scenes]);

  // Initial draw
  useEffect(() => {
    renderFrame(activeScene, 0.5);
  }, [activeScene, videoProject.format]);

  // Export Real MP4/WebM Video
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `godshop-video-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        toast.success('Vídeo promocional exportado com sucesso!');
      };

      recorder.start();

      // Render all scenes sequentially
      const totalFrames = totalDuration * 30;
      let frame = 0;

      const recordStep = () => {
        const currentSec = frame / 30;
        let accumulated = 0;

        for (let i = 0; i < videoProject.scenes.length; i++) {
          const sc = videoProject.scenes[i];
          if (currentSec >= accumulated && currentSec <= accumulated + sc.duration) {
            const progress = (currentSec - accumulated) / sc.duration;
            renderFrame(sc, progress);
            break;
          }
          accumulated += sc.duration;
        }

        setExportProgress(Math.round((frame / totalFrames) * 100));
        frame++;

        if (frame <= totalFrames) {
          requestAnimationFrame(recordStep);
        } else {
          recorder.stop();
        }
      };

      recordStep();

    } catch (e: any) {
      console.error('Export video error:', e);
      setIsExporting(false);
      toast.error('Erro ao gerar vídeo: ' + (e?.message || 'Navegador não suporta gravação direta.'));
    }
  };

  const handleAddScene = () => {
    const newSc: StudioVideoScene = {
      id: `sc_${Date.now()}`,
      title: 'SUPER CONDIÇÃO',
      subtitle: 'Aproveite Hoje Mesmo na GodShop',
      badge: 'PROMOÇÃO',
      priceText: 'R$ 2.490,00',
      duration: 3,
      transition: 'fade',
      backgroundColor: '#09090b',
      tagline: 'GARANTA O SEU AGORA!'
    };
    setVideoProject(prev => ({
      ...prev,
      scenes: [...prev.scenes, newSc]
    }));
  };

  const handleUpdateScene = (index: number, updates: Partial<StudioVideoScene>) => {
    setVideoProject(prev => {
      const updated = [...prev.scenes];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, scenes: updated };
    });
  };

  const handleDeleteScene = (index: number) => {
    if (videoProject.scenes.length <= 1) {
      toast.error('O vídeo precisa de pelo menos uma cena.');
      return;
    }
    setVideoProject(prev => ({
      ...prev,
      scenes: prev.scenes.filter((_, idx) => idx !== index)
    }));
    setActiveSceneIndex(0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Bar */}
      <div className="p-3 sm:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStudio}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Voltar ao Studio
          </button>
          <div className="h-4 w-[1px] bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-amber-500" />
            <h3 className="font-bold text-sm text-white">{videoProject.name}</h3>
            <span className="text-[10px] text-zinc-400 font-mono">({totalDuration}s total)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportVideo}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? `Gerando Vídeo (${exportProgress}%)...` : 'Exportar Vídeo MP4'}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Canvas Player Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-zinc-950 overflow-auto">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-zinc-800 bg-black">
            <canvas
              ref={canvasRef}
              width={videoProject.width}
              height={videoProject.height}
              className="max-h-[62vh] max-w-[85vw] object-contain rounded-2xl"
            />

            {/* Play/Pause Button Overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/90 border border-zinc-750 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-transform active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <button
                onClick={() => { setIsPlaying(false); setCurrentTime(0); setActiveSceneIndex(0); }}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-300 min-w-[50px] text-center">
                {currentTime.toFixed(1)}s / {totalDuration}s
              </span>
            </div>
          </div>
        </div>

        {/* Scene Inspector Sidebar */}
        <div className="w-full md:w-80 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 p-4 overflow-y-auto space-y-4 shrink-0">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
              Cena {activeSceneIndex + 1} de {videoProject.scenes.length}
            </span>
            <button
              onClick={() => handleDeleteScene(activeSceneIndex)}
              className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
              title="Excluir Cena"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Título da Cena</label>
              <input
                type="text"
                value={activeScene.title}
                onChange={(e) => handleUpdateScene(activeSceneIndex, { title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Subtítulo</label>
              <input
                type="text"
                value={activeScene.subtitle}
                onChange={(e) => handleUpdateScene(activeSceneIndex, { subtitle: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Selo / Badge</label>
              <input
                type="text"
                value={activeScene.badge || ''}
                onChange={(e) => handleUpdateScene(activeSceneIndex, { badge: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Preço em Destaque</label>
              <input
                type="text"
                value={activeScene.priceText || ''}
                onChange={(e) => handleUpdateScene(activeSceneIndex, { priceText: e.target.value })}
                placeholder="Ex: R$ 3.890,00"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Duração ({activeScene.duration}s)</label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={activeScene.duration}
                  onChange={(e) => handleUpdateScene(activeSceneIndex, { duration: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Transição</label>
                <select
                  value={activeScene.transition}
                  onChange={(e) => handleUpdateScene(activeSceneIndex, { transition: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white"
                >
                  <option value="zoom">Zoom Dinâmico</option>
                  <option value="fade">Fade Suave</option>
                  <option value="pulse">Pulso de Atenção</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Timeline Bar at Bottom */}
      <div className="border-t border-zinc-800 bg-zinc-900/90 p-3 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500 mr-2 shrink-0">
          Linha do Tempo:
        </span>
        {videoProject.scenes.map((scene, idx) => (
          <div
            key={scene.id}
            onClick={() => setActiveSceneIndex(idx)}
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer shrink-0 min-w-[140px] ${
              activeSceneIndex === idx
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className="p-1 rounded bg-zinc-800 text-[10px] font-mono font-bold">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs truncate">{scene.title}</div>
              <div className="text-[10px] text-zinc-500">{scene.duration}s • {scene.transition}</div>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddScene}
          className="p-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-amber-500 text-zinc-400 hover:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Adicionar Cena
        </button>
      </div>
    </div>
  );
}
