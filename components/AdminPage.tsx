
import React, { useState, useEffect, useRef } from 'react';
import { DashboardData, ZakatCategory } from '../types';
import { 
  Save, RefreshCcw, Database, FileSpreadsheet, Settings, User, Server, 
  Trash2, Plus, Info, LayoutTemplate, Building, Calendar, Palette, Lock, ShieldCheck, Eye, EyeOff, AlertCircle, Download, Camera, X, CheckCircle2, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminPageProps {
  data: DashboardData;
  onSave: (newData: DashboardData) => void;
  onSync: (id: string) => Promise<void>;
  isSyncing: boolean;
}

type AdminTab = 'general' | 'sync' | 'categories' | 'security';

export const AdminPage: React.FC<AdminPageProps> = ({ data, onSave, onSync, isSyncing }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('general');
  // Initialize state only once from props to avoid overwriting user input during background syncs
  const [formData, setFormData] = useState<DashboardData>({ ...data });
  const [sheetId, setSheetId] = useState(data.spreadsheetId || '');
  const [newCat, setNewCat] = useState({ name: '', target: 0, color: '#10b981' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Security Tab State
  const [newPin, setNewPin] = useState(data.adminPin || '');
  const [confirmPin, setConfirmPin] = useState(data.adminPin || '');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // We only sync from props if the ID or DataSource changes externally, 
  // but we avoid full formData overwrite to prevent losing current edits.
  useEffect(() => {
    if (data.spreadsheetId !== sheetId) {
      setSheetId(data.spreadsheetId || '');
    }
  }, [data.spreadsheetId]);

  const handleDownloadExcelTemplate = () => {
    // --- 1. Tab Instructions ---
    const wsInstructions = XLSX.utils.aoa_to_sheet([
      ["PANDUAN PENGISIAN DATA DASHBOARD BAZNAS 2025"],
      [""],
      ["A. STRUKTUR TAB"],
      ["1. 'Daily': Masukkan rincian transaksi harian di sini. Ini adalah SUMBER UTAMA data."],
      ["2. 'Categories': Daftar kategori & target tahunan. Nilai 'Collected' & 'Muzaki' akan terhitung otomatis."],
      ["3. 'History': Daftar bulan untuk grafik tren. Nilai 'Amount' akan terhitung otomatis."],
      [""],
      ["B. CARA PENGGUNAAN"],
      ["1. Upload file ini ke Google Drive dan buka sebagai Google Sheets."],
      ["2. Masukkan ID Spreadsheet ke Panel Admin Dashboard."],
      ["3. Pastikan format TANGGAL pada kolom 'Date' adalah YYYY-MM-DD."],
      ["4. Jangan mengubah nama Tab (Daily, Categories, History) agar sinkronisasi tidak error."],
      [""],
      ["C. TIPS"],
      ["- Gunakan kolom 'Category' di tab 'Daily' yang sama persis dengan nama di tab 'Categories'."],
      ["- Untuk Muzaki Count, isi jumlah jiwa (misal Zakat Fitrah 1 keluarga isi 5)."]
    ]);

    // --- 2. Tab Categories (Setup 2025) ---
    const default2025Categories = [
      ["UPZ (Unit Pengumpul Zakat)", 0, 18000000000, 0, "#059669"],
      ["Desa & Komunitas", 0, 10000000000, 0, "#0891b2"],
      ["Program Muzaki", 0, 7000000000, 0, "#4f46e5"],
      ["Retail Korporasi", 0, 5000000000, 0, "#d97706"],
      ["Digital Fundraising", 0, 5000000000, 0, "#db2777"]
    ];

    const categoriesRows = default2025Categories.map((c, i) => {
      const rowIndex = i + 2;
      return [
        c[0], // Name
        { f: `SUMIF(Daily!$C$2:$C$10000, A${rowIndex}, Daily!$B$2:$B$10000)` }, // Collected
        c[2], // Target
        { f: `SUMIF(Daily!$C$2:$C$10000, A${rowIndex}, Daily!$E$2:$E$10000)` }, // Muzaki
        c[4]  // Color
      ];
    });

    const wsCategories = XLSX.utils.aoa_to_sheet([
      ["Name", "Collected", "Target", "Muzaki", "Color"],
      ...categoriesRows
    ]);

    // --- 3. Tab History (Full 2025 Months) ---
    const months2025 = [
      ["Januari", "2025-01-01"], ["Februari", "2025-02-01"], ["Maret", "2025-03-01"],
      ["April", "2025-04-01"], ["Mei", "2025-05-01"], ["Juni", "2025-06-01"],
      ["Juli", "2025-07-01"], ["Agustus", "2025-08-01"], ["September", "2025-09-01"],
      ["Oktober", "2025-10-01"], ["November", "2025-11-01"], ["Desember", "2025-12-01"]
    ];

    const historyRows = months2025.map((m, i) => {
      const rowIndex = i + 2;
      return [
        m[0], // Month Name
        m[1], // Start Date
        { f: `SUMIFS(Daily!$B$2:$B$10000, Daily!$A$2:$A$10000, ">="&B${rowIndex}, Daily!$A$2:$A$10000, "<"&EDATE(B${rowIndex}, 1))` }, // Monthly Sum
        "Semua Kategori"
      ];
    });

    const wsHistory = XLSX.utils.aoa_to_sheet([
      ["Month", "Date", "Amount", "Category"],
      ...historyRows
    ]);

    // --- 4. Tab Daily (Sample 2025 Data) ---
    const dailySampleData = [
      ["2025-01-05", 2500000, "UPZ (Unit Pengumpul Zakat)", "UPZ Masjid Al-Ikhlas", 1, "Zakat Mal Pengurus"],
      ["2025-01-12", 5000000, "Digital Fundraising", "Donatur Web", 1, "Sedekah Online via QRIS"],
      ["2025-01-20", 15000000, "Retail Korporasi", "PT. Tasik Jaya", 1, "Zakat Perusahaan"],
      ["2025-02-02", 750000, "Desa & Komunitas", "H. Maimun", 1, "Infaq Jum'at"],
      ["2025-02-14", 3200000, "Program Muzaki", "Ibu Ratna", 4, "Fidyah Sekeluarga"],
      ["2025-02-28", 10000000, "UPZ (Unit Pengumpul Zakat)", "UPZ Kec. Singaparna", 25, "Laporan Bulanan UPZ"]
    ];

    const wsDaily = XLSX.utils.aoa_to_sheet([
      ["Date", "Amount", "Category", "Muzaki Name", "Muzaki Count (Jiwa)", "Description"],
      ...dailySampleData
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    XLSX.utils.book_append_sheet(wb, wsCategories, "Categories");
    XLSX.utils.book_append_sheet(wb, wsHistory, "History");
    XLSX.utils.book_append_sheet(wb, wsDaily, "Daily");

    XLSX.writeFile(wb, `Template_BAZNAS_2025_${formData.institutionName.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimum 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData({ ...formData, institutionLogo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleCategoryChange = (index: number, field: keyof ZakatCategory, value: string | number) => {
    const newCategories = [...formData.categories];
    const numValue = (field === 'collected' || field === 'target' || field === 'muzaki') ? (parseInt(value.toString()) || 0) : value;
    newCategories[index] = { ...newCategories[index], [field]: numValue };
    
    const totalCollected = newCategories.reduce((acc, cat) => acc + (cat.collected || 0), 0);
    const totalTarget = newCategories.reduce((acc, cat) => acc + (cat.target || 0), 0);
    const totalMuzaki = newCategories.reduce((acc, cat) => acc + (cat.muzaki || 0), 0);

    setFormData({ 
      ...formData, 
      categories: newCategories,
      totalCollected,
      totalTarget,
      totalMuzaki
    });
  };

  const addCategory = () => {
    if (!newCat.name) return alert('Nama kategori harus diisi');
    const updatedCategories = [...formData.categories, { 
      name: newCat.name, 
      target: newCat.target, 
      collected: 0, 
      muzaki: 0, 
      color: newCat.color 
    }];
    
    setFormData({
      ...formData,
      categories: updatedCategories,
      totalTarget: updatedCategories.reduce((acc, c) => acc + c.target, 0)
    });
    setNewCat({ name: '', target: 0, color: '#10b981' });
  };

  const removeCategory = (index: number) => {
    const updatedCategories = formData.categories.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      categories: updatedCategories,
      totalTarget: updatedCategories.reduce((acc, c) => acc + c.target, 0),
      totalCollected: updatedCategories.reduce((acc, c) => acc + c.collected, 0),
      totalMuzaki: updatedCategories.reduce((acc, c) => acc + c.muzaki, 0)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'security' && newPin !== confirmPin) {
      alert('PIN Baru dan Konfirmasi PIN tidak cocok!');
      return;
    }

    const updatedData = {
      ...formData,
      adminPin: newPin,
      spreadsheetId: sheetId,
      lastUpdate: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    onSave(updatedData);
    alert('Konfigurasi berhasil disimpan!');
  };

  const pinsMatch = newPin === confirmPin;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in-row pb-12">
      
      {/* TABS NAVIGATION */}
      <div className="flex overflow-x-auto custom-scrollbar bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
        <button onClick={() => setActiveTab('general')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'general' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={16} /> Umum</button>
        <button onClick={() => setActiveTab('sync')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'sync' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><RefreshCcw size={16} /> Sinkronisasi</button>
        <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'categories' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutTemplate size={16} /> Kategori</button>
        <button onClick={() => setActiveTab('security')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'security' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Lock size={16} /> Keamanan</button>
      </div>

      <div className="space-y-6">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-fade-in-row">
            <div className="flex items-center gap-2 mb-8"><div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Settings size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Pengaturan Umum Lembaga</h3></div>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logo Lembaga (Ratio 1:1)</label>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center transition-all group-hover:border-emerald-500">
                      {formData.institutionLogo ? <img src={formData.institutionLogo} alt="Logo" className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-300" />}
                    </div>
                    {formData.institutionLogo && <button onClick={() => setFormData({ ...formData, institutionLogo: '' })} className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-lg"><X size={14} /></button>}
                  </div>
                  <div className="space-y-2">
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"><Camera size={14} /> Pilih Logo</button>
                    <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, WEBP. Maks 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <Building size={14} /> Nama Lembaga
                  </label>
                  <input 
                    type="text" 
                    value={formData.institutionName} 
                    onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })} 
                    className="w-full border-2 border-slate-200 bg-white rounded-2xl px-5 py-4 text-sm focus:border-emerald-500 outline-none font-bold text-slate-700 transition-all shadow-sm" 
                    placeholder="Contoh: BAZNAS Kabupaten Tasikmalaya"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <Calendar size={14} /> Periode Tahun
                  </label>
                  <input 
                    type="text" 
                    value={formData.periodYear} 
                    onChange={(e) => setFormData({ ...formData, periodYear: e.target.value })} 
                    className="w-full border-2 border-slate-200 bg-white rounded-2xl px-5 py-4 text-sm focus:border-emerald-500 outline-none font-bold text-slate-700 transition-all shadow-sm" 
                    placeholder="Contoh: 2025"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYNC TAB */}
        {activeTab === 'sync' && (
          <div className="space-y-6 animate-fade-in-row">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 px-4"><h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight">Pilih Sumber Data</h3><p className="text-xs text-slate-500">Gunakan Google Sheets untuk update data secara otomatis.</p></div>
              <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto">
                <button onClick={() => setFormData({ ...formData, dataSource: 'manual' })} className={`flex-1 md:w-40 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.dataSource === 'manual' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}><User size={14} /> Manual</button>
                <button onClick={() => setFormData({ ...formData, dataSource: 'sheets' })} className={`flex-1 md:w-40 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.dataSource === 'sheets' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Server size={14} /> Sheets</button>
              </div>
            </div>

            <div className={`bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative transition-all ${formData.dataSource === 'sheets' ? 'ring-4 ring-blue-500/10' : 'opacity-60 grayscale pointer-events-none'}`}>
              <div className="flex items-center gap-2 mb-8"><div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Database size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Konfigurasi Smart-Sync</h3></div>
              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Spreadsheet ID</label>
                  <div className="flex flex-col sm:flex-row gap-3"><input type="text" value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="Paste ID Spreadsheet..." className="flex-1 border-2 border-slate-200 bg-white rounded-2xl px-5 py-4 text-sm focus:border-blue-500 outline-none font-mono shadow-sm" /><button type="button" onClick={() => onSync(sheetId)} disabled={!sheetId || isSyncing} className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-xs font-black hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">{isSyncing ? <RefreshCcw className="animate-spin" size={16} /> : <RefreshCcw size={16} />} Test</button></div>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                      <div className="flex items-center gap-3 mb-4 text-blue-700"><HelpCircle size={20} /><h4 className="text-xs font-black uppercase tracking-wider">Cara Setup Google Sheets</h4></div>
                      <ul className="space-y-3">
                        <li className="flex gap-3 text-[11px] text-slate-600 font-medium leading-relaxed"><CheckCircle2 className="text-emerald-500 shrink-0" size={14} /><span>Buat file Google Sheets baru.</span></li>
                        <li className="flex gap-3 text-[11px] text-slate-600 font-medium leading-relaxed"><CheckCircle2 className="text-emerald-500 shrink-0" size={14} /><span>Unduh dan salin tab template ke file Anda.</span></li>
                        <li className="flex gap-3 text-[11px] text-slate-600 font-medium leading-relaxed"><CheckCircle2 className="text-emerald-500 shrink-0" size={14} /><span>Klik Share > Anyone with the link can view.</span></li>
                        <li className="flex gap-3 text-[11px] text-slate-600 font-medium leading-relaxed"><CheckCircle2 className="text-emerald-500 shrink-0" size={14} /><span>Salin ID dari URL (antara /d/ dan /edit).</span></li>
                      </ul>
                    </div>
                    
                    <div className="p-6 bg-blue-50/50 rounded-3xl border-2 border-blue-100 border-dashed flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1"><h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Download Template 2025</h4><p className="text-[10px] text-blue-700/70">Tersedia data sampel & target periode 2025.</p></div>
                        <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-100"><FileSpreadsheet size={24} /></div>
                      </div>
                      <button type="button" onClick={handleDownloadExcelTemplate} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"><Download size={18} /> Template BAZNAS 2025</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-fade-in-row">
            <div className="flex items-center gap-2 mb-8"><div className="p-2 bg-amber-50 rounded-xl text-amber-600"><LayoutTemplate size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Target Kategori</h3></div>
            <div className="mb-10 p-6 bg-amber-50/50 rounded-3xl border-2 border-amber-100 space-y-6">
              <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">Tambah Kategori Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5"><input type="text" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Nama Kategori..." className="w-full border-2 border-slate-200 bg-white rounded-2xl px-5 py-4 text-sm focus:border-amber-500 outline-none font-bold" /></div>
                <div className="sm:col-span-4"><input type="number" value={newCat.target || ''} onChange={(e) => setNewCat({ ...newCat, target: parseInt(e.target.value) || 0 })} placeholder="Target (Rp)" className="w-full border-2 border-slate-200 bg-white rounded-2xl px-5 py-4 text-sm focus:border-amber-500 outline-none font-bold" /></div>
                <div className="sm:col-span-1"><input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="w-full h-14 p-1.5 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer" /></div>
                <div className="sm:col-span-2"><button type="button" onClick={addCategory} className="w-full h-14 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-amber-100"><Plus size={20} /></button></div>
              </div>
            </div>
            <div className="space-y-6">
              {formData.categories.map((cat, idx) => (
                <div key={idx} className="group p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-amber-200 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <input type="color" value={cat.color} onChange={(e) => handleCategoryChange(idx, 'color', e.target.value)} className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer bg-transparent shadow-sm" />
                      <input type="text" value={cat.name} onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)} className="font-black text-slate-800 text-lg bg-transparent border-b-2 border-transparent focus:border-amber-500 outline-none px-1" />
                    </div>
                    <button type="button" onClick={() => removeCategory(idx)} className="p-3 bg-white text-slate-300 hover:text-rose-500 rounded-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Thn (Rp)</label><input type="number" value={cat.target} disabled={formData.dataSource === 'sheets'} onChange={(e) => handleCategoryChange(idx, 'target', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none font-black disabled:bg-slate-100 shadow-sm" /></div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Terhimpun (Rp)</label><input type="number" value={cat.collected} disabled={formData.dataSource === 'sheets'} onChange={(e) => handleCategoryChange(idx, 'collected', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none font-black disabled:bg-slate-100 shadow-sm" /></div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzaki (Jiwa)</label><input type="number" value={cat.muzaki} disabled={formData.dataSource === 'sheets'} onChange={(e) => handleCategoryChange(idx, 'muzaki', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none font-black disabled:bg-slate-100 shadow-sm" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-fade-in-row">
            <div className="flex items-center gap-2 mb-8"><div className="p-2 bg-slate-100 rounded-xl text-slate-800"><Lock size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Proteksi Administrator</h3></div>
            <div className="max-w-2xl space-y-8">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4"><ShieldCheck className="text-emerald-600 shrink-0" size={24} /><div className="space-y-1"><h4 className="text-sm font-black text-slate-800">Ubah PIN Admin</h4><p className="text-xs text-slate-500 leading-relaxed">Gunakan kombinasi huruf, angka, dan simbol untuk keamanan maksimal.</p></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PIN Baru</label><div className="relative"><input type={showPin ? "text" : "password"} value={newPin} onChange={(e) => setNewPin(e.target.value)} className={`w-full border-2 ${!pinsMatch && confirmPin ? 'border-rose-100 bg-rose-50/30' : 'border-slate-200 bg-white'} rounded-2xl px-6 py-4 text-lg font-black tracking-widest focus:border-slate-800 outline-none transition-all shadow-sm`} /><button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Konfirmasi PIN Baru</label><div className="relative"><input type={showConfirmPin ? "text" : "password"} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className={`w-full border-2 ${!pinsMatch && confirmPin ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'} rounded-2xl px-6 py-4 text-lg font-black tracking-widest focus:border-slate-800 outline-none transition-all shadow-sm`} /><button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              </div>
              {!pinsMatch && confirmPin && <div className="flex items-center gap-2 text-rose-500 animate-fade-in-row"><AlertCircle size={14} /><p className="text-[10px] font-black uppercase tracking-widest">PIN tidak cocok.</p></div>}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.15em] mb-2">Karakter yang didukung:</p><div className="flex flex-wrap gap-2"><span className="px-2 py-1 bg-white text-[9px] font-bold text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">A-Z</span><span className="px-2 py-1 bg-white text-[9px] font-bold text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">0-9</span><span className="px-2 py-1 bg-white text-[9px] font-bold text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">@#$!%^&*</span></div></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-8">
        <button onClick={handleSubmit} disabled={activeTab === 'security' && !pinsMatch} className={`w-full sm:w-auto px-16 py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-sm ${activeTab === 'security' && !pinsMatch ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}><Save size={22} /> Simpan Perubahan</button>
      </div>
    </div>
  );
};
