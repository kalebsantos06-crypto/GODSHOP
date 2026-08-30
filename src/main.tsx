import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// 1. Monkeypatch Node/Element prototypes to permanently eliminate React NotFoundError
const protos = [
  typeof Node !== 'undefined' ? Node.prototype : null,
  typeof Element !== 'undefined' ? Element.prototype : null,
  typeof HTMLElement !== 'undefined' ? HTMLElement.prototype : null,
  typeof DocumentFragment !== 'undefined' ? DocumentFragment.prototype : null,
  typeof CharacterData !== 'undefined' ? (CharacterData as any).prototype : null
].filter(Boolean);

protos.forEach((proto: any) => {
  if (proto && proto.removeChild) {
    const originalRemoveChild = proto.removeChild;
    proto.removeChild = function (this: any, child: any): any {
      if (!child) return child;
      if (child.parentNode !== this) {
        try {
          if (child.parentNode) {
            return child.parentNode.removeChild(child);
          }
        } catch (e) {}
        return child;
      }
      try {
        return originalRemoveChild.apply(this, arguments as any);
      } catch (err: any) {
        if (err && (err.name === 'NotFoundError' || String(err).includes('removeChild') || String(err).includes('not a child'))) {
          try {
            if (child.parentNode) {
              return child.parentNode.removeChild(child);
            }
          } catch (e) {}
          return child;
        }
        throw err;
      }
    };
  }

  if (proto && proto.insertBefore) {
    const originalInsertBefore = proto.insertBefore;
    proto.insertBefore = function (this: any, newNode: any, referenceNode: any): any {
      if (!newNode) return newNode;
      if (referenceNode && referenceNode.parentNode !== this) {
        try {
          if (referenceNode.parentNode) {
            return referenceNode.parentNode.insertBefore(newNode, referenceNode);
          }
        } catch (e) {}
        return newNode;
      }
      try {
        return originalInsertBefore.apply(this, arguments as any);
      } catch (err: any) {
        if (err && (err.name === 'NotFoundError' || String(err).includes('insertBefore') || String(err).includes('not a child'))) {
          try {
            if (referenceNode && referenceNode.parentNode) {
              return referenceNode.parentNode.insertBefore(newNode, referenceNode);
            }
          } catch (e) {}
          return newNode;
        }
        throw err;
      }
    };
  }
});

// Force template update for registration & templates
const regKey = 'auto_template_registration';
const currentReg = typeof window !== 'undefined' ? localStorage.getItem(regKey) : null;
if (currentReg && (currentReg.includes('Karen') || currentReg.includes('PIX') || currentReg.includes('13036942637') || currentReg.includes('Status:'))) {
  localStorage.setItem(regKey, "É um prazer tê-lo(a) conosco! Confirmamos que seu cadastro na GODSHOP foi concluído com sucesso em nosso sistema.");
}
if (typeof window !== 'undefined' && localStorage.getItem('auto_template_client_remote_confirmation')) {
  localStorage.setItem('auto_template_client_remote_confirmation', "É um prazer tê-lo(a) conosco! Confirmamos que seu cadastro na GODSHOP foi concluído com sucesso em nosso sistema.");
}
if (typeof window !== 'undefined') {
  const currentStorePhone = localStorage.getItem('auto_store_phone');
  if (!currentStorePhone || currentStorePhone.includes('13036942637') || currentStorePhone.length < 10) {
    localStorage.setItem('auto_store_phone', '5532999634583');
  }
}

// Intercept and suppress benign HMR / WebSocket errors (Vite HMR is disabled in cloud sandboxes)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = String(reason?.message || reason || '');
    const isWebSocketError = 
      reasonStr.toLowerCase().includes('websocket') || 
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('failed to connect');
    if (isWebSocketError) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    const isWebSocketError = 
      msg.toLowerCase().includes('websocket') || 
      msg.includes('closed without opened') ||
      msg.includes('failed to connect');
    if (isWebSocketError) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


