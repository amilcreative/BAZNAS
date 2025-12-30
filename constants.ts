
import { DashboardData } from './types';

// Helper to generate some mock daily data for the last 15 days
const generateDailyMock = () => {
  const data = [];
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      amount: Math.floor(Math.random() * 50000000) + 10000000,
      label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    });
  }
  return data;
};

export const DEFAULT_DATA: DashboardData = {
  institutionName: 'BAZNAS Kabupaten Tasikmalaya',
  institutionLogo: '',
  periodYear: '2024',
  totalTarget: 45000000000,
  totalCollected: 32450000000,
  totalMuzaki: 14280,
  lastUpdate: new Date().toISOString().split('T')[0],
  spreadsheetId: '', 
  dataSource: 'manual',
  adminPin: '1234',
  categories: [
    { name: 'UPZ (Unit Pengumpul Zakat)', collected: 15200000000, target: 18000000000, muzaki: 5240, color: '#059669' },
    { name: 'Desa & Komunitas', collected: 7800000000, target: 10000000000, muzaki: 4120, color: '#0891b2' },
    { name: 'Program Muzaki', collected: 4500000000, target: 7000000000, muzaki: 2850, color: '#4f46e5' },
    { name: 'Retail Korporasi', collected: 2950000000, target: 5000000000, muzaki: 1240, color: '#d97706' },
    { name: 'Digital Fundraising', collected: 2000000000, target: 5000000000, muzaki: 830, color: '#db2777' }
  ],
  monthlyHistory: [
    { month: 'Jan', date: '2024-01-01', amount: 2100000000 },
    { month: 'Feb', date: '2024-02-01', amount: 2400000000 },
    { month: 'Mar', date: '2024-03-01', amount: 5800000000 },
    { month: 'Apr', date: '2024-04-01', amount: 8200000000 },
    { month: 'Mei', date: '2024-05-01', amount: 4100000000 },
    { month: 'Jun', date: '2024-06-01', amount: 3500000000 },
    { month: 'Jul', date: '2024-07-01', amount: 2800000000 },
    { month: 'Agt', date: '2024-08-01', amount: 3450000000 }
  ],
  dailyHistory: generateDailyMock()
};

export const STORAGE_KEY = 'baznas_tasik_data';

export const FORMAT_CURRENCY = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};

export const FORMAT_NUMBER = (value: number) => {
  return new Intl.NumberFormat('id-ID').format(value);
};
