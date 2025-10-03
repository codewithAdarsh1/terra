'use server';

import { aiInsightsOrchestrator } from '@/ai/flows/ai-orchestrator';
import type { Location, EnvironmentalData, AIInsights, AirQualityData } from './types';

// Constants
const CONSTANTS = {
  OPENAQ_RADIUS: 50000, // 50km
  FORECAST_DAYS: 5,
  NASA_FILL_VALUE: -999,
  DEFAULT_TEMPERATURE: 20,
  AQI_THRESHOLDS: {
    HAZARDOUS: 250.4,
    VERY_UNHEALTHY: 150.4,
    UNHEALTHY: 55.4,
    MODERATE: 35.4,
    GOOD: 12.0,
  },
} as const;

// Type definitions for API responses
interface NasaPowerResponse {
  header?: {
    fill_value: number;
    range?: string[];
  };
  properties?: {
    parameter: {
      [key: string]: {
        [date: string]: number;
      };
    };
  };
}

interface OpenAQMeasurement {
  parameter: string;
  value: number;
}

interface OpenAQResult {
  measurements: OpenAQMeasurement[];
}

interface OpenAQResponse {
  results: OpenAQResult[];
}

// Utility functions
const formatDateForNasa = (date: Date): string => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

const calculateAqi = (pm25: number): number => {
  const { AQI_THRESHOLDS } = CONSTANTS;
  
  if (pm25 > AQI_THRESHOLDS.HAZARDOUS) return Math.round(301 + (pm25 - AQI_THRESHOLDS.HAZARDOUS) * (199 / 249));
  if (pm25 > AQI_THRESHOLDS.VERY_UNHEALTHY) return Math.round(201 + (pm25 - AQI_THRESHOLDS.VERY_UNHEALTHY) * (99 / 99));
  if (pm25 > AQI_THRESHOLDS.UNHEALTHY) return Math.round(151 + (pm25 - AQI_THRESHOLDS.UNHEALTHY) * (49 / 94));
  if (pm25 > AQI_THRESHOLDS.MODERATE) return Math.round(101 + (pm25 - AQI_THRESHOLDS.MODERATE) * (49 / 19));
  if (pm25 > AQI_THRESHOLDS.GOOD) return Math.round(51 + (pm25 - AQI_THRESHOLDS.GOOD) * (49 / 23.4));
  if (pm25 >= 0) return Math.round((pm25 / AQI_THRESHOLDS.GOOD) * 50);
  return 0;
};

// Fetch NASA POWER API data with proper error handling
async function fetchNasaPowerData(location: Location): Promise<NasaPowerResponse | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    console.warn('NASA_API_KEY is not set. Using mock data for weather.');
    return null;
  }

  const baseUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  const parameters = [
    'T2M', 'TS', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'WS10M'
  ].join(',');
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 2);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 4);

  const apiUrl = new URL(baseUrl);
  const params = {
    parameters,
    community: 'RE',
    longitude: location.lng.toString(),
    latitude: location.lat.toString(),
    start: formatDateForNasa(startDate),
    end: formatDateForNasa(endDate),
    format: 'JSON',
    header: 'true',
  };
  
  Object.entries(params).forEach(([key, value]) => {
    apiUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      console.error(`NASA POWER API Error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data: NasaPowerResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from NASA POWER API:', error);
    return null;
  }
}

// Fetch fire data with improved logic
async function fetchFireData(location: Location) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const isDryRegion = location.lat < 40 && location.lat > -40;
    const fireRiskLevels = ['low', 'medium', 'high', 'very-high'] as const;
    
    let riskIndex = Math.floor(Math.random() * 2);
    if (isDryRegion) {
      riskIndex = Math.min(3, Math.floor(Math.random() * 3) + 1);
    }
    
    return {
      activeFires: Math.floor(Math.random() * (riskIndex + 1) * 2),
      fireRisk: fireRiskLevels[riskIndex],
    };
  } catch (error) {
    console.error('Error fetching fire data:', error);
    return {
      activeFires: 0,
      fireRisk: 'unknown' as const,
    };
  }
}

// Fetch Air Quality data with improved error handling
async function fetchOpenAqData(location: Location): Promise<AirQualityData> {
  const baseUrl = 'https://api.openaq.org/v2/latest';
  const apiUrl = new URL(baseUrl);
  
  apiUrl.searchParams.append('coordinates', `${location.lat},${location.lng}`);
  apiUrl.searchParams.append('radius', CONSTANTS.OPENAQ_RADIUS.toString());
  apiUrl.searchParams.append('order_by', 'distance');
  apiUrl.searchParams.append('limit', '1');

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAQ API request failed: ${response.statusText}`);
    }

    const data: OpenAQResponse = await response.json();

    if (data.results?.length > 0) {
      const measurements = data.results[0].measurements;
      
      const getMeasurementValue = (param: string): number => {
        const measurement = measurements.find((m) => m.parameter === param);
        return measurement ? parseFloat(measurement.value.toFixed(2)) : 0;
      };
      
      const pm25 = getMeasurementValue('pm25');

      return {
        aqi: calculateAqi(pm25),
        pm25,
        pm10: getMeasurementValue('pm10'),
        o3: getMeasurementValue('o3'),
        no2: getMeasurementValue('no2'),
        so2: getMeasurementValue('so2'),
        co: getMeasurementValue('co'),
      };
    }
  } catch (error) {
    console.error('Error fetching from OpenAQ API:', error);
  }

  // Fallback to mock data
  console.warn('Using mock Air Quality data.');
  const randomAqi = Math.floor(Math.random() * 200);
  return {
    aqi: randomAqi,
    pm25: parseFloat((randomAqi / 4).toFixed(2)),
    pm10: parseFloat((randomAqi / 2).toFixed(2)),
    o3: parseFloat((Math.random() * 120).toFixed(2)),
    no2: parseFloat((Math.random() * 40).toFixed(2)),
    so2: parseFloat((Math.random() * 20).toFixed(2)),
    co: parseFloat((Math.random() * 5).toFixed(2)),
  };
}

// Helper function to safely extract values from NASA Power data
function extractPowerValue(
  powerData: NasaPowerResponse | null,
  param: string,
  dateKey: string,
  fallback: () => number
): number {
  try {
    if (!powerData?.properties?.parameter?.[param]?.[dateKey]) {
      return parseFloat(fallback().toFixed(2));
    }
    
    const value = powerData.properties.parameter[param][dateKey];
    const fillValue = powerData.header?.fill_value ?? CONSTANTS.NASA_FILL_VALUE;
    
    if (typeof value === 'number' && value !== fillValue) {
      return parseFloat(value.toFixed(2));
    }
  } catch (error) {
    console.error(`Error extracting power value for ${param}:`, error);
  }
  
  return parseFloat(fallback().toFixed(2));
}

// Main function to fetch environmental data
async function fetchEnvironmentalData(location: Location): Promise<EnvironmentalData> {
  const [powerData, fireData, airQualityData] = await Promise.allSettled([
    fetchNasaPowerData(location),
    fetchFireData(location),
    fetchOpenAqData(location),
  ]);

  // Handle Promise results safely
  const nasaData = powerData.status === 'fulfilled' ? powerData.value : null;
  const fireInfo = fireData.status === 'fulfilled' ? fireData.value : { activeFires: 0, fireRisk: 'unknown' as const };
  const airQuality = airQualityData.status === 'fulfilled' ? airQualityData.value : {
    aqi: 50,
    pm25: 12.5,
    pm10: 25,
    o3: 60,
    no2: 20,
    so2: 10,
    co: 2.5,
  };

  // Extract date keys safely
  let dateKeys: string[] = [];
  if (nasaData?.properties?.parameter?.T2M) {
    dateKeys = Object.keys(nasaData.properties.parameter.T2M).sort();
  }

  const todayKey = dateKeys.length >= 3 ? dateKeys[dateKeys.length - 3] : '';
  const currentTemp = extractPowerValue(
    nasaData,
    'T2M',
    todayKey,
    () => CONSTANTS.DEFAULT_TEMPERATURE + Math.random() * 10
  );

  // Generate forecast
  const forecast = Array.from({ length: CONSTANTS.FORECAST_DAYS }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index - 2);
    const key = dateKeys[dateKeys.length - 5 + index] || '';

    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      temp: extractPowerValue(nasaData, 'T2M', key, () => currentTemp + Math.random() * 4 - 2),
      max: extractPowerValue(nasaData, 'T2M_MAX', key, () => currentTemp + 5),
      min: extractPowerValue(nasaData, 'T2M_MIN', key, () => currentTemp - 5),
      condition: 'Varies',
    };
  });

  // Calculate average precipitation
  let avgPrecip = 0;
  if (dateKeys.length > 0) {
    const precipValues = dateKeys.map(key => 
      extractPowerValue(nasaData, 'PRECTOTCORR', key, () => 0)
    );
    avgPrecip = precipValues.reduce((acc, val) => acc + val, 0) / precipValues.length;
  } else {
    avgPrecip = Math.random() * 10;
  }

  const soilMoisture = avgPrecip > 1 ? Math.random() * 0.5 + 0.2 : Math.random() * 0.3;

  return {
    airQuality,
    soil: {
      moisture: parseFloat(soilMoisture.toFixed(2)),
      temperature: extractPowerValue(nasaData, 'TS', todayKey, () => currentTemp - 2 + Math.random() * 4),
      ph: parseFloat((5.5 + Math.random() * 2).toFixed(2)),
      nitrogen: parseFloat((10 + soilMoisture * 40).toFixed(2)),
      phosphorus: parseFloat((5 + soilMoisture * 20).toFixed(2)),
      potassium: parseFloat((20 + soilMoisture * 50).toFixed(2)),
    },
    fire: fireInfo,
    water: {
      surfaceWater: parseFloat(Math.min(0.9, soilMoisture * 1.5).toFixed(2)),
      precipitation: parseFloat(avgPrecip.toFixed(2)),
    },
    weather: {
      currentTemp,
      forecast,
    },
    vegetation: {
      ndvi: parseFloat(
        Math.min(0.9, Math.max(0.1, soilMoisture * 1.2 - (currentTemp > 30 ? 0.2 : 0))).toFixed(2)
      ),
    },
    lastUpdated: new Date().toISOString(),
  };
}

// Geocoding functions with improved error handling
export async function reverseGeocode(location: Location): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.append('format', 'json');
  url.searchParams.append('lat', location.lat.toString());
  url.searchParams.append('lon', location.lng.toString());
  url.searchParams.append('zoom', '10');
  url.searchParams.append('addressdetails', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'EarthInsightsExplorer/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.display_name) {
      const { city, state, country } = data.address || {};
      if (city && country) return `${city}, ${country}`;
      if (state && country) return `${state}, ${country}`;
      return data.display_name.split(',').slice(0, 3).join(',').trim();
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
  }
  return null;
}

export async function geocodeLocation(locationName: string): Promise<Location | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.append('q', locationName);
  url.searchParams.append('format', 'json');
  url.searchParams.append('limit', '1');
  url.searchParams.append('addressdetails', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'EarthInsightsExplorer/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0) {
      const { lat, lon, display_name } = data[0];
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        name: display_name,
      };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
  return null;
}

// Main export function with improved error handling
export async function getLocationData(
  location: Location
): Promise<EnvironmentalData & AIInsights> {
  try {
    // Step 1: Fetch environmental data
    const environmentalData = await fetchEnvironmentalData(location);
    
    // Step 2: Call the AI orchestrator with the raw data
    const aiInsights = await aiInsightsOrchestrator({
      location,
      environmentalData,
    });
    
    // Step 3: Combine and return
    return {
      ...environmentalData,
      ...aiInsights,
    };
  } catch (error) {
    console.error('Error in getLocationData:', error);
    
    // If there's an error, still try to return environmental data with fallback AI insights
    try {
      const environmentalData = await fetchEnvironmentalData(location);
      return {
        ...environmentalData,
        summary: 'AI insights temporarily unavailable.',
        futurePredictions: 'Unable to generate predictions.',
        cropRecommendations: 'Unable to generate recommendations.',
        riskAssessment: 'Unable to assess risks.',
        simplifiedExplanation: 'Unable to generate explanation.',
        environmentalSolutions: 'Unable to generate solutions.',
      };
    } catch (fallbackError) {
      console.error('Critical error in getLocationData fallback:', fallbackError);
      throw new Error('Failed to fetch any location data.');
    }
  }
}
