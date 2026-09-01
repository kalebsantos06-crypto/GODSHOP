import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { Note, NoteChecklistItem, NoteAudio } from '../types';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Edit2, Search, Check, X, Clock, Calendar, 
  CheckSquare, Square, MoreVertical, Play, Pause, Mic, 
  CheckCircle2, AlertCircle, Copy, AlertTriangle, ChevronDown, 
  RefreshCw, Volume2, Bookmark, User, Tag, ShieldCheck, CornerDownRight, SquareCheck
} from 'lucide-react';
import { startOfDay, differenceInDays, format, parseISO, isSameDay, isAfter, isBefore } from 'date-fns';

export default function Notes() {
  const queryClient = useQueryClient();
  
  // Theme Sync
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('app_theme') as 'light' | 'dark') || 'light');
    };
    window.addEventListener('theme_changed', handleThemeChange);
    return () => window.removeEventListener('theme_changed', handleThemeChange);
  }, []);

  // Page States
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'completed' | 'audio' | 'date'>('all');
  
  // Active Dropdown Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<Note['category']>('Geral');
  const [formPriority, setFormPriority] = useState<Note['priority']>('Normal');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formDueTime, setFormDueTime] = useState<string>('');
  
  // Form Checklist States
  const [checklistItems, setChecklistItems] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  // Audio Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Queries
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: () => db.notes.list(),
  });

  const { data: checklistData = [], isLoading: isLoadingChecklist } = useQuery<NoteChecklistItem[]>({
    queryKey: ['note_checklist_items'],
    queryFn: () => db.note_checklist_items.list(),
  });

  const { data: audioData = [], isLoading: isLoadingAudio } = useQuery<NoteAudio[]>({
    queryKey: ['note_audio'],
    queryFn: () => db.note_audio.list(),
  });

  // Mutate Handlers
  const addMutation = useMutation({
    mutationFn: async (newNote: Omit<Note, 'id' | 'created_at'>) => {
      const created = await db.notes.create(newNote);
      
      // Save checklist items
      for (const item of checklistItems) {
        await db.note_checklist_items.create({
          note_id: created.id,
          text: item.text,
          completed: item.completed
        });
      }

      // Save audio if any
      if (audioBase64) {
        await db.note_audio.create({
          note_id: created.id,
          audio_url: audioBase64,
          duration: audioDuration
        });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
      queryClient.invalidateQueries({ queryKey: ['note_audio'] });
      resetForm();
      setIsAdding(false);
      toast.success('Anotação adicionada com sucesso!');
    },
    onError: () => toast.error('Erro ao adicionar anotação.')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, items, audio }: { id: string; data: Partial<Note>; items?: typeof checklistItems; audio?: { url: string; duration: number } }) => {
      await db.notes.update(id, data);
      
      if (items) {
        // Simple strategy: delete current and recreate
        const existingItems = checklistData.filter(i => i.note_id === id);
        for (const item of existingItems) {
          await db.note_checklist_items.delete(item.id);
        }
        for (const item of items) {
          await db.note_checklist_items.create({
            note_id: id,
            text: item.text,
            completed: item.completed
          });
        }
      }

      if (audio) {
        const existingAudios = audioData.filter(a => a.note_id === id);
        for (const a of existingAudios) {
          await db.note_audio.delete(a.id);
        }
        await db.note_audio.create({
          note_id: id,
          audio_url: audio.url,
          duration: audio.duration
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
      queryClient.invalidateQueries({ queryKey: ['note_audio'] });
      resetForm();
      setEditingNote(null);
      toast.success('Anotação atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar anotação.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.notes.delete(id);
      // Clean up related checklist and audios
      const existingItems = checklistData.filter(i => i.note_id === id);
      for (const item of existingItems) {
        await db.note_checklist_items.delete(item.id);
      }
      const existingAudios = audioData.filter(a => a.note_id === id);
      for (const a of existingAudios) {
        await db.note_audio.delete(a.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
      queryClient.invalidateQueries({ queryKey: ['note_audio'] });
      toast.success('Anotação removida!');
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao excluir anotação.')
  });

  // Checklist item toggle inside Card (without opening edit modal)
  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, completed, noteId }: { itemId: string; completed: boolean; noteId: string }) => {
      await db.note_checklist_items.update(itemId, { completed });

      // Check if all checklist items for this note are completed
      const allNoteItems = checklistData.filter(i => i.note_id === noteId);
      const updatedItems = allNoteItems.map(i => i.id === itemId ? { ...i, completed } : i);
      const allCompleted = updatedItems.length > 0 && updatedItems.every(i => i.completed);

      // If all completed, auto mark note as completed
      if (allCompleted) {
        await db.notes.update(noteId, { 
          completed: true, 
          completed_at: new Date().toISOString() 
        });
        toast.success('Todas as tarefas concluídas! Anotação finalizada ✓');
      } else {
        // If they were all completed but now one is unchecked, mark note as pending if it was auto-completed
        const currentNote = notes.find(n => n.id === noteId);
        if (currentNote?.completed && !completed) {
          await db.notes.update(noteId, { 
            completed: false, 
            completed_at: null 
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
    }
  });

  // Note Complete Toggle
  const toggleNoteCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await db.notes.update(id, { 
        completed, 
        completed_at: completed ? new Date().toISOString() : null 
      });

      // Also toggle all checklist items to matches completion status
      const noteItems = checklistData.filter(i => i.note_id === id);
      for (const item of noteItems) {
        if (item.completed !== completed) {
          await db.note_checklist_items.update(item.id, { completed });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
      toast.success('Status da anotação atualizado!');
    }
  });

  // Duplicate Note
  const duplicateNoteMutation = useMutation({
    mutationFn: async (note: Note) => {
      const created = await db.notes.create({
        title: `${note.title} (Cópia)`,
        description: note.description,
        category: note.category,
        priority: note.priority,
        due_date: note.due_date,
        due_time: note.due_time,
        completed: false,
        completed_at: null
      });

      const noteItems = checklistData.filter(i => i.note_id === note.id);
      for (const item of noteItems) {
        await db.note_checklist_items.create({
          note_id: created.id,
          text: item.text,
          completed: false
        });
      }

      const noteAudios = audioData.filter(a => a.note_id === note.id);
      for (const a of noteAudios) {
        await db.note_audio.create({
          note_id: created.id,
          audio_url: a.audio_url,
          duration: a.duration
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note_checklist_items'] });
      queryClient.invalidateQueries({ queryKey: ['note_audio'] });
      toast.success('Anotação duplicada!');
    }
  });

  // Form Checklist Handlers
  const addFormChecklistItem = () => {
    if (!newChecklistItemText.trim()) return;
    setChecklistItems(prev => [...prev, { text: newChecklistItemText.trim(), completed: false }]);
    setNewChecklistItemText('');
  };

  const removeFormChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleFormChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.map((item, i) => i === index ? { ...item, completed: !item.completed } : item));
  };

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Permissão de microfone negada. Certifique-se de liberar o microfone no seu navegador ou abra o aplicativo em uma nova aba fora do painel!', {
          duration: 6000
        });
      } else {
        toast.error('Não foi possível acessar o microfone para gravação de voz.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setAudioDuration(recordingTime);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current) {
          const stream = mediaRecorderRef.current.stream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
      audioChunksRef.current = [];
      setAudioBase64(null);
      toast.info('Gravação de voz cancelada');
    }
  };

  const deleteFormAudio = () => {
    setAudioBase64(null);
    setAudioDuration(0);
    toast.success('Áudio removido');
  };

  // Menu click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Geral');
    setFormPriority('Normal');
    setFormDueDate('');
    setFormDueTime('');
    setChecklistItems([]);
    setNewChecklistItemText('');
    setAudioBase64(null);
    setAudioDuration(0);
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const openAddModal = () => {
    resetForm();
    setIsAdding(true);
  };

  const openEditModal = (note: Note) => {
    resetForm();
    setEditingNote(note);
    setFormTitle(note.title);
    setFormDescription(note.description);
    setFormCategory(note.category);
    setFormPriority(note.priority);
    setFormDueDate(note.due_date || '');
    setFormDueTime(note.due_time || '');

    // Get note items
    const items = checklistData.filter(i => i.note_id === note.id);
    setChecklistItems(items.map(i => ({ text: i.text, completed: i.completed })));

    // Get note audio
    const audio = audioData.find(a => a.note_id === note.id);
    if (audio) {
      setAudioBase64(audio.audio_url);
      setAudioDuration(audio.duration);
    }
  };

  const saveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('O título da anotação é obrigatório!');
      return;
    }

    const notePayload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      priority: formPriority,
      due_date: formDueDate || null,
      due_time: formDueTime || null,
      completed: editingNote ? editingNote.completed : false,
      completed_at: editingNote ? editingNote.completed_at : null
    };

    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        data: notePayload,
        items: checklistItems,
        audio: audioBase64 ? { url: audioBase64, duration: audioDuration } : undefined
      });
    } else {
      addMutation.mutate(notePayload);
    }
  };

  // Logic Calculations for Indicators
  const indicators = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let pendentes = 0;
    let paraHoje = 0;
    let atrasadas = 0;
    let concluidas = 0;

    notes.forEach(note => {
      if (note.completed) {
        concluidas++;
      } else {
        pendentes++;
        if (note.due_date) {
          if (note.due_date === todayStr) {
            paraHoje++;
          } else if (note.due_date < todayStr) {
            atrasadas++;
          }
        }
      }
    });

    return { pendentes, paraHoje, atrasadas, concluidas };
  }, [notes]);

  // Filtering & Searching Logic
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // 1. Search Query
      const matchesSearch = 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (selectedFilter === 'pending') return !note.completed;
      if (selectedFilter === 'completed') return note.completed;
      if (selectedFilter === 'audio') {
        return audioData.some(a => a.note_id === note.id);
      }
      if (selectedFilter === 'date') return !!note.due_date;

      return true;
    });
  }, [notes, searchTerm, selectedFilter, audioData]);

  // Determine date indicator status
  const getDueStatus = (dueDateStr: string | null | undefined, completed: boolean) => {
    if (!dueDateStr) return { label: 'Sem data', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/10' };
    if (completed) return { label: 'Concluída', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10' };

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if (dueDateStr < todayStr) {
      return { label: '🔴 Vencida', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 font-bold' };
    } else if (dueDateStr === todayStr) {
      return { label: '🟡 Hoje', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 font-bold' };
    } else if (dueDateStr === tomorrowStr) {
      return { label: '🔵 Amanhã', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20 font-medium' };
    } else {
      return { label: `📅 ${format(parseISO(dueDateStr), 'dd/MM/yyyy')}`, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
    }
  };

  const getPriorityStyle = (priority: Note['priority']) => {
    switch (priority) {
      case 'Baixa':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/15';
      case 'Normal':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/15';
      case 'Alta':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/15';
      case 'Urgente':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20 font-black animate-pulse';
    }
  };

  const getCategoryStyle = (category: Note['category']) => {
    switch (category) {
      case 'Geral': return 'text-zinc-500 bg-zinc-500/10';
      case 'Clientes': return 'text-purple-500 bg-purple-500/10';
      case 'Produtos': return 'text-emerald-500 bg-emerald-500/10';
      case 'Vendas': return 'text-cyan-500 bg-cyan-500/10';
      case 'Financeiro': return 'text-green-500 bg-green-500/10 font-bold';
      case 'Fornecedores': return 'text-orange-500 bg-orange-500/10';
      case 'Compras': return 'text-pink-500 bg-pink-500/10';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Trigger sound alarm or toast notification for due items when page loads
  useEffect(() => {
    if (notes.length > 0) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const dueTodayCount = notes.filter(n => !n.completed && n.due_date === todayStr).length;
      if (dueTodayCount > 0) {
        toast.info(`Lembrete: Você tem ${dueTodayCount} anotação(ões) agendada(s) para HOJE! 🔔`, {
          duration: 6000
        });
      }
    }
  }, [notes]);

  return (
    <div className="space-y-6">
      
      {/* 1. Toolbar & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Anotações <span className="text-xs px-2.5 py-1 bg-indigo-500/15 text-indigo-500 rounded-full border border-indigo-500/25 font-bold uppercase tracking-wider">{filteredNotes.length}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie tarefas, checklist de estoque e grave lembretes em áudio da sua loja</p>
        </div>
        
        <button
          onClick={openAddModal}
          className="py-3 px-5 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Nova anotação
        </button>
      </div>

      {/* Filters & Search Row */}
      <div className="space-y-3 mb-6 bg-white/30 dark:bg-zinc-900/30 border border-black/5 dark:border-white/5 backdrop-blur-sm p-3 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar título, conteúdo ou descrição..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-zinc-950/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
          />
        </div>

        {/* Dynamic Navigation pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                : 'bg-white/50 dark:bg-zinc-950/20 hover:bg-white/80 dark:hover:bg-zinc-900/40 border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedFilter('pending')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition ${
              selectedFilter === 'pending'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                : 'bg-white/50 dark:bg-zinc-950/20 hover:bg-white/80 dark:hover:bg-zinc-900/40 border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setSelectedFilter('completed')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition ${
              selectedFilter === 'completed'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                : 'bg-white/50 dark:bg-zinc-950/20 hover:bg-white/80 dark:hover:bg-zinc-900/40 border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            Concluídas
          </button>
          <button
            onClick={() => setSelectedFilter('audio')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition ${
              selectedFilter === 'audio'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                : 'bg-white/50 dark:bg-zinc-950/20 hover:bg-white/80 dark:hover:bg-zinc-900/40 border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            🎙️ Com Áudio
          </button>
          <button
            onClick={() => setSelectedFilter('date')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition ${
              selectedFilter === 'date'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                : 'bg-white/50 dark:bg-zinc-950/20 hover:bg-white/80 dark:hover:bg-zinc-900/40 border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            📅 Com Data
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div>
        {isLoadingNotes || isLoadingChecklist ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-muted-foreground font-semibold">Carregando anotações sincronizadas...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/20 dark:bg-zinc-900/20 border border-dashed border-black/10 dark:border-white/10 rounded-2xl text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
            <h3 className="font-bold text-sm text-foreground">Nenhuma anotação encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">Crie lembretes, check-lists de tarefas para o dia e configure áudios para otimizar os processos da loja.</p>
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition cursor-pointer"
            >
              Criar Primeira Anotação
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => {
              const noteItems = checklistData.filter(i => i.note_id === note.id);
              const completedItems = noteItems.filter(i => i.completed).length;
              const noteAudio = audioData.find(a => a.note_id === note.id);
              const dueStatus = getDueStatus(note.due_date, note.completed);

              return (
                <div 
                  key={note.id}
                  className={`bg-white/50 dark:bg-zinc-900/45 border backdrop-blur-sm rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 relative flex flex-col justify-between ${
                    note.completed 
                      ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                      : 'border-black/5 dark:border-white/5'
                  }`}
                >
                  
                  {/* Card Header Actions */}
                  <div>
                    <div className="flex items-start justify-between gap-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        {/* 4. Checkbox de conclusão */}
                        <button
                          onClick={() => toggleNoteCompleteMutation.mutate({ id: note.id, completed: !note.completed })}
                          className={`p-1 rounded-lg border transition duration-200 cursor-pointer ${
                            note.completed 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-white/50 dark:bg-zinc-950/20 border-black/15 dark:border-white/10 hover:border-indigo-500'
                          }`}
                        >
                          <Check className={`h-4 w-4 stroke-[3px] transition-transform duration-200 ${note.completed ? 'scale-100' : 'scale-0'}`} />
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getPriorityStyle(note.priority)}`}>
                            {note.priority}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryStyle(note.category)} border-black/5 dark:border-white/5`}>
                            {note.category}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === note.id ? null : note.id);
                          }}
                          className="p-1 rounded-lg hover:bg-muted/15 transition cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === note.id && (
                          <div 
                            ref={menuRef}
                            className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-20 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                openEditModal(note);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/10 transition flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                              ✏️ Editar
                            </button>

                            <button
                              onClick={() => {
                                toggleNoteCompleteMutation.mutate({ id: note.id, completed: !note.completed });
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/10 transition flex items-center gap-2 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              {note.completed ? '↩️ Reabrir' : '✓ Concluir'}
                            </button>

                            <button
                              onClick={() => {
                                duplicateNoteMutation.mutate(note);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/10 transition flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 text-indigo-500" />
                              📋 Duplicar
                            </button>

                            <button
                              onClick={() => {
                                setDeleteId(note.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/5 transition flex items-center gap-2 cursor-pointer border-t border-black/5 dark:border-white/5"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              🗑️ Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Note Content */}
                    <div className="space-y-1 mb-3">
                      <h4 className={`font-bold text-sm tracking-tight text-foreground transition-all duration-300 ${note.completed ? 'line-through opacity-50' : ''}`}>
                        {note.title}
                      </h4>
                      {note.description && (
                        <p className={`text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap ${note.completed ? 'opacity-40' : ''}`}>
                          {note.description}
                        </p>
                      )}
                    </div>

                    {/* 3. Checklist Items inside card */}
                    {noteItems.length > 0 && (
                      <div className="space-y-1.5 border-t border-black/5 dark:border-white/5 pt-2.5 mb-3.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Checklist</span>
                          <span className="text-indigo-500">{completedItems}/{noteItems.length} concluídas</span>
                        </div>
                        
                        {/* Task Checklist list */}
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                          {noteItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, completed: !item.completed, noteId: note.id })}
                              className="w-full flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-muted/10 transition cursor-pointer"
                            >
                              {item.completed ? (
                                <SquareCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-muted-foreground/60" />
                              )}
                              <span className={`text-xs leading-none ${item.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                                {item.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Player */}
                    {noteAudio && (
                      <div className="border-t border-black/5 dark:border-white/5 pt-2.5 mb-3.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1.5">
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Lembrete de Áudio</span>
                        </div>
                        <AudioPlayer url={noteAudio.audio_url} duration={noteAudio.duration} />
                      </div>
                    )}
                  </div>

                  {/* Card Footer Info */}
                  <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2.5 mt-auto text-[10px] font-bold text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] uppercase font-black ${dueStatus.color}`}>
                        {dueStatus.label}
                      </span>
                      {note.due_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {note.due_time}
                        </span>
                      )}
                    </div>
                    <span>Criado: {format(parseISO(note.created_at), 'dd/MM/yyyy')}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Modal de Nova / Editar Anotação */}
      {(isAdding || editingNote) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 z-[100] overflow-y-auto overscroll-contain">
          <div className="bg-card dark:bg-zinc-900 border border-border/80 dark:border-white/10 rounded-2xl w-full max-w-lg h-auto max-h-[92dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/60 dark:border-white/10 flex items-center justify-between shrink-0 bg-muted/10">
              <h2 className="text-lg sm:text-xl font-black text-foreground">
                {editingNote ? '✏️ Editar Anotação' : '📝 Nova Anotação'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                  setEditingNote(null);
                }}
                className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted transition cursor-pointer text-muted-foreground hover:text-foreground"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={saveNote} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Título</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Conferir aparelhos do estoque"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Descrição / Conteúdo</label>
                    <textarea
                      rows={3}
                      placeholder="Escreva os detalhes ou anotações..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Categoria</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as Note['category'])}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    >
                      <option value="Geral">Geral</option>
                      <option value="Clientes">Clientes</option>
                      <option value="Produtos">Produtos</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Fornecedores">Fornecedores</option>
                      <option value="Compras">Compras</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Prioridade</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Note['priority'])}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Data Limite (Opcional)</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Hora Limite (Opcional)</label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    />
                  </div>
                </div>

                {/* 3. Checklist Items Builder inside modal */}
                <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-3">
                  <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                    Checklist de Tarefas
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar tarefa ao checklist..."
                      value={newChecklistItemText}
                      onChange={(e) => setNewChecklistItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFormChecklistItem();
                        }
                      }}
                      className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-muted/40 border border-black/10 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground"
                    />
                    <button
                      type="button"
                      onClick={addFormChecklistItem}
                      className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {checklistItems.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded-xl border border-muted/10 text-xs gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFormChecklistItem(index)}
                          className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1"
                        >
                          {item.completed ? (
                            <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={`break-words min-w-0 flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.text}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFormChecklistItem(index)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition cursor-pointer shrink-0"
                          title="Remover item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Audio Recorder Block inside modal */}
                <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-3">
                  <label className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Mic className="h-4 w-4" />
                    🎙️ Gravar Lembrete por Voz
                  </label>

                  {!isRecording && !audioBase64 ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full flex items-center justify-center gap-2.5 py-3 border border-dashed border-indigo-500/30 hover:border-indigo-500 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 transition cursor-pointer text-indigo-500 text-xs font-bold"
                    >
                      <Mic className="h-4 w-4" />
                      Iniciar Gravação de Áudio
                    </button>
                  ) : isRecording ? (
                    <div className="flex items-center justify-between bg-rose-500/5 px-4 py-3 rounded-xl border border-rose-500/20 text-rose-500">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider animate-pulse">Gravando...</span>
                        <span className="font-mono text-xs">{formatRecordingTime(recordingTime)}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-bold transition text-foreground cursor-pointer flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Cancelar</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          Parar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/5 px-4 py-3 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                          <Check className="h-4 w-4 stroke-[3px]" />
                          Voz Gravada com Sucesso
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md text-[10px] font-bold text-indigo-500 transition cursor-pointer"
                          >
                            Gravar Novamente
                          </button>
                          <button
                            type="button"
                            onClick={deleteFormAudio}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 rounded-md text-[10px] font-bold text-rose-500 transition cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      {audioBase64 && <AudioPlayer url={audioBase64} duration={audioDuration} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-border/80 dark:border-white/10 flex items-center justify-end gap-2.5 shrink-0 bg-muted/20 dark:bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAdding(false);
                    setEditingNote(null);
                  }}
                  className="px-4 py-2.5 bg-muted/80 hover:bg-muted rounded-xl text-xs font-bold transition text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  {addMutation.isPending || updateMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 stroke-[2.5px]" />
                  )}
                  <span>{editingNote ? 'Salvar Alterações' : 'Criar Anotação'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            
            <h3 className="text-lg font-black text-foreground mb-1.5">Excluir Anotação?</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Esta ação é irreversível. A anotação, checklist e os áudios associados serão removidos permanentemente.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold text-foreground cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                <span>Voltar</span>
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Custom Premium Audio Player component
function AudioPlayer({ url, duration }: { url: string; duration: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 w-full">
      <button
        onClick={togglePlay}
        type="button"
        className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition cursor-pointer flex items-center justify-center"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSliderChange}
        className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
      
      <span className="text-[10px] text-muted-foreground font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
