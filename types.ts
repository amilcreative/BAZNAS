
export interface ZakatCategory {
  name: string;
  collected: number;
  target: number;
  muzaki: number;
  color: string;
}

export interface MonthlyData {
  month: string;
  date: string; // Format: YYYY-MM-DD
  amount: number;
  category?: string;
}

export interface DailyData {
  date: string; // Format: YYYY-MM-DD
  amount: number;
  label: string; // Format: DD MMM
  category?: string;
}

export interface PredictionPoint {
  month: string;
  amount: number;
  type: 'actual' | 'predicted';
}

export interface DashboardData {
  institutionName: string;
  institutionLogo?: string; // Base64 or URL
  periodYear: string;
  totalTarget: number;
  totalCollected: number;
  totalMuzaki: number;
  categories: ZakatCategory[];
  monthlyHistory: MonthlyData[];
  dailyHistory: DailyData[];
  lastUpdate: string;
  spreadsheetId?: string;
  dataSource: 'manual' | 'sheets';
  adminPin: string;
}
