export type Location = {
  lat: number;
  lng: number;
  name?: string;
};

export type AirQualityData = {
  aerosolIndex: number; // Formerly AQI, now using Aerosol Optical Depth from MISR
  co: number; // Carbon Monoxide from MOPITT
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
  fireRisk: 'low' | 'medium' | 'high' | 'very-high' | 'unknown';
};

export type WaterData = {
  surfaceWater: number; // percentage coverage
  precipitation: number; // mm
};

export type WeatherForecast = { 
  day: string; 
  temp: number; 
  min: number;
  max: number;
  condition: string 
};

export type WeatherData = {
  currentTemp: number; // Now sourced from MODIS Land Surface Temperature
  forecast: WeatherForecast[];
};

export type VegetationData = {
    ndvi: number; // Normalized Difference Vegetation Index from MODIS
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
