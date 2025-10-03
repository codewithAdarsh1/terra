'use server';

import { aiInsightsOrchestrator } from '@/ai/flows/ai-orchestrator';
import type { Location, EnvironmentalData, AIInsights, AirQualityData } from './types';

// Constants
const CONSTANTS = {
  FORECAST_DAYS: 5,
  NASA_FILL_VALUE: -999,
  DEFAULT_TEMPERATURE: 20,
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

interface FirmsResponse {
  features: {
    attributes: {
      acq_date: string;
      acq_time: string;
      frp: number; // Fire Radiative Power
    };
  }[];
}


// Utility functions
const formatDateForNasa = (date: Date): string => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

// Fetch NASA POWER API data for Terra-derived metrics
async function fetchNasaPowerData(location: Location): Promise<NasaPowerResponse | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    console.warn('NASA_API_KEY is not set. Using mock data for NASA POWER.');
    return null;
  }

  const baseUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  // Parameters from Terra's instruments (MODIS, MOPITT, MISR)
  const parameters = [
    'TS_DAY_MODIS', // Land Surface Temp (MODIS)
    'NDVI_MODIS',   // Vegetation Index (MODIS)
    'PRECTOTCORR',  // Precipitation (assimilated data, but context for NDVI)
    'AOD_550_MISR', // Aerosol Optical Depth (MISR)
    'CO_COLUMN_MOPITT', // Carbon Monoxide (MOPITT)
    'T2M_MAX',
    'T2M_MIN',
  ].join(',');
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

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
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.error(`NASA POWER API Error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from NASA POWER API:', error);
    return null;
  }
}

// Fetch active fire data from NASA FIRMS (uses MODIS on Terra)
async function fetchFireData(location: Location): Promise<{ activeFires: number; fireRisk: 'low' | 'medium' | 'high' | 'very-high' | 'unknown' }> {
  const apiKey = process.env.FIRMS_API_KEY;
  if (!apiKey) {
    console.warn('FIRMS_API_KEY is not set. Using mock fire data.');
    return { activeFires: 0, fireRisk: 'low' };
  }
  
  const date = new Date();
  date.setDate(date.getDate() - 1); // Check for fires in the last 24 hours
  const acqDate = date.toISOString().split('T')[0];

  const boundingBox = [
    location.lng - 0.5,
    location.lat - 0.5,
    location.lng + 0.5,
    location.lat + 0.5,
  ].join(',');

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/MODIS_NRT/${boundingBox}/1/${acqDate}`;
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.error(`FIRMS API Error: ${response.status} ${response.statusText}`);
      return { activeFires: 0, fireRisk: 'low' };
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    const activeFires = lines.length > 1 ? lines.length - 1 : 0; // -1 for header

    let fireRisk: 'low' | 'medium' | 'high' | 'very-high' = 'low';
    if (activeFires > 10) fireRisk = 'very-high';
    else if (activeFires > 5) fireRisk = 'high';
    else if (activeFires > 0) fireRisk = 'medium';

    return { activeFires, fireRisk };
  } catch (error) {
    console.error('Error fetching from FIRMS API:', error);
    return { activeFires: 0, fireRisk: 'unknown' as const };
  }
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
  const [powerData, fireDataResult] = await Promise.allSettled([
    fetchNasaPowerData(location),
    fetchFireData(location),
  ]);

  const nasaData = powerData.status === 'fulfilled' ? powerData.value : null;
  const fireInfo = fireDataResult.status === 'fulfilled' ? fireDataResult.value : { activeFires: 0, fireRisk: 'unknown' as const };

  let dateKeys: string[] = [];
  if (nasaData?.properties?.parameter?.TS_DAY_MODIS) {
    dateKeys = Object.keys(nasaData.properties.parameter.TS_DAY_MODIS).sort();
  }

  const todayKey = dateKeys.length >= 3 ? dateKeys[dateKeys.length - 3] : '';
  const currentTemp = extractPowerValue(
    nasaData,
    'TS_DAY_MODIS',
    todayKey,
    () => CONSTANTS.DEFAULT_TEMPERATURE + Math.random() * 10
  );

  const forecast = Array.from({ length: CONSTANTS.FORECAST_DAYS }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index - 2);
    const key = dateKeys[dateKeys.length - 5 + index] || '';

    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      temp: extractPowerValue(nasaData, 'TS_DAY_MODIS', key, () => currentTemp + Math.random() * 4 - 2),
      max: extractPowerValue(nasaData, 'T2M_MAX', key, () => currentTemp + 5),
      min: extractPowerValue(nasaData, 'T2M_MIN', key, () => currentTemp - 5),
      condition: 'Varies',
    };
  });

  const avgPrecip = dateKeys.length > 0
    ? dateKeys.map(key => extractPowerValue(nasaData, 'PRECTOTCORR', key, () => 0)).reduce((a, b) => a + b, 0) / dateKeys.length
    : Math.random() * 10;

  const soilMoisture = avgPrecip > 1 ? Math.random() * 0.5 + 0.2 : Math.random() * 0.3;
  const ndvi = extractPowerValue(nasaData, 'NDVI_MODIS', todayKey, () => Math.min(0.9, Math.max(0.1, soilMoisture * 1.2)));

  const airQuality: AirQualityData = {
    aerosolIndex: extractPowerValue(nasaData, 'AOD_550_MISR', todayKey, () => Math.random() * 0.5),
    co: extractPowerValue(nasaData, 'CO_COLUMN_MOPITT', todayKey, () => Math.random() * 0.05),
  };

  return {
    airQuality,
    soil: {
      moisture: parseFloat(soilMoisture.toFixed(2)),
      temperature: currentTemp,
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
      ndvi: parseFloat(ndvi.toFixed(2)),
    },
    lastUpdated: new Date().toISOString(),
  };
}

// Geocoding functions (unchanged)
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


// Main export function
export async function getLocationData(
  location: Location
): Promise<EnvironmentalData & AIInsights> {
  try {
    const environmentalData = await fetchEnvironmentalData(location);
    
    const aiInsights = await aiInsightsOrchestrator({
      location,
      environmentalData,
    });
    
    return {
      ...environmentalData,
      ...aiInsights,
    };
  } catch (error) {
    console.error('Error in getLocationData:', error);
    // Fallback in case of critical failure
    const environmentalData = await fetchEnvironmentalData(location).catch(() => {
        throw new Error('Failed to fetch even fallback environmental data.');
    });
    return {
      ...environmentalData,
      summary: 'AI insights temporarily unavailable.',
      futurePredictions: 'Unable to generate predictions.',
      cropRecommendations: 'Unable to generate recommendations.',
      riskAssessment: 'Unable to assess risks.',
      simplifiedExplanation: 'Unable to generate explanation.',
      environmentalSolutions: 'Unable to generate solutions.',
      healthAdvisory: 'Unable to generate health advisory.'
    };
  }
}
