import React, { useState, useMemo } from 'react';

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
    const commaIndex = s.indexOf(',');
    if (commaIndex !== -1) {
      const header = s.substring(0, commaIndex);
      const payload = s.substring(commaIndex + 1).replace(/\s+/g, '');
      return `${header},${payload}`;
    }
    return s;
  }

  // If raw base64 PNG/JPEG/SVG without prefix
  if (s.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${s.replace(/\s+/g, '')}`;
  }
  if (s.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${s.replace(/\s+/g, '')}`;
  }
  if (s.startsWith('PHN2Zy')) {
    return `data:image/svg+xml;base64,${s.replace(/\s+/g, '')}`;
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
  const [hasError, setHasError] = useState(false);

  const cleanData = useMemo(() => {
    return formatSignatureData(signatureData);
  }, [signatureData]);

  if (!cleanData || hasError) {
    if (signerName) {
      return (
        <span style={{ fontFamily: "'Dancing Script', cursive" }} className={fallbackClassName}>
          {signerName}
        </span>
      );
    }
    return null;
  }

  return (
    <img
      src={cleanData}
      alt={alt}
      className={className}
      onError={() => {
        console.warn('SignatureDisplay: imagem da assinatura não pôde ser renderizada, usando assinatura cursiva eletrônica para', signerName);
        setHasError(true);
      }}
    />
  );
}
