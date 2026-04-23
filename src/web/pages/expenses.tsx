import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, Edit2, X, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartPie, Pie, Cell, Legend } from 'recharts';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Other'];
const CAT_COLORS: Record<string, string> = {
  Food: '#00ff88',
  Transport: '#5352ed',
  Entertainment: '#ffa502',
  Utilities: '#00d2d3',
  Healthcare: '#ff6b81',
  Shopping: '#eccc68',
  Other: '#888',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-xs">
        <p className="text-[#888] mb-1">{label}</p>
        <p className="text-white font-mono font-bold">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [activeMonth, setActiveMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: format(new Date(), 'yyyy-MM-dd'), isRecurring: false });
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const [view, setView] = useState<'list' | 'chart'>('list');

  const load = async () => {
    try {
      const [e, b] = await Promise.all([
        api.get(`/expenses?month=${activeMonth}`),
        api.get(`/budgets?month=${activeMonth}`),
      ]);
      setExpenses(e);
      setBudgets(b);
      const bf: Record<string, string> = {};
      CATEGORIES.forEach(cat => {
        const found = b.find((x: any) => x.category === cat);
        bf[cat] = found ? String(found.amount) : '';
      });
      setBudgetForm(bf);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeMonth]);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map(cat => ({
    name: cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    budget: budgets.find(b => b.category === cat)?.amount || 0,
    color: CAT_COLORS[cat],
  })).filter(c => c.total > 0);

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error('Valid amount required'); return; }
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, { ...form, amount: parseFloat(form.amount) });
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
        toast.success('Expense logged');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ amount: '', category: 'Food', description: '', date: format(new Date(), 'yyyy-MM-dd'), isRecurring: false });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveBudgets = async () => {
    try {
      await Promise.all(
        CATEGORIES.map(cat => {
          const val = parseFloat(budgetForm[cat]);
          if (!isNaN(val) && val > 0) {
            return api.put(`/budgets/${cat}`, { amount: val, month: activeMonth });
          }
          return Promise.resolve();
        })
      );
      toast.success('Budgets saved');
      setShowBudget(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#5352ed] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Expenses</h1>
          <p className="text-[#555] mt-1">Monitor your spending</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBudget(true)} className="flex items-center gap-2 border border-[#222] text-[#888] hover:text-white hover:border-[#333] px-4 py-2.5 rounded-lg text-sm transition-colors">
            Set Budgets
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ amount: '', category: 'Food', description: '', date: format(new Date(), 'yyyy-MM-dd'), isRecurring: false }); }} className="flex items-center gap-2 bg-[#5352ed] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#4240d4] transition-colors">
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* Month selector + Summary */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={activeMonth} onChange={e => setActiveMonth(e.target.value)} className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#5352ed] transition-colors">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div className="flex bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
          <button onClick={() => setView('list')} className={`px-4 py-2 text-sm transition-colors ${view === 'list' ? 'bg-[#5352ed]/10 text-[#5352ed]' : 'text-[#555] hover:text-white'}`}>List</button>
          <button onClick={() => setView('chart')} className={`px-4 py-2 text-sm transition-colors ${view === 'chart' ? 'bg-[#5352ed]/10 text-[#5352ed]' : 'text-[#555] hover:text-white'}`}>Charts</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[#555] text-xs mb-2">Total Spent</p>
          <p className="text-4xl font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            ${totalSpend.toFixed(2)}
          </p>
          <p className="text-[#555] text-xs mt-1">{expenses.length} transactions</p>
        </div>
        {byCategory.slice(0, 2).map(cat => (
          <div key={cat.name} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              <p className="text-[#555] text-xs">{cat.name}</p>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: cat.color, fontFamily: 'JetBrains Mono, monospace' }}>
              ${cat.total.toFixed(2)}
            </p>
            {cat.budget > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((cat.total / cat.budget) * 100, 100)}%`, background: cat.total > cat.budget ? '#ff4757' : cat.color }} />
                </div>
                <p className="text-[#444] text-xs mt-1">${cat.budget} budget</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts view */}
      {view === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
            <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>By Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
            <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>Budget vs Actual</h3>
            <div className="space-y-3 mt-2">
              {CATEGORIES.map(cat => {
                const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                const budget = budgets.find(b => b.category === cat)?.amount || 0;
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const color = CAT_COLORS[cat];
                if (spent === 0 && budget === 0) return null;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#888]">{cat}</span>
                      <span className="text-white font-mono">${spent.toFixed(0)}{budget > 0 ? ` / $${budget}` : ''}</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${budget > 0 ? pct : 30}%`, background: spent > budget && budget > 0 ? '#ff4757' : color, opacity: budget > 0 ? 1 : 0.3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#5352ed]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign size={28} className="text-[#5352ed]" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>No expenses yet</h3>
          <p className="text-[#555] mb-6">Start tracking your spending</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-[#5352ed] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4240d4] transition-colors">
            <Plus size={15} /> Add first expense
          </button>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1f1f1f]">
            <h3 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Transactions</h3>
          </div>
          {expenses.map((exp, i) => (
            <div key={exp.id} className={`flex items-center gap-4 px-4 py-3.5 hover:bg-[#151515] transition-colors ${i < expenses.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${CAT_COLORS[exp.category] || '#888'}22` }}>
                <span className="text-xs font-bold" style={{ color: CAT_COLORS[exp.category] || '#888' }}>
                  {exp.category[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{exp.description || exp.category}</p>
                <p className="text-[#444] text-xs mt-0.5">{exp.category} · {exp.date}</p>
              </div>
              <p className="text-white font-mono font-medium">${exp.amount.toFixed(2)}</p>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(exp); setForm({ amount: String(exp.amount), category: exp.category, description: exp.description || '', date: exp.date, isRecurring: exp.isRecurring || false }); setShowForm(true); }} className="text-[#444] hover:text-[#888] p-1 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deleteExpense(exp.id)} className="text-[#444] hover:text-[#ff4757] p-1 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-[#111] border border-[#222] rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {editing ? 'Edit Expense' : 'Log Expense'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#555] hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Amount (KES)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#5352ed] transition-colors font-mono text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5352ed] transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5352ed] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Description <span className="text-[#444]">(optional)</span></label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Lunch at Java" className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#5352ed] transition-colors" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-3 rounded-lg border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-[#5352ed] text-white font-semibold hover:bg-[#4240d4] transition-colors text-sm">{editing ? 'Update' : 'Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-[#111] border border-[#222] rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Monthly Budgets</h2>
              <button onClick={() => setShowBudget(false)} className="text-[#555] hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }} />
                  <label className="text-white text-sm flex-1">{cat}</label>
                  <input type="number" step="1" value={budgetForm[cat] || ''} onChange={e => setBudgetForm({ ...budgetForm, [cat]: e.target.value })} placeholder="0" className="w-28 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-white placeholder-[#444] focus:outline-none focus:border-[#5352ed] text-sm text-right font-mono" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBudget(false)} className="flex-1 py-3 rounded-lg border border-[#222] text-[#888] hover:text-white transition-colors text-sm">Cancel</button>
              <button onClick={saveBudgets} className="flex-1 py-3 rounded-lg bg-[#5352ed] text-white font-semibold hover:bg-[#4240d4] transition-colors text-sm">Save Budgets</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
