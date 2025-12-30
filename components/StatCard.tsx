
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color }) => {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-emerald-600 flex items-center justify-center`}>
            {icon}
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <h3 className="text-slate-500 text-xs font-medium tracking-tight">{title}</h3>
        <p className="text-lg md:text-2xl font-bold text-slate-900 mt-0.5 break-words">{value}</p>
      </div>
      {subtitle && <p className="text-slate-400 text-[10px] mt-2 border-t border-slate-50 pt-2">{subtitle}</p>}
    </div>
  );
};
