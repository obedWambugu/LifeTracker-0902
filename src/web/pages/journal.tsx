import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, X, Search, Trash2, Edit2, BookOpen, Sparkles, RefreshCw, CheckCircle2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { UpgradeModal } from '../components/UpgradeModal';
import { AdBanner } from '../components/AdBanner';
import { format } from 'date-fns';
import { useSearch } from 'wouter';
import { PROMPTS, PROMPT_CATEGORIES, getRandomPrompt, getDailyPrompt, type Prompt } from '../lib/prompts';

const MOODS = [
  { value: 'excellent', label: 'Excellent', emoji: '😄', color: '#00ff88' },
  { value: 'good', label: 'Good', emoji: '🙂', color: '#00cc6a' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#ffa502' },
  { value: 'poor', label: 'Poor', emoji: '😕', color: '#ff6b81' },
  { value: 'terrible', label: 'Terrible', emoji: '😞', color: '#ff4757' },
];

const CATEGORY_COLORS: Record<string, string> = {
  gratitude: '#00ff88',
  reflection: '#5352ed',
  growth: '#ffa502',
  mindfulness: '#a29bfe',
  goals: '#00d2d3',
  relationships: '#ff6b81',
};

export default function JournalPage() {
  const { isPremium, isTrial, isPostTrial, trialDaysLeft } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [promptFilter, setPromptFilter] = useState<string>('');
  const [form, setForm] = useState({ title: '', content: '', mood: 'neutral', tags: [] as string[], promptId: null as number | null });
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const searchStr = useSearch();
  const showAds = !isPremium;

  const load = async (q?: string) => {
    try {
      const url = q ? `/journal?search=${encodeURIComponent(q)}` : '/journal';
      const data = await api.get(url);
      setEntries(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPostTrial) {
      setLoading(false);
      return;
    }

    load();
    // Check URL params for new entry with prompt
    const params = new URLSearchParams(searchStr);
    if (params.get('new') === '1') {
      setShowForm(true);
      const promptId = params.get('prompt');
      if (promptId) {
        const prompt = PROMPTS.find(p => p.id === parseInt(promptId));
        if (prompt) {
          setForm(f => ({ ...f, content: prompt.text + '\n\n', promptId: prompt.id }));
        }
      }
    }
  }, [isPostTrial, searchStr]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) { toast.error('Content required'); return; }
    try {
      if (editing) {
        await api.put(`/journal/${editing.id}`, form);
        toast.success('Entry updated');
      } else {
        await api.post('/journal', form);
        toast.success('Entry saved');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', content: '', mood: 'neutral', tags: [], promptId: null });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/journal/${id}`);
      toast.success('Deleted');
      if (viewing?.id === id) setViewing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map(e => e.id)));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} journal entr${selected.size > 1 ? 'ies' : 'y'}?`)) return;
    try {
      await api.post('/journal/bulk-delete', { ids: Array.from(selected) });
      toast.success(`${selected.size} entr${selected.size > 1 ? 'ies' : 'y'} deleted`);
      setSelected(new Set());
      setSelectMode(false);
      if (viewing && selected.has(viewing.id)) setViewing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (entry: any) => {
    setEditing(entry);
    setForm({ title: entry.title || '', content: entry.content, mood: entry.mood, tags: entry.tags ? JSON.parse(entry.tags) : [], promptId: entry.promptId || null });
    setViewing(null);
    setShowForm(true);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
      if (!form.tags.includes(tag)) {
        setForm({ ...form, tags: [...form.tags, tag] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setForm({ ...form, tags: form.tags.filter(t => t !== tag) });

  const usePrompt = (prompt: Prompt) => {
    setForm({ ...form, content: form.content ? `${form.content}\n\n${prompt.text}\n` : `${prompt.text}\n\n`, promptId: prompt.id });
    setShowPrompts(false);
    toast.success('Prompt added!');
  };

  const applyRandomPrompt = () => {
    const p = getRandomPrompt(promptFilter || undefined);
    usePrompt(p);
  };

  const moodCounts = MOODS.map(m => ({ ...m, count: entries.filter(e => e.mood === m.value).length }));
  const filteredPrompts = promptFilter ? PROMPTS.filter(p => p.category === promptFilter) : PROMPTS;

  if (isPostTrial) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full border border-[#ffa502]/30 bg-[#ffa502]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffa502]">
            Free plan · ads on
          </span>
        </div>

        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffa502]/10 text-[#ffa502]">
            <BookOpen size={28} />
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Journal is locked on the Free plan
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#888]">
            Your 30-day trial has ended. Journal entries, prompts, and export are part of Pro, while the free plan keeps habits and expenses available with ads.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowUpgrade(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ffa502] px-5 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e09500]"
            >
              <Crown size={15} /> Upgrade to Pro
            </button>
            <p className="text-xs text-[#666]">No journal, no prompts, no insights, no freezes.</p>
          </div>
        </div>

        {showAds && <AdBanner slot="journal-locked" className="mt-6" />}
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#ffa502] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Journal</h1>
          <p className="text-[#555] mt-1">Reflect and grow</p>
          <p className="mt-2 text-xs text-[#666]">
            {isPremium ? 'Pro plan active · ads hidden' : `Trial active · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left · ads shown`}
          </p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
              className={`flex items-center gap-2 border px-3 py-2.5 rounded-lg text-sm transition-colors ${selectMode ? 'border-[#ff4757]/30 text-[#ff4757] bg-[#ff4757]/5' : 'border-[#222] text-[#888] hover:text-white hover:border-[#333]'}`}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          <button onClick={() => setShowPrompts(!showPrompts)} className="flex items-center gap-2 border px-3 py-2.5 rounded-lg text-sm transition-colors border-[#ffa502]/30 text-[#ffa502] hover:bg-[#ffa502]/10">
            <Sparkles size={15} /> Prompts
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', content: '', mood: 'neutral', tags: [], promptId: null }); }} className="flex items-center gap-2 bg-[#ffa502] text-[#080808] px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#e09500] transition-colors">
            <Plus size={15} /> New Entry
          </button>
        </div>
      </div>

      {showAds && <AdBanner slot="journal-top" className="mb-6" />}

      {/* Bulk actions bar */}
      {selectMode && entries.length > 0 && (
        <div className="flex items-center justify-between bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 mb-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected.size === entries.length ? 'bg-[#ffa502] border-[#ffa502]' : 'border-[#444]'}`}>
                {selected.size === entries.length && <CheckCircle2 size={12} className="text-[#080808]" />}
              </div>
              Select all
            </button>
            <span className="text-[#555] text-xs">{selected.size} selected</span>
          </div>
          <button
            onClick={bulkDelete}
            disabled={selected.size === 0}
            className="flex items-center gap-2 bg-[#ff4757] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#ee3545] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} /> Delete{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      )}

      {/* Prompts Library Panel */}
      {showPrompts && (
        <div className="mb-6 bg-[#111] border border-[#ffa502]/20 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#ffa502]" />
              <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Prompts Library</h3>
              <span className="text-[#555] text-xs">({filteredPrompts.length} prompts)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={applyRandomPrompt} className="flex items-center gap-1 text-[#ffa502] text-xs hover:underline">
                <RefreshCw size={12} /> Random
              </button>
              <button onClick={() => setShowPrompts(false)} className="text-[#555] hover:text-white"><X size={16} /></button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setPromptFilter('')} className={`px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-colors ${!promptFilter ? 'bg-[#ffa502]/20 text-[#ffa502]' : 'bg-[#1a1a1a] text-[#555] hover:text-white'}`}>
              All
            </button>
            {PROMPT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setPromptFilter(cat === promptFilter ? '' : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize flex-shrink-0 transition-colors ${promptFilter === cat ? 'text-white' : 'text-[#555] hover:text-white'}`}
                style={{ background: promptFilter === cat ? `${CATEGORY_COLORS[cat]}33` : '#1a1a1a' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Prompts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {filteredPrompts.map(prompt => (
              <button
                key={prompt.id}
                onClick={() => {
                  setShowForm(true);
                  setEditing(null);
                  usePrompt(prompt);
                }}
                className="text-left p-3 rounded-lg bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-[#333] transition-all group"
              >
                <p className="text-[#ccc] text-sm group-hover:text-white transition-colors">"{prompt.text}"</p>
                <span className="text-xs capitalize mt-1 inline-block" style={{ color: CATEGORY_COLORS[prompt.category] || '#555' }}>
                  {prompt.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mood stats */}
      {entries.length > 0 && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {moodCounts.map(m => m.count > 0 && (
            <div key={m.value} className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-2.5 flex-shrink-0">
              <span className="text-lg">{m.emoji}</span>
              <div>
                <p className="text-white text-sm font-semibold">{m.count}</p>
                <p className="text-[#555] text-xs">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) load(); }}
            placeholder="Search entries..."
            className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg pl-11 pr-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#ffa502] transition-colors text-sm"
          />
        </div>
        <button type="submit" className="px-5 py-3 bg-[#111] border border-[#1f1f1f] rounded-lg text-[#888] hover:text-white hover:border-[#333] text-sm transition-colors">Search</button>
      </form>

      {/* Two-column layout */}
      <div className={`grid gap-6 ${viewing ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          {entries.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[#ffa502]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-[#ffa502]" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>No entries yet</h3>
              <p className="text-[#555] mb-6">Start your reflection journey</p>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-[#ffa502] text-[#080808] px-6 py-3 rounded-lg font-semibold hover:bg-[#e09500] transition-colors">
                <Plus size={15} /> Write first entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const mood = MOODS.find(m => m.value === entry.mood);
                const tags = entry.tags ? JSON.parse(entry.tags) : [];
                const isActive = viewing?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => selectMode ? toggleSelect(entry.id) : setViewing(isActive ? null : entry)}
                    className={`bg-[#111] border rounded-xl p-5 cursor-pointer transition-all ${selected.has(entry.id) ? 'border-[#ff4757]/30 bg-[#ff4757]/5' : isActive ? 'border-[#ffa502]/30' : 'border-[#1f1f1f] hover:border-[#2a2a2a]'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {selectMode && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${selected.has(entry.id) ? 'bg-[#ff4757] border-[#ff4757]' : 'border-[#444]'}`}>
                            {selected.has(entry.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{mood?.emoji}</span>
                            <h3 className="text-white font-semibold text-sm truncate">{entry.title || 'Untitled'}</h3>
                            {entry.promptId && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffa502]/10 text-[#ffa502]">prompted</span>
                            )}
                          </div>
                          <p className="text-[#555] text-xs line-clamp-2 mb-3">{entry.content}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-[#444] text-xs">{format(new Date(entry.createdAt), 'EEE, MMM d · h:mm a')}</p>
                            {tags.length > 0 && (
                              <div className="flex gap-1">
                                {tags.slice(0, 2).map((t: string) => (
                                  <span key={t} className="text-[#555] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded-full">#{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {!selectMode && (
                        <div className="flex gap-1 ml-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(entry)} className="text-[#444] hover:text-[#888] p-1 transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => deleteEntry(entry.id)} className="text-[#444] hover:text-[#ff4757] p-1 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {viewing && (
          <div className="bg-[#111] border border-[#ffa502]/20 rounded-xl p-6 sticky top-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{MOODS.find(m => m.value === viewing.mood)?.emoji}</span>
                <div>
                  <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{viewing.title || 'Untitled'}</h2>
                  <p className="text-[#555] text-xs">{format(new Date(viewing.createdAt), 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="text-[#555] hover:text-white"><X size={16} /></button>
            </div>
            <div className="text-[#aaa] text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">{viewing.content}</div>
            {viewing.tags && JSON.parse(viewing.tags).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1f1f1f]">
                {JSON.parse(viewing.tags).map((t: string) => (
                  <span key={t} className="text-[#ffa502] text-xs bg-[#ffa502]/10 px-2.5 py-1 rounded-full">#{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Write modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-[#111] border border-[#222] rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[95dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {editing ? 'Edit Entry' : 'New Journal Entry'}
              </h2>
              <div className="flex items-center gap-3">
                {!editing && (
                  <button type="button" onClick={applyRandomPrompt} className="text-[#ffa502] text-xs hover:underline flex items-center gap-1">
                    <Sparkles size={12} /> Random prompt
                  </button>
                )}
                <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#555] hover:text-white"><X size={18} /></button>
              </div>
            </div>
            <form onSubmit={saveEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-2">How are you feeling?</label>
                <div className="flex gap-2">
                  {MOODS.map(m => (
                    <button key={m.value} type="button" onClick={() => setForm({ ...form, mood: m.value })}
                      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all flex-1 ${form.mood === m.value ? 'bg-[#1a1a1a] border border-[#333] scale-105' : 'border border-transparent hover:bg-[#151515]'}`}>
                      <span className="text-xl">{m.emoji}</span>
                      <span className="text-xs" style={{ color: form.mood === m.value ? m.color : '#555' }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1.5">Title <span className="text-[#444]">(optional)</span></label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Entry title..." className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#ffa502] transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1.5">Write it out</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="What's on your mind today?..." rows={8} required
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#ffa502] transition-colors resize-none text-sm leading-relaxed" />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1.5">Tags <span className="text-[#444]">(press Enter to add)</span></label>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="gratitude, work, health..."
                  className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#ffa502] transition-colors text-sm" />
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 text-xs bg-[#ffa502]/10 text-[#ffa502] px-2.5 py-1 rounded-full">
                        #{tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-3 rounded-lg border border-[#222] text-[#888] hover:text-white transition-colors text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-[#ffa502] text-[#080808] font-semibold hover:bg-[#e09500] transition-colors text-sm">{editing ? 'Update' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
