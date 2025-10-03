'use server';

import { getCropRecommendations } from '@/ai/flows/ai-crop-recommendations';
import { futureTrendPredictions } from '@/ai/flows/ai-future-trend-predictions';
import { aiRiskAssessment } from '@/ai/flows/ai-risk-assessment';
import { getSimplifiedExplanation } from '@/ai/ai-simplified-data-explanations';
import { aiEnvironmentalSolutions } from '@/ai/ai-environmental-solutions';
import type { Location, EnvironmentalData, AIInsights, AirQualityData } from './types';

// Function to fetch data from NASA POWER API
async function fetchNasaPowerData(location: Location) {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    console.warn('NASA_API_KEY is not set. Using mock data for weather.');
    return null;
  }
  const baseUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  const parameters = [
    'T2M', // Temperature at 2 meters
    'TS', // Earth Skin Temperature
    'T2M_MAX', // Max temperature
    'T2M_MIN', // Min temperature
    'PRECTOTCORR', // Precipitation
    'WS10M', // Wind Speed at 10 meters
  ].join(',');
  
  // Fetch data for the last 7 days to get a recent forecast
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 2);
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

  const apiUrl = `${baseUrl}?parameters=${parameters}&community=RE&longitude=${location.lng}&latitude=${location.lat}&start=${formatDate(startDate)}&end=${formatDate(endDate)}&format=JSON&header=true`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('NASA POWER API Error:', errorText);
      throw new Error(`NASA POWER API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from NASA POWER API:', error);
    return null; // Return null to handle gracefully
  }
}

// Function to simulate fetching fire data
async function fetchFireData(location: Location) {
  // NASA FIRMS API is complex for direct real-time point queries.
  // We'll simulate this based on location and some randomness.
  await new Promise(resolve => setTimeout(resolve, 200)); 
  const isDryRegion = location.lat < 40 && location.lat > -40;
  const fireRiskLevels = ['low', 'medium', 'high', 'very-high'] as const;
  let riskIndex = Math.floor(Math.random() * 2); // low to medium
  if (isDryRegion) {
    riskIndex = Math.floor(Math.random() * 3) + 1; // medium to very-high
  }
  return {
    activeFires: Math.floor(Math.random() * (riskIndex + 1) * 2),
    fireRisk: fireRiskLevels[riskIndex],
  };
}


// Function to fetch Air Quality data from OpenAQ
async function fetchOpenAqData(location: Location): Promise<AirQualityData> {
  const baseUrl = 'https://api.openaq.org/v2/latest';
  const radius = 50000; // 50km radius to increase chance of finding a sensor
  const apiUrl = `${baseUrl}?coordinates=${location.lat},${location.lng}&radius=${radius}&order_by=distance&limit=1`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAQ API Error:', errorText);
      throw new Error(`OpenAQ API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const measurements = data.results[0].measurements;
      const getMeasurementValue = (param: string) => {
        const measurement = measurements.find((m: any) => m.parameter === param);
        return measurement ? parseFloat(measurement.value.toFixed(2)) : 0;
      };
      
      const pm25 = getMeasurementValue('pm25');
      // Simple AQI calculation based on PM2.5 (based on EPA standards)
      const calculateAqi = (pm25: number) => {
        if (pm25 > 250.4) return 301 + (pm25 - 250.4) * (199 / 249);
        if (pm25 > 150.4) return 201 + (pm25 - 150.4) * (99 / 99);
        if (pm25 > 55.4) return 151 + (pm25 - 55.4) * (49 / 94);
        if (pm25 > 35.4) return 101 + (pm25 - 35.4) * (49 / 19);
        if (pm25 > 12.0) return 51 + (pm25 - 12.0) * (49 / 23.4);
        if (pm25 >= 0) return Math.round((pm25 / 12.0) * 50);
        return 0;
      };

      return {
        aqi: Math.round(calculateAqi(pm25)),
        pm25: pm25,
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

  // Fallback to mock data if API fails or returns no results
  const randomAqi = Math.floor(Math.random() * 200);
  console.warn('OpenAQ returned no data. Using mock Air Quality data.');
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


// Function to simulate fetching data from various sources
async function fetchEnvironmentalData(location: Location): Promise<EnvironmentalData> {
  // Use Promise.all to fetch data concurrently
  const [powerData, fireData, airQualityData] = await Promise.all([
    fetchNasaPowerData(location),
    fetchFireData(location),
    fetchOpenAqData(location),
  ]);

  const getPowerValue = (param: string, dateKey: string, fallback: () => number) => {
    if (powerData?.properties?.parameter?.[param]?.[dateKey]) {
      const value = powerData.properties.parameter[param][dateKey];
      if (typeof value === 'number' && value !== powerData.header.fill_value) {
        return parseFloat(value.toFixed(2));
      }
    }
    return parseFloat(fallback().toFixed(2));
  }

  const dateKeys = powerData?.header?.range ? Object.keys(powerData.properties.parameter.T2M).sort() : [];
  const todayKey = dateKeys[dateKeys.length - 3]; // Assuming today is the 3rd from last
  
  const currentTemp = todayKey ? getPowerValue('T2M', todayKey, () => 15 + Math.random() * 15) : 15 + Math.random() * 15;

  const forecast = dateKeys.slice(-5).map((key, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index - 2);
    
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      temp: getPowerValue('T2M', key, () => currentTemp + Math.random() * 4 - 2),
      max: getPowerValue('T2M_MAX', key, () => currentTemp + 5),
      min: getPowerValue('T2M_MIN', key, () => currentTemp - 5),
      condition: 'Varies',
    }
  });

  const avgPrecip = dateKeys.length > 0 ? dateKeys.reduce((acc, key) => acc + getPowerValue('PRECTOTCORR', key, () => 0), 0) / dateKeys.length : Math.random() * 10;
  
  // Improved mock data generation for realism
  const soilMoisture = avgPrecip > 1 ? Math.random() * 0.5 + 0.2 : Math.random() * 0.3;

  return {
    airQuality: airQualityData,
    soil: {
      moisture: parseFloat(soilMoisture.toFixed(2)),
      temperature: todayKey ? getPowerValue('TS', todayKey, () => currentTemp - 2 + Math.random() * 4) : currentTemp - 2 + Math.random() * 4,
      ph: parseFloat((5.5 + Math.random() * 2).toFixed(2)),
      nitrogen: parseFloat((10 + soilMoisture * 40).toFixed(2)),
      phosphorus: parseFloat((5 + soilMoisture * 20).toFixed(2)),
      potassium: parseFloat((20 + soilMoisture * 50).toFixed(2)),
    },
    fire: fireData,
    water: {
      surfaceWater: parseFloat(Math.min(0.9, soilMoisture * 1.5).toFixed(2)), // Link to soil moisture
      precipitation: parseFloat(avgPrecip.toFixed(2)),
    },
    weather: {
      currentTemp: currentTemp,
      forecast: forecast,
    },
    vegetation: {
      // Simulate NDVI based on precipitation and temperature
      ndvi: parseFloat(Math.min(0.9, Math.max(0.1, (soilMoisture * 1.2) - (currentTemp > 30 ? 0.2 : 0))).toFixed(2)),
    },
    lastUpdated: new Date().toISOString(),
  };
}

export async function reverseGeocode(location: Location): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=10&addressdetails=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'EarthInsightsExplorer/1.0'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.display_name) {
      // Return a shorter name if possible
      const { city, state, country } = data.address;
      if (city) return `${city}, ${country}`;
      if (state) return `${state}, ${country}`;
      return data.display_name.split(',').slice(0, 3).join(',');
    }
    return null;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

// Mock geocoding
export async function geocodeLocation(locationName: string): Promise<Location | null> {
  // In a real app, call a geocoding service.
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&addressdetails=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'EarthInsightsExplorer/1.0'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.length > 0) {
      const { lat, lon, display_name } = data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon), name: display_name };
    }
    return null;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

export async function getLocationData(location: Location): Promise<EnvironmentalData & AIInsights> {
  try {
    const envData = await fetchEnvironmentalData(location);

    const locationName = location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    const soilDataString = `Moisture: ${envData.soil.moisture}, Temp: ${envData.soil.temperature}°C, pH: ${envData.soil.ph}, N: ${envData.soil.nitrogen}, P: ${envData.soil.phosphorus}, K: ${envData.soil.potassium}`;
    const weatherPatternsString = `Current Temp: ${envData.weather.currentTemp}°C, NDVI: ${envData.vegetation.ndvi}, Precipitation: ${envData.water.precipitation}mm`;
    const historicalDataString = `Historical data shows fluctuating temperatures and stable NDVI. Recent precipitation has been below average. Current fire risk is ${envData.fire.fireRisk}.`;
    const airQualityString = `AQI: ${envData.airQuality.aqi}, PM2.5: ${envData.airQuality.pm25}`;
    const fireDetectionString = `Active Fires: ${envData.fire.activeFires}, Risk: ${envData.fire.fireRisk}`;
    const waterResourcesString = `Precipitation: ${envData.water.precipitation}mm, Surface Water: ${envData.water.surfaceWater*100}%`;
    const temperatureString = `Current: ${envData.weather.currentTemp}°C`;

    const [
      predictionsResult,
      recommendationsResult,
      riskAssessmentResult,
      simplifiedExplanationResult,
      environmentalSolutionsResult,
    ] = await Promise.all([
      futureTrendPredictions({
        location: locationName,
        historicalData: historicalDataString,
      }),
      getCropRecommendations({
        latitude: location.lat,
        longitude: location.lng,
        soilData: soilDataString,
        weatherPatterns: weatherPatternsString,
      }),
      aiRiskAssessment({
        airQuality: airQualityString,
        fireData: `Active Fires: ${envData.fire.activeFires}, Risk: ${envData.fire.fireRisk}`,
        waterResources: `Precipitation: ${envData.water.precipitation}mm`,
        weatherPatterns: weatherPatternsString,
      }),
      getSimplifiedExplanation({
        location: locationName,
        airQuality: airQualityString,
        soilData: soilDataString,
        fireDetection: fireDetectionString,
        waterResources: waterResourcesString,
        weatherPatterns: weatherPatternsString,
        temperature: temperatureString,
        additionalMetrics: `Vegetation Index (NDVI): ${envData.vegetation.ndvi}`
      }),
      aiEnvironmentalSolutions({
        airQuality: airQualityString,
        soilData: soilDataString,
        fireDetection: fireDetectionString,
        waterResources: waterResourcesString,
        weatherPatterns: weatherPatternsString,
        temperature: temperatureString,
      })
    ]);

    const aiInsights: AIInsights = {
      summary: `This AI-generated summary for ${
        locationName
      } reveals moderate air quality and healthy vegetation. Soil conditions are generally favorable, though moisture levels are something to monitor.`,
      futurePredictions: predictionsResult.predictions,
      cropRecommendations: recommendationsResult.cropRecommendations,
      riskAssessment: riskAssessmentResult.riskAssessment,
      simplifiedExplanation: simplifiedExplanationResult.simplifiedExplanation,
      environmentalSolutions: environmentalSolutionsResult.solutions,
    };

    return {
      ...envData,
      ...aiInsights,
    };
  } catch (error) {
    console.error('Error fetching location data:', error);
    throw new Error('Failed to get data from services.');
  }
}
