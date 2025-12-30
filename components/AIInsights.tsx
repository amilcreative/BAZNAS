
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DashboardData } from '../types';
import { Sparkles, Loader2, Lightbulb, PlayCircle, Zap, RefreshCw, ChevronRight } from 'lucide-react';

interface AIInsightsProps {
  data: DashboardData;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ data }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  const generateInsights = async () => {
    setLoading(true);
    setHasGenerated(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const categoryDetails = data.categories.map(cat => 
        `- ${cat.name}: Dana ${cat.collected.toLocaleString('id-ID')} (${Math.round(cat.collected / (cat.target || 1) * 100)}% dari target), Muzaki: ${cat.muzaki.toLocaleString('id-ID')} jiwa`
      ).join('\n');

      const prompt = `Sebagai konsultan ahli zakat BAZNAS, lakukan analisis mendalam terhadap data penghimpunan ${data.institutionName} periode ${data.periodYear}:
      
      DATA RINGKASAN:
      Total Target: ${data.totalTarget.toLocaleString('id-ID')}
      Total Terhimpun: ${data.totalCollected.toLocaleString('id-ID')}
      Total Muzaki: ${data.totalMuzaki.toLocaleString('id-ID')} jiwa
      
      DATA PER KATEGORI:
      ${categoryDetails}
      
      INSTRUKSI ANALISIS:
      Berikan laporan strategis yang mencakup:
      1. **Performa Terhadap Target**: Evaluasi posisi saat ini.
      2. **Analisis Efisiensi Muzaki**: Hubungkan jumlah muzaki dengan dana yang terhimpun per kategori. Identifikasi kategori mana yang paling efektif mengajak muzaki dan mana yang perlu dioptimalkan.
      3. **Rekomendasi Spesifik**: Berikan 3 poin tindakan konkret untuk sisa tahun ini.
      
      Gunakan format Markdown yang rapi. Gunakan bahasa yang profesional dan tajam. Berikan respon dalam Bahasa Indonesia.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setInsight(response.text || 'Gagal memuat analisis.');
    } catch (error) {
      console.error('Error generating AI insights:', error);
      setInsight('Maaf, analisis AI saat ini tidak tersedia. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10 overflow-hidden relative flex flex-col h-full min-h-[450px]">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles size={160} />
      </div>
      
      <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
            <Sparkles size={18} className="text-emerald-200" />
          </div>
          <h3 className="font-bold text-lg tracking-wide uppercase">AI Strategic Insights</h3>
        </div>
        {hasGenerated && !loading && (
          <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">
            Analysis Ready
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col relative z-10">
        {!hasGenerated ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in-row">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-2xl relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
              <Lightbulb size={48} className="text-emerald-200 relative z-10" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-xl">Dapatkan Insight Strategis</h4>
              <p className="text-emerald-100/70 text-sm max-w-[240px] mx-auto leading-relaxed text-center">
                Gunakan kecerdasan buatan untuk menganalisis performa penghimpunan dan pola muzaki Anda secara otomatis.
              </p>
            </div>
            <button 
              onClick={generateInsights}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-50 transition-all active:scale-95 text-xs"
            >
              <PlayCircle size={20} className="group-hover:rotate-12 transition-transform" />
              Generate Analisis
            </button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-400/20 border-t-emerald-200 rounded-full animate-spin"></div>
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-emerald-100 font-bold text-lg">
                Sedang Menganalisis...
              </p>
              <p className="text-[10px] text-emerald-200/60 uppercase tracking-[0.2em] font-black">
                AI sedang mengolah data muzaki
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 mb-4">
              <div className="prose prose-sm prose-invert max-w-none">
                <div className="text-emerald-50 leading-relaxed text-sm">
                  {insight.split('\n').map((line, i) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return <div key={i} className="h-4"></div>;
                    
                    if (trimmedLine.startsWith('###')) {
                      return (
                        <h4 key={i} className="text-white font-black text-lg mt-8 mb-4 border-l-4 border-emerald-400 pl-3">
                          {trimmedLine.replace(/###/g, '').trim()}
                        </h4>
                      );
                    }
                    
                    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                      return (
                        <p key={i} className="mt-6 mb-2">
                          <strong className="text-emerald-200 font-bold text-base block">
                            {trimmedLine.replace(/\*\*/g, '').trim()}
                          </strong>
                        </p>
                      );
                    }

                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                      return (
                        <div key={i} className="flex gap-3 ml-2 mb-3 items-start group">
                          <div className="mt-1.5 shrink-0 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] group-hover:scale-125 transition-transform"></div>
                          <span className="text-emerald-100/90 leading-relaxed">
                            {trimmedLine.substring(1).trim()}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <p key={i} className="mb-4 text-emerald-50/90 leading-loose text-justify">
                        {trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1')}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <button 
              onClick={generateInsights}
              className="mt-2 flex items-center justify-center gap-2 w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 group shadow-lg"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
              Analisis Ulang Data
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-emerald-200/60 italic font-medium">
            {hasGenerated 
              ? "Dianalisis berdasarkan dana & muzaki terkini."
              : "Memerlukan koneksi internet dan API Key yang valid."}
          </p>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
