import React, { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

export function formatSignatureData(data: string | undefined | null): string | null {
  if (!data || typeof data !== 'string') return null;
  let s = data.trim();
  if (
    s === '' ||
    s === 'true' ||
    s === 'false' ||
    s === 'null' ||
    s === 'undefined' ||
    s === '[object Object]'
  ) {
    return null;
  }

  // Remove wrapping single or double quotes
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  // If raw SVG string
  if (s.startsWith('<svg') || s.startsWith('<?xml')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
  }

  // If data URI
  if (s.startsWith('data:image/')) {
    // Only clean if it looks like it has been double-encoded or has surrounding quotes
    return s.replace(/["']/g, '').replace(/\s/g, '+').replace('data:image/png;base64,+', 'data:image/png;base64,');
  }

  // If raw base64 PNG/JPEG/SVG without prefix
  if (s.length > 30) {
    if (s.startsWith('iVBORw0KGgo')) {
      return `data:image/png;base64,${s.replace(/\s+/g, '')}`;
    }
    if (s.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${s.replace(/\s+/g, '')}`;
    }
    if (s.startsWith('PHN2Zy')) {
      return `data:image/svg+xml;base64,${s.replace(/\s+/g, '')}`;
    }
  }

  // Standard web URL
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) {
    return s;
  }

  return s;
}

interface SignatureDisplayProps {
  signatureData?: string | null;
  signerName?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export default function SignatureDisplay({
  signatureData,
  signerName,
  alt = 'Assinatura',
  className = 'max-h-12 object-contain',
  fallbackClassName = 'text-2xl text-blue-900 -rotate-2 font-bold select-none tracking-wide'
}: SignatureDisplayProps) {
  const [errorState, setErrorState] = useState(false);
  const [rasterizedUrl, setRasterizedUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const cleanData = useMemo(() => {
    return formatSignatureData(signatureData);
  }, [signatureData]);

  useEffect(() => {
    let isMounted = true;
    
    const rasterize = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        if (cleanData && !errorState) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          // Add cache buster to bypass potential stale CORS headers for external URLs
          const separator = cleanData.includes('?') ? '&' : '?';
          img.src = cleanData.startsWith('data:') ? cleanData : `${cleanData}${separator}t=${Date.now()}`;
          
          img.onload = () => {
            if (!isMounted) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate aspect ratio to fit image in canvas
            const ratio = img.width / img.height;
            let drawWidth = canvas.width;
            let drawHeight = canvas.width / ratio;
            
            if (drawHeight > canvas.height) {
              drawHeight = canvas.height;
              drawWidth = canvas.height * ratio;
            }
            
            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2;
            
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            const dataUrl = canvas.toDataURL('image/png');
            setRasterizedUrl(dataUrl);
            setIsLoaded(true);
          };
          
          img.onerror = () => {
            if (!isMounted) return;
            setErrorState(true);
            
            // If image fails, try to render the text fallback immediately
            if (signerName) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.font = 'italic bold 28px serif';
              ctx.fillStyle = '#1e3a8a';
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'center';
              ctx.fillText(signerName, canvas.width / 2, canvas.height / 2);
              
              const dataUrl = canvas.toDataURL('image/png');
              setRasterizedUrl(dataUrl);
              setIsLoaded(true);
            }
          };
        } else if (signerName) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = 'italic bold 28px serif';
          ctx.fillStyle = '#1e3a8a';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(signerName, canvas.width / 2, canvas.height / 2);
          
          const dataUrl = canvas.toDataURL('image/png');
          setRasterizedUrl(dataUrl);
          setIsLoaded(true);
        }
      } catch (err) {
        console.warn('Rasterization error:', err);
        if (isMounted) setErrorState(true);
      }
    };

    rasterize();
    
    return () => {
      isMounted = false;
    };
  }, [cleanData, errorState, signerName]);

  return (
    <div className={cn("signature-wrapper relative inline-block overflow-visible", className)} style={{ minWidth: '120px', minHeight: '40px' }}>
      {rasterizedUrl ? (
        <img 
          src={rasterizedUrl} 
          alt={alt} 
          className="signature-img block w-full h-full object-contain"
          data-signature-loaded={isLoaded}
          style={{ 
            visibility: 'visible', 
            opacity: 1,
            minHeight: '40px'
          }}
        />
      ) : (
        <div className="flex items-center justify-center bg-white/50 w-full h-full min-h-[40px] border border-dashed border-slate-200 rounded">
          <span className="text-[8px] text-slate-400">Processando...</span>
        </div>
      )}
    </div>
  );
}
