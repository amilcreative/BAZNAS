
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Line, ComposedChart, Area, AreaChart, BarChart
} from 'recharts';
import { 
  LayoutDashboard, Users, TrendingUp, Wallet, 
  Target, Calendar, Download, RefreshCw, ChevronRight,
  Smartphone, Building2, UserCheck, MapPin, Settings, LogOut, Filter, X, Loader2,
  Database, BrainCircuit, Sparkles, Menu, Activity, Globe, ChevronDown, ListFilter, User, ArrowUpRight, Lock, Key, Eye, EyeOff
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { DEFAULT_DATA, FORMAT_CURRENCY, STORAGE_KEY, FORMAT_NUMBER } from './constants';
import { StatCard } from './components/StatCard';
import { AdminPage } from './components/AdminPage';
import { AIInsights } from './components/AIInsights';
import { AnimatedNumber } from './components/AnimatedNumber';
import { DashboardData, ZakatCategory, MonthlyData, PredictionPoint, DailyData } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [data, setData] = useState<DashboardData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_DATA;
  });
  
  // Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [predictions, setPredictions] = useState<PredictionPoint[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);

  const pollIntervalRef = useRef<number | null>(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365); // Show a year by default for monthly trend
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // PIN Logic
  const handleAdminAccess = () => {
    if (isAdminAuthenticated) {
      setView('admin');
      setIsSidebarOpen(false);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === data.adminPin) { 
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setView('admin');
      setPinInput('');
      setPinError(false);
      setIsSidebarOpen(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // AI Prediction Logic
  const generatePredictions = useCallback(async (currentData: DashboardData) => {
    if (!process.env.API_KEY) return;
    setIsPredicting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const historyStr = currentData.monthlyHistory.map(h => `${h.month}: ${h.amount}`).join(', ');
      
      const prompt = `Analisis data historis bulanan ${currentData.institutionName}: [${historyStr}]. 
      Target tahunan total adalah ${currentData.totalTarget}. 
      Prediksikan nilai penghimpunan untuk bulan-bulan yang tersisa di tahun ${currentData.periodYear}. 
      Berikan respon dalam format JSON array yang berisi objek dengan properti "month", "amount", dan "type" (set ke "predicted"). 
      Sertakan juga data historis yang sudah ada with "type" set ke "actual".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                month: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING }
              },
              required: ['month', 'amount', 'type']
            }
          }
        }
      });

      const result = JSON.parse(response.text || '[]');
      setPredictions(result);
    } catch (error) {
      console.error('Error generating AI predictions:', error);
    } finally {
      setIsPredicting(false);
    }
  }, []);

  const parseCSV = (csv: string) => {
    const rows = csv.split('\n').map(row => row.trim()).filter(row => row !== '');
    if (rows.length === 0) return [];
    const headers = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/"/g, '').trim().toLowerCase());
    return rows.slice(1).map(row => {
      const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
      return headers.reduce((obj: any, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
  };

  const syncWithGoogleSheets = useCallback(async (sheetId: string, showLoader = true) => {
    if (!sheetId) return;
    if (showLoader) setIsSyncing(true);
    try {
      const [catRes, histRes, dailyRes] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Categories`),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=History`),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Daily`)
      ]);
      if (!catRes.ok || !histRes.ok || !dailyRes.ok) throw new Error('Gagal mengambil data dari Google Sheets.');
      const [catCSV, histCSV, dailyCSV] = await Promise.all([catRes.text(), histRes.text(), dailyRes.text()]);
      const parsedCats = parseCSV(catCSV);
      const parsedHist = parseCSV(histCSV);
      const parsedDaily = parseCSV(dailyCSV);
      const categories: ZakatCategory[] = parsedCats.map(c => ({
        name: c.name || c.nama || c.category || c.kategori || 'Tanpa Nama',
        collected: parseInt(c.collected?.toString().replace(/[^\d]/g, '') || '0') || 0,
        target: parseInt(c.target?.toString().replace(/[^\d]/g, '') || '0') || 0,
        muzaki: parseInt(c.muzaki?.toString().replace(/[^\d]/g, '') || '0') || 0,
        color: c.color || c.warna || '#10b981'
      })).filter(c => c.name !== 'Tanpa Nama');
      const monthlyHistory: MonthlyData[] = parsedHist.map(h => ({
        month: h.month || h.bulan || '?',
        date: h.date || h.tanggal || '',
        amount: parseInt(h.amount?.toString().replace(/[^\d]/g, '') || '0') || 0,
        category: h.category || h.kategori || 'Umum'
      }));
      const dailyHistory: DailyData[] = parsedDaily.map(d => ({
        date: d.date || d.tanggal || '',
        amount: parseInt(d.amount?.toString().replace(/[^\d]/g, '') || '0') || 0,
        label: (d.date || d.tanggal) ? new Date(d.date || d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '?',
        category: d.category || d.kategori || 'Umum'
      }));
      const totalCollected = categories.reduce((acc, c) => acc + c.collected, 0);
      const totalTarget = categories.reduce((acc, c) => acc + c.target, 0);
      const totalMuzaki = categories.reduce((acc, c) => acc + c.muzaki, 0);
      const newData: DashboardData = {
        ...data,
        spreadsheetId: sheetId,
        categories,
        monthlyHistory,
        dailyHistory,
        totalCollected,
        totalTarget,
        totalMuzaki,
        lastUpdate: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dataSource: 'sheets'
      };
      setData(newData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Spreadsheet Sync Error:', error);
    } finally {
      if (showLoader) setIsSyncing(false);
    }
  }, [data]);

  useEffect(() => {
    if (data.dataSource === 'sheets' && data.spreadsheetId && isAutoSyncEnabled) {
      syncWithGoogleSheets(data.spreadsheetId, false);
      pollIntervalRef.current = window.setInterval(() => {
        syncWithGoogleSheets(data.spreadsheetId!, false);
      }, 60000);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [data.dataSource, data.spreadsheetId, isAutoSyncEnabled, syncWithGoogleSheets]);

  useEffect(() => { generatePredictions(data); }, [data.totalCollected, data.totalTarget, generatePredictions]);

  const handleSaveData = (newData: DashboardData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    generatePredictions(newData);
  };

  const baseFilteredMonthlyHistory = useMemo(() => {
    let filtered = data.monthlyHistory.filter(m => m.date >= startDate && m.date <= endDate);
    if (selectedCategory !== 'Semua Kategori') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    } else {
      // Group by month name/date if multiple categories exist in the history sheet
      const aggMap = new Map<string, MonthlyData>();
      filtered.forEach(m => {
        const key = m.month + m.date;
        if (aggMap.has(key)) {
          aggMap.get(key)!.amount += m.amount;
        } else {
          aggMap.set(key, { ...m });
        }
      });
      filtered = Array.from(aggMap.values());
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  }, [data.monthlyHistory, startDate, endDate, selectedCategory]);

  const stats = useMemo(() => {
    const dailyFiltered = data.dailyHistory.filter(d => {
      const matchDate = d.date >= startDate && d.date <= endDate;
      const matchCat = selectedCategory === 'Semua Kategori' || d.category === selectedCategory;
      return matchDate && matchCat;
    });

    if (selectedCategory === 'Semua Kategori') {
      return {
        collected: data.totalCollected,
        target: data.totalTarget,
        muzaki: data.totalMuzaki,
        filteredCollected: dailyFiltered.reduce((acc, d) => acc + d.amount, 0)
      };
    }
    const cat = data.categories.find(c => c.name === selectedCategory);
    return {
      collected: cat?.collected || 0,
      target: cat?.target || 0,
      muzaki: cat?.muzaki || 0,
      filteredCollected: dailyFiltered.reduce((acc, d) => acc + d.amount, 0)
    };
  }, [selectedCategory, data, startDate, endDate]);

  const percentageAchieved = useMemo(() => 
    stats.target > 0 ? Math.min(100, Math.round((stats.collected / stats.target) * 100)) : 0, 
    [stats]
  );

  const resetFilter = () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedCategory('Semua Kategori');
    setIsDateFilterActive(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => setView('dashboard')}>
          {data.institutionLogo ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg group-hover:scale-110 transition-transform bg-white">
              <img src={data.institutionLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
              {data.institutionName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-bold text-slate-800 leading-tight text-sm md:text-base break-words max-w-[140px]">
              {data.institutionName.split(' ')[0]}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              {data.institutionName.split(' ').slice(1).join(' ') || 'DASHBOARD'}
            </p>
          </div>
        </div>
        <nav className="space-y-1">
          <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'dashboard' ? 'text-emerald-600 bg-emerald-50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={handleAdminAccess} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'admin' ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {isAdminAuthenticated ? <Settings size={20} /> : <Lock size={20} className="text-slate-400" />} 
            Admin Control
          </button>
        </nav>
      </div>
      {isAdminAuthenticated && (
        <div className="mt-auto p-6 border-t border-slate-100">
           <button onClick={() => { setIsAdminAuthenticated(false); setView('dashboard'); }} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-medium">
             <LogOut size={20} /> Logout Admin
           </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowLoginModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fade-in-row overflow-hidden border border-slate-100">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Lock size={120} />
            </div>
            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-inner border border-emerald-100/50">
                <Key size={40} className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Akses Administrator</h3>
                <p className="text-slate-500 text-sm">Masukan PIN untuk mengakses panel kontrol.</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <input 
                    autoFocus
                    type={showPinLogin ? "text" : "password"}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN"
                    className={`w-full bg-slate-50 border-2 ${pinError ? 'border-rose-500 animate-shake' : 'border-slate-100'} focus:border-emerald-500 focus:bg-white rounded-2xl px-6 py-4 text-center text-xl font-black tracking-widest outline-none transition-all shadow-inner`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPinLogin(!showPinLogin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2"
                  >
                    {showPinLogin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pinError && <p className="text-rose-500 text-xs font-bold uppercase tracking-widest animate-fade-in-row">PIN yang Anda masukkan salah!</p>}
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="button" onClick={() => setShowLoginModal(false)} className="px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Batal</button>
                  <button type="submit" className="px-6 py-4 rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95 uppercase tracking-widest text-xs">Login Admin</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {data.institutionLogo ? (
            <div className="w-8 h-8 rounded overflow-hidden shadow bg-white">
              <img src={data.institutionLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white font-bold text-sm">
              {data.institutionName.charAt(0)}
            </div>
          )}
          <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{data.institutionName}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Menu size={24} /></button>
      </div>

      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-shrink-0 flex-col z-20 shadow-sm"><SidebarContent /></aside>

      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden shadow-2xl animate-fade-in-row">
            <div className="absolute top-4 right-4"><button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button></div>
            <SidebarContent />
          </aside>
        </>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col gap-4 mb-8 sticky top-[-1px] md:top-0 bg-slate-50/80 backdrop-blur-md z-10 py-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{view === 'dashboard' ? 'Monitoring Penghimpunan' : 'Manajemen Dashboard'}</h2>
                {isSyncing && <Loader2 className="animate-spin text-emerald-600" size={20} />}
                {data.dataSource === 'sheets' && !isSyncing && (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>LIVE SHEET</span>
                )}
              </div>
              <p className="text-slate-500 text-xs md:text-sm flex items-center gap-2 mt-1 font-medium"><Calendar size={14} className="text-emerald-500" /> Update Terakhir: {data.lastUpdate}</p>
            </div>

            {view === 'dashboard' && (
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {data.dataSource === 'sheets' && (
                  <button 
                    onClick={() => syncWithGoogleSheets(data.spreadsheetId!)}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                )}

                <div className="relative flex-1 md:flex-none">
                  <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full md:w-auto flex items-center justify-between gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-700 hover:border-emerald-500 transition-all shadow-sm">
                    <div className="flex items-center gap-2"><ListFilter size={16} className="text-emerald-600" /><span className="truncate max-w-[120px]">{selectedCategory}</span></div>
                    <ChevronDown size={14} />
                  </button>
                  {isCategoryDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 w-full md:min-w-[220px] bg-white border border-slate-200 shadow-xl rounded-2xl py-2 z-50 animate-fade-in-row">
                      <button onClick={() => { setSelectedCategory('Semua Kategori'); setIsCategoryDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs md:text-sm ${selectedCategory === 'Semua Kategori' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}>Semua Kategori</button>
                      {data.categories.map((cat) => (
                        <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setIsCategoryDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs md:text-sm flex items-center gap-2 ${selectedCategory === cat.name ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>{cat.name}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex-1 md:flex-none">
                  <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`w-full md:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border ${isDateFilterActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 shadow-sm'}`}><Filter size={16} /> Tanggal</button>
                  {isFilterOpen && (
                    <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 z-50 w-full md:min-w-[300px] animate-fade-in-row">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                           <label className="text-[10px] font-black uppercase text-slate-400">Rentang Waktu</label>
                           <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={resetFilter} className="flex-1 px-3 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Reset</button>
                          <button onClick={() => { setIsFilterOpen(false); setIsDateFilterActive(true); }} className="flex-1 px-3 py-3 text-xs font-bold text-white bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors">Terapkan</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {view === 'dashboard' ? (
          <div className="space-y-6 animate-fade-in-row">
            {/* LARGE HERO TARGET SECTION - ENLARGED */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-2xl shadow-emerald-900/10 border border-slate-100 overflow-hidden relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-50 rounded-full opacity-40 blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-50 rounded-full opacity-40 blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-emerald-200">Annual Target</span>
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      Th. Anggaran {data.periodYear}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <AnimatedNumber 
                      value={stats.target} 
                      className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-none block"
                    />
                    <p className="text-slate-500 font-bold text-sm md:text-xl max-w-2xl leading-relaxed mt-4">
                      Target penghimpunan {data.institutionName} untuk mewujudkan kesejahteraan umat di Kabupaten Tasikmalaya.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                     <div className="flex items-center gap-3 text-emerald-700 font-black bg-emerald-50/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-emerald-100 shadow-md transition-all hover:scale-105 hover:bg-emerald-100">
                        <div className="p-2 bg-white rounded-xl shadow-inner">
                           <ArrowUpRight size={24} className="text-emerald-600" />
                        </div>
                        <div>
                           <AnimatedNumber value={stats.collected} className="text-2xl md:text-3xl tracking-tighter block" />
                           <span className="text-[10px] uppercase font-black opacity-60 tracking-widest">Dana Terhimpun</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 text-blue-700 font-black bg-blue-50/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-blue-100 shadow-md transition-all hover:scale-105 hover:bg-blue-100">
                        <div className="p-2 bg-white rounded-xl shadow-inner">
                           <Users size={24} className="text-blue-600" />
                        </div>
                        <div>
                           <span className="text-2xl md:text-3xl tracking-tighter block">{FORMAT_NUMBER(stats.muzaki)}</span>
                           <span className="text-[10px] uppercase font-black opacity-60 tracking-widest">Total Muzaki</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-48 h-48 md:w-64 md:h-64 mb-4 group cursor-pointer">
                    <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity"></div>
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                      <circle cx="50%" cy="50%" r="44%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                      <circle 
                        cx="50%" cy="50%" r="44%" 
                        stroke="currentColor" 
                        strokeWidth="16" 
                        fill="transparent" 
                        strokeDasharray="283" 
                        strokeDashoffset={283 - (283 * percentageAchieved) / 100} 
                        strokeLinecap="round" 
                        className="text-emerald-600 transition-all duration-1000 ease-out shadow-sm" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl md:text-6xl font-black text-slate-900 leading-none tracking-tighter">{percentageAchieved}%</span>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Achieved</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ENHANCED PROGRESS BAR - ENLARGED */}
              <div className="mt-12 relative">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg animate-pulse">
                      <Activity size={18} />
                    </div>
                    <div>
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none">Live Progress Tracking</span>
                       <span className="text-sm font-black text-emerald-700">Periode Berjalan</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <AnimatedNumber 
                      value={Math.max(0, stats.target - stats.collected)} 
                      className="text-xl md:text-3xl font-black text-emerald-900 tracking-tighter block leading-none"
                    />
                    <span className="text-[10px] block font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">Kekurangan Target</span>
                  </div>
                </div>
                
                <div className="w-full h-10 md:h-12 bg-slate-100 rounded-3xl overflow-hidden shadow-inner border border-slate-200/50 relative p-1">
                  {/* The Main Progress Bar */}
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl transition-all duration-1000 ease-out shadow-lg relative min-w-[20px]" 
                    style={{ width: `${percentageAchieved}%` }}
                  >
                    {/* Moving Stripes Effect */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,1)_50%,rgba(255,255,255,1)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-stripes"></div>
                    
                    {/* Shimmer / Glossy Sweep Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/3 animate-shimmer"></div>

                    {/* Glowing Tip at the end of the bar */}
                    {percentageAchieved > 0 && (
                      <div className="absolute right-1 top-1 bottom-1 w-2 bg-white blur-[1px] opacity-80 rounded-full"></div>
                    )}
                    {percentageAchieved > 0 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-300 rounded-full blur-[10px] opacity-60 animate-pulse"></div>
                    )}
                  </div>
                </div>
                
                {/* Marker indicators for visual depth */}
                <div className="flex justify-between px-2 mt-2">
                   {[0, 25, 50, 75, 100].map(mark => (
                     <div key={mark} className="flex flex-col items-center">
                        <div className="w-px h-2 bg-slate-200"></div>
                        <span className="text-[9px] font-black text-slate-300 mt-1">{mark}%</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard title="Dana Terhimpun" value={FORMAT_CURRENCY(stats.collected)} subtitle="Total Dana Saat Ini" icon={<Wallet size={20} />} color="bg-emerald-600" />
              <StatCard title="Total Muzaki" value={FORMAT_NUMBER(stats.muzaki)} subtitle="Jiwa Terdaftar" icon={<Users size={20} />} color="bg-purple-600" />
              <StatCard title="Filtered Total" value={FORMAT_CURRENCY(stats.filteredCollected)} subtitle="Berdasarkan Filter" icon={<Activity size={20} />} color="bg-amber-500" />
              <StatCard title="Sisa Target" value={FORMAT_CURRENCY(Math.max(0, stats.target - stats.collected))} subtitle="Kekurangan Thd Target" icon={<Target size={20} />} color="bg-rose-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Breakdown Kategori Table */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg tracking-tight">Breakdown Kategori</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-[0.2em]">
                        SUMBER DATA: {data.dataSource === 'sheets' ? 'LIVE GOOGLE SHEETS' : 'ENTRI MANUAL'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <LayoutDashboard size={20} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-5">Kategori Penghimpunan</th>
                          <th className="px-8 py-5 text-right">Dana Terhimpun</th>
                          <th className="px-8 py-5 text-right">Muzaki</th>
                          <th className="px-8 py-5 text-right">Target</th>
                          <th className="px-8 py-5">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.categories.map((cat) => {
                          const catPercent = cat.target > 0 ? Math.min(100, Math.round((cat.collected / cat.target) * 100)) : 0;
                          return (
                            <tr key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`cursor-pointer group transition-colors ${selectedCategory === cat.name ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                              <td className="px-8 py-6 flex items-center gap-4">
                                <div className="w-4 h-4 rounded-lg shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: cat.color }}></div>
                                <span className="text-sm font-black text-slate-700">{cat.name}</span>
                              </td>
                              <td className="px-8 py-6 text-right text-sm font-black text-slate-900">{FORMAT_CURRENCY(cat.collected)}</td>
                              <td className="px-8 py-6 text-right text-sm font-bold text-purple-600">{FORMAT_NUMBER(cat.muzaki)} <span className="text-[9px] uppercase opacity-50">Jiwa</span></td>
                              <td className="px-8 py-6 text-right text-sm font-medium text-slate-400">{FORMAT_CURRENCY(cat.target)}</td>
                              <td className="px-8 py-6">
                                <div className="w-full min-w-[150px] h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50 relative p-0.5">
                                  <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative" 
                                    style={{ width: `${catPercent}%`, backgroundColor: cat.color }}
                                  >
                                    <div className="absolute inset-0 opacity-15 bg-[linear-gradient(45deg,rgba(255,255,255,1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,1)_50%,rgba(255,255,255,1)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-stripes"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full animate-shimmer"></div>
                                  </div>
                                </div>
                                <div className="text-[9px] font-black text-slate-400 mt-1 text-right">{catPercent}%</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6 uppercase tracking-wider text-sm"><Activity size={18} className="text-emerald-600" />Tren Bulanan: {selectedCategory}</h3>
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={baseFilteredMonthlyHistory}>
                        <defs>
                          <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `Rp${v/1000000}jt`} tick={{fontSize: 10, fontWeight: 700}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v: number) => [FORMAT_CURRENCY(v), 'Dana']} />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <AIInsights data={data} />
              </div>
            </div>
          </div>
        ) : (
          <AdminPage data={data} onSave={handleSaveData} onSync={syncWithGoogleSheets} isSyncing={isSyncing} />
        )}
      </main>
    </div>
  );
};

export default App;
