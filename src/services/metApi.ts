import axios from 'axios';
import { MetForecastResponse, GridWeather } from '../types/weather';
import { GridPoint } from '../types/weather';
import { computeRiskScore } from './riskScore';

const MET_BASE = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
export async function fetchWeatherForPoint(point: GridPoint): Promise<GridWeather> {
  // User-Agent is a forbidden header in browsers — do not set it
  const { data } = await axios.get<MetForecastResponse>(MET_BASE, {
    params: { lat: point.lat.toFixed(2), lon: point.lon.toFixed(2) },
  });

  const ts = data.properties.timeseries[0];
  const details = ts.data.instant.details;
  const next = ts.data.next_1_hours ?? ts.data.next_6_hours;

  const airTemperature = details.air_temperature;
  const windSpeed = details.wind_speed;
  const precipitationAmount = next?.details.precipitation_amount ?? 0;
  const symbolCode = next?.summary.symbol_code ?? 'clearsky_day';

  const riskScore = computeRiskScore(airTemperature, windSpeed, precipitationAmount, symbolCode);

  return {
    lat: point.lat,
    lon: point.lon,
    name: point.name,
    airTemperature,
    windSpeed,
    precipitationAmount,
    symbolCode,
    riskScore,
  };
}
