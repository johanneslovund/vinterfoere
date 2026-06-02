export interface GridPoint {
  lat: number;
  lon: number;
  name: string;
}

export interface GridWeather {
  lat: number;
  lon: number;
  name: string;
  airTemperature: number;
  windSpeed: number;
  precipitationAmount: number;
  symbolCode: string;
  riskScore: number;
  loading?: boolean;
  error?: boolean;
}

export interface MetForecastResponse {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            wind_speed: number;
            relative_humidity?: number;
          };
        };
        next_1_hours?: {
          summary: { symbol_code: string };
          details: { precipitation_amount: number };
        };
        next_6_hours?: {
          summary: { symbol_code: string };
          details: { precipitation_amount: number };
        };
      };
    }>;
  };
}

export type RiskLevel = 'trygt' | 'forsiktig' | 'advarsel' | 'farlig';

export function riskLevel(score: number): RiskLevel {
  if (score < 0.25) return 'trygt';
  if (score < 0.5) return 'forsiktig';
  if (score < 0.75) return 'advarsel';
  return 'farlig';
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  trygt: 'Trygt',
  forsiktig: 'Vær forsiktig',
  advarsel: 'Advarsel',
  farlig: 'Farlig',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  trygt: '#4caf50',
  forsiktig: '#ffeb3b',
  advarsel: '#ff9800',
  farlig: '#f44336',
};
