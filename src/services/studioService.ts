import { StudioProject, StudioCampaign, StudioVideoProject, StudioTemplate } from '../types/studio';
import { supabase } from '../lib/supabase';
import { formatBRL } from '../lib/formatCurrency';

const PROJECTS_STORAGE_KEY = 'godshop_studio_projects';
const CAMPAIGNS_STORAGE_KEY = 'godshop_studio_campaigns';
const VIDEOS_STORAGE_KEY = 'godshop_studio_videos';

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number; label: string; ratio: string }> = {
  story: { width: 1080, height: 1920, label: 'Story / Reels / Status (9:16)', ratio: '9:16' },
  feed_portrait: { width: 1080, height: 1350, label: 'Feed Retrato (4:5)', ratio: '4:5' },
  square: { width: 1080, height: 1080, label: 'Feed Quadrado (1:1)', ratio: '1:1' },
  banner: { width: 1200, height: 630, label: 'Banner Horizontal (1.91:1)', ratio: '1.91:1' }
};

export const studioService = {
  // --- PROJECTS ---
  getProjects: (): StudioProject[] => {
    try {
      const data = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error reading studio projects:', e);
      return [];
    }
  },

  getProjectById: (id: string): StudioProject | null => {
    const projects = studioService.getProjects();
    return projects.find(p => p.id === id) || null;
  },

  createProjectFromTemplate: (template: StudioTemplate, name?: string): StudioProject => {
    return {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name || template.title,
      type: 'art',
      format: template.format,
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
      backgroundGradient: template.backgroundGradient,
      elements: template.elements.map(el => ({
        ...el,
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  saveProject: async (project: StudioProject): Promise<StudioProject> => {
    const projects = studioService.getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject;
    } else {
      projects.unshift(updatedProject);
    }

    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('LocalStorage limit reached for studio projects, trimming thumbnails:', e);
      // If quota exceeded, strip thumbnails of older projects
      const stripped = projects.map((p, idx) => idx > 3 ? { ...p, thumbnail: undefined } : p);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(stripped));
    }

    // Try background sync to Supabase public_tokens / custom table if available
    try {
      await supabase.from('public_tokens').upsert({
        token: `studio_proj_${project.id}`,
        user_id: 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
        used: false,
        client_data: updatedProject,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (err) {
      // Offline fallback is active
    }

    return updatedProject;
  },

  deleteProject: (id: string): boolean => {
    const projects = studioService.getProjects().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return true;
  },

  duplicateProject: (id: string): StudioProject | null => {
    const original = studioService.getProjectById(id);
    if (!original) return null;

    const copy: StudioProject = {
      ...original,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: original.elements.map(el => ({
        ...el,
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }))
    };

    studioService.saveProject(copy);
    return copy;
  },

  // --- CAMPAIGNS ---
  getCampaigns: (): StudioCampaign[] => {
    try {
      const data = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCampaign: (campaign: StudioCampaign): StudioCampaign => {
    const campaigns = studioService.getCampaigns();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    const updated = { ...campaign, updatedAt: new Date().toISOString() };

    if (existingIndex >= 0) {
      campaigns[existingIndex] = updated;
    } else {
      campaigns.unshift(updated);
    }

    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    return updated;
  },

  deleteCampaign: (id: string): boolean => {
    const campaigns = studioService.getCampaigns().filter(c => c.id !== id);
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    return true;
  },

  // --- VIDEO PROJECTS ---
  getVideoProjects: (): StudioVideoProject[] => {
    try {
      const data = localStorage.getItem(VIDEOS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveVideoProject: (video: StudioVideoProject): StudioVideoProject => {
    const videos = studioService.getVideoProjects();
    const existingIndex = videos.findIndex(v => v.id === video.id);
    const updated = { ...video, updatedAt: new Date().toISOString() };

    if (existingIndex >= 0) {
      videos[existingIndex] = updated;
    } else {
      videos.unshift(updated);
    }

    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
    return updated;
  },

  deleteVideoProject: (id: string): boolean => {
    const videos = studioService.getVideoProjects().filter(v => v.id !== id);
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
    return true;
  },

  // --- CLIENT-SIDE AI & CHROMA BACKGROUND REMOVAL ---
  removeImageBackground: async (imageSrc: string, tolerance = 35): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve(imageSrc);

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Sample corners to detect dominant background color
          const corners = [
            [0, 0],
            [canvas.width - 1, 0],
            [0, canvas.height - 1],
            [canvas.width - 1, canvas.height - 1]
          ];

          let bgR = 0, bgG = 0, bgB = 0;
          corners.forEach(([cx, cy]) => {
            const idx = (cy * canvas.width + cx) * 4;
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
          });
          bgR = Math.round(bgR / corners.length);
          bgG = Math.round(bgG / corners.length);
          bgB = Math.round(bgB / corners.length);

          const tol = Math.max(15, tolerance);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Color distance to sampled background
            const dist = Math.sqrt(
              Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
            );

            // Also check pure white/near white studio backgrounds
            const isNearWhite = r > 235 && g > 235 && b > 235;

            if (dist < tol || (isNearWhite && tol > 25)) {
              // Fade edge alpha for smooth border
              if (dist < tol * 0.7) {
                data[i + 3] = 0; // Transparent
              } else {
                data[i + 3] = Math.round(((dist - tol * 0.7) / (tol * 0.3)) * 255);
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Canvas background removal error:', err);
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  },

  // --- WHATSAPP PROMO GENERATOR ---
  generateWhatsAppText: (product: { name: string; price: number; condition?: string; warranty?: string; installments?: number }) => {
    const installVal = product.installments ? product.price / product.installments : product.price / 12;
    const condText = product.condition?.toLowerCase().includes('lacrado') ? 'Aparelho Lacrado com Garantia' : 'Seminovo Impecável Grade A com Garantia';
    
    return `🔥 *OFERTA EXCLUSIVA GODSHOP* 🔥\n\n` +
      `📱 *${product.name.toUpperCase()}*\n` +
      `✨ *Condição:* ${condText}\n` +
      `💰 *Preço à Vista:* ${formatBRL(product.price)}\n` +
      `💳 *Ou em até 12x de ${formatBRL(installVal)}* no cartão!\n` +
      `🛡️ *Garantia:* ${product.warranty || 'Garantia GodShop Inclusa'}\n` +
      `📦 *Acompanha:* Cabo, Carregador e Brindes Especiais!\n\n` +
      `📍 *GODSHOP Celulares & Games*\n` +
      `⚡ *Chame agora e garanta o seu antes que acabe o estoque!*`;
  }
};
