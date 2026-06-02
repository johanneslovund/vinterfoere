export function computeRiskScore(
  airTemperature: number,
  windSpeed: number,
  precipitationAmount: number,
  symbolCode: string
): number {
  const sym = symbolCode.toLowerCase();

  // Temperature score: near-freezing is most dangerous
  let tempScore: number;
  if (airTemperature >= 3) {
    tempScore = 0.0;
  } else if (airTemperature >= 1) {
    tempScore = 0.4;
  } else if (airTemperature >= -2) {
    tempScore = 0.85; // near-freezing, highest risk
  } else if (airTemperature >= -8) {
    tempScore = 0.65;
  } else if (airTemperature >= -15) {
    tempScore = 0.4; // very cold but dry road likely
  } else {
    tempScore = 0.25; // extreme cold, typically dry
  }

  // Precipitation / surface condition score
  let precipScore: number;
  if (sym.includes('snow') || sym.includes('blizzard')) {
    precipScore = precipitationAmount > 0.5 ? 1.0 : 0.75;
  } else if (sym.includes('sleet')) {
    precipScore = 0.95;
  } else if (sym.includes('rain') && airTemperature < 2) {
    precipScore = 0.9; // freezing rain
  } else if (sym.includes('rain')) {
    precipScore = precipitationAmount > 1 ? 0.4 : 0.2;
  } else if (sym.includes('fog') && airTemperature < 1) {
    precipScore = 0.5; // freezing fog
  } else {
    precipScore = 0.0;
  }

  // Wind score: dangerous with snow/ice
  let windScore: number;
  if (windSpeed > 20) {
    windScore = 1.0;
  } else if (windSpeed > 15) {
    windScore = 0.75;
  } else if (windSpeed > 10) {
    windScore = 0.45;
  } else if (windSpeed > 5) {
    windScore = 0.2;
  } else {
    windScore = 0.0;
  }

  const raw = tempScore * 0.5 + precipScore * 0.35 + windScore * 0.15;
  return Math.min(1, Math.max(0, raw));
}
