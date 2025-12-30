
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, Map, Tractor, Briefcase, TrendingUp } from 'lucide-react';

export const PotentialAnalysis: React.FC = () => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPotential = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Lakukan analisis potensi Zakat, Infak, dan Sedekah (ZIS) di Kabupaten Tasikmalaya tahun 2025 secara akurat. 
      Sertakan poin-poin berikut dalam format ringkas (bullet points):
      1. Wilayah: Analisis potensi di 39 kecamatan, identifikasi wilayah dengan konsentrasi ekonomi tertinggi (misal: Singaparna, Ciawi, dll).
      2. Pengusaha: Estimasi potensi dari sektor UMKM, kerajinan tangan (bordir, mendong), dan perdagangan.
      3. Pertanian: Potensi dari sektor agraris (padi) dan perikanan darat yang dominan di Tasikmalaya.
      4. Estimasi Angka: Berikan angka estimasi potensi dana ZIS tahunan berdasarkan data ekonomi makro daerah tersebut.
      
      Gunakan bahasa Indonesia yang profesional, optimis, dan informatif. Format output: Markdown sederhana tanpa judul besar.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAnalysis(response.text || 'Gagal memuat analisis potensi.');
    } catch (error) {
      console.error('Error fetching ZIS potential:', error);
      setAnalysis('Terjadi kesalahan saat memproses analisis AI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPotential();
  }, []);

  return (
    <div className="mt-6 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={40} className="text-emerald-600" />
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
          <TrendingUp size={16} />
        </div>
        <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Analisis Potensi ZIS AI (2025)</h4>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-2 text-emerald-600/70">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs font-medium animate-pulse">Menghitung data wilayah, UMKM, dan pertanian...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="prose prose-sm max-w-none">
            <div className="text-[11px] md:text-xs text-slate-600 leading-relaxed space-y-2">
              {analysis.split('\n').filter(l => l.trim()).map((line, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="mt-1.5 shrink-0 w-1 h-1 bg-emerald-500 rounded-full"></div>
                  <span>{line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-col justify-center border-l border-emerald-100 pl-4 gap-3">
             <div className="flex items-center gap-3">
                <Map size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500">39 Kecamatan Terpetakan</span>
             </div>
             <div className="flex items-center gap-3">
                <Briefcase size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500">UMKM Bordir & Kerajinan</span>
             </div>
             <div className="flex items-center gap-3">
                <Tractor size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500">Lumbung Pangan Jawa Barat</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
