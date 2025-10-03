export type Location = {
  lat: number;
  lng: number;
  name?: string;
};

export type AirQualityData = {
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
};

export type SoilData = {
  moisture: number;
  temperature: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
};

export type FireData = {
  activeFires: number;
  fireRisk: 'low' | 'medium' | 'high' | 'very-high';
};

export type WaterData = {
  surfaceWater: number; // percentage coverage
  precipitation: number; // mm
};

export type WeatherData = {
  currentTemp: number;
  forecast: { day: string; temp: number; condition: string }[];
};

export type VegetationData = {
    ndvi: number; // Normalized Difference Vegetation Index
};

export type EnvironmentalData = {
  airQuality: AirQualityData;
  soil: SoilData;
  fire: FireData;
  water: WaterData;
  weather: WeatherData;
  vegetation: VegetationData;
  lastUpdated: string;
};

export type AIInsights = {
  summary: string;
  futurePredictions: string;
  cropRecommendations: string;
  environmentalSolutions: string;
  riskAssessment: string;
  simplifiedExplanation: string;
};

export type SatelliteData = {
  lat: number;
  lng: number;
  alt: number;
  speed: number;
};
