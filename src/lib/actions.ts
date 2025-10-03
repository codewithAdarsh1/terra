"use server";

import { getCropRecommendations } from "@/ai/flows/ai-crop-recommendations";
import { futureTrendPredictions } from "@/ai/flows/ai-future-trend-predictions";
import { aiRiskAssessment } from "@/ai/flows/ai-risk-assessment";
import type { Location, EnvironmentalData, AIInsights } from "./types";

// Function to fetch data from NASA POWER API
async function fetchNasaPowerData(location: Location) {
  const apiKey = process.env.NASA_API_KEY;
  const baseUrl = "https://power.larc.nasa.gov/api/temporal/daily/point";
  const parameters = [
    "T2M", // Temperature at 2 meters
    "RH2M", // Relative Humidity at 2 meters
    "PRECTOTCORR", // Precipitation
    "WS10M", // Wind Speed at 10 meters
    "ALLSKY_SFC_SW_DWN", // All Sky Insolation Incident on a Horizontal Surface
    "T2M_MAX", // Max temperature
    "T2M_MIN", // Min temperature
  ].join(",");

  const startDate = "20230101";
  const endDate = "20231231"; 

  const apiUrl = `${baseUrl}?parameters=${parameters}&community=RE&longitude=${location.lng}&latitude=${location.lat}&start=${startDate}&end=${endDate}&format=JSON&header=true&api_key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("NASA POWER API Error:", errorText);
      throw new Error(`NASA POWER API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching from NASA POWER API:", error);
    return null; // Return null to handle gracefully
  }
}

// Function to fetch fire data from NASA FIRMS API
async function fetchNasaFirmsData(location: Location) {
    // FIRMS doesn't have a direct point API, but we can query a small bounding box
    const date = new Date().toISOString().split('T')[0];
    const worldFireUrl = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${process.env.NASA_API_KEY}/VIIRS_NOAA20_NRT/world/1/${date}`;

    try {
        // This is a simplified approach. A real implementation would use a bounding box.
        // For now, we simulate finding nearby fires.
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            activeFires: Math.floor(Math.random() * 5),
            fireRisk: ['low', 'medium', 'high', 'very-high'][Math.floor(Math.random() * 4)] as 'low' | 'medium' | 'high' | 'very-high',
        }
    } catch (error) {
        console.error("Error fetching from NASA FIRMS API:", error);
        return { activeFires: 0, fireRisk: 'low' };
    }
}


// Function to simulate fetching data from various sources
async function fetchEnvironmentalData(location: Location): Promise<EnvironmentalData> {
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay for other sources
  const powerData = await fetchNasaPowerData(location);

  const now = new Date();

  // Helper to get latest value from POWER data or generate random
  const getLatestPowerValue = (param: string, fallback: () => number) => {
    if (powerData && powerData.properties.parameter[param]) {
      const values = Object.values(powerData.properties.parameter[param]);
      const lastValue = values[values.length - 1];
      if(typeof lastValue === 'number' && lastValue !== powerData.header.fill_value){
        return lastValue
      }
    }
    return fallback();
  };

  const currentTemp = getLatestPowerValue("T2M", () => 15 + Math.random() * 15);
  const forecast = [
    { day: "Mon", temp: getLatestPowerValue("T2M_MAX", () => 15 + Math.random() * 15), condition: "Sunny" },
    { day: "Tue", temp: getLatestPowerValue("T2M_MAX", () => 15 + Math.random() * 15), condition: "Cloudy" },
    { day: "Wed", temp: getLatestPowerValue("T2M_MIN", () => 15 + Math.random() * 15), condition: "Rainy" },
  ]

  const fireData = await fetchNasaFirmsData(location);
  
  return {
    airQuality: {
      aqi: Math.floor(Math.random() * 200),
      pm25: parseFloat((Math.random() * 50).toFixed(2)),
      pm10: parseFloat((Math.random() * 80).toFixed(2)),
      o3: parseFloat((Math.random() * 120).toFixed(2)),
      no2: parseFloat((Math.random() * 40).toFixed(2)),
      so2: parseFloat((Math.random() * 20).toFixed(2)),
      co: parseFloat((Math.random() * 5).toFixed(2)),
    },
    soil: {
      moisture: parseFloat(Math.random().toFixed(2)),
      temperature: getLatestPowerValue("T2M", () => 10 + Math.random() * 20),
      ph: parseFloat((5.5 + Math.random() * 2).toFixed(2)),
      nitrogen: parseFloat((10 + Math.random() * 20).toFixed(2)),
      phosphorus: parseFloat((5 + Math.random() * 15).toFixed(2)),
      potassium: parseFloat((20 + Math.random() * 30).toFixed(2)),
    },
    fire: fireData,
    water: {
      surfaceWater: parseFloat(Math.random().toFixed(2)),
      precipitation: getLatestPowerValue("PRECTOTCORR", () => Math.random() * 10),
    },
    weather: {
      currentTemp: currentTemp,
      forecast: forecast
    },
    vegetation: {
      ndvi: parseFloat((Math.random() * 0.8 + 0.1).toFixed(2)),
    },
    lastUpdated: now.toISOString(),
  };
}

// Mock geocoding
export async function geocodeLocation(locationName: string): Promise<Location | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, call a geocoding service.
    // This is a very simplified mock.
    if (locationName.toLowerCase().includes("new york")) {
        return { lat: 40.7128, lng: -74.0060, name: "New York, USA" };
    }
    if (locationName.toLowerCase().includes("amazon")) {
        return { lat: -3.4653, lng: -62.2159, name: "Amazon Rainforest" };
    }
    if (locationName.toLowerCase().includes("sahara")) {
        return { lat: 23.4162, lng: 25.6628, name: "Sahara Desert" };
    }
    // Attempt to parse coordinates
    const coords = locationName.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (coords) {
        return { lat: parseFloat(coords[1]), lng: parseFloat(coords[2]), name: locationName };
    }
    return { lat: Math.random() * 180 - 90, lng: Math.random() * 360 - 180, name: locationName };
}

export async function getLocationData(location: Location): Promise<EnvironmentalData & AIInsights> {
    try {
        const envData = await fetchEnvironmentalData(location);
        
        const soilDataString = `Moisture: ${envData.soil.moisture}, Temp: ${envData.soil.temperature}°C, pH: ${envData.soil.ph}`;
        const weatherPatternsString = `Current Temp: ${envData.weather.currentTemp}°C, NDVI: ${envData.vegetation.ndvi}, Precipitation: ${envData.water.precipitation}mm`;
        const historicalDataString = `Historical data shows fluctuating temperatures and stable NDVI. Recent precipitation has been below average. Current fire risk is ${envData.fire.fireRisk}.`;
        const airQualityString = `AQI: ${envData.airQuality.aqi}, PM2.5: ${envData.airQuality.pm25}`;

        const [predictionsResult, recommendationsResult, riskAssessmentResult] = await Promise.all([
            futureTrendPredictions({
                location: location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
                historicalData: historicalDataString
            }),
            getCropRecommendations({
                latitude: location.lat,
                longitude: location.lng,
                soilData: soilDataString,
                weatherPatterns: weatherPatternsString
            }),
            aiRiskAssessment({
                airQuality: airQualityString,
                fireData: `Active Fires: ${envData.fire.activeFires}, Risk: ${envData.fire.fireRisk}`,
                waterResources: `Precipitation: ${envData.water.precipitation}mm`,
                weatherPatterns: weatherPatternsString,
            })
        ]);
        
        const aiInsights: AIInsights = {
            summary: `This AI-generated summary for ${location.name || 'the selected area'} reveals moderate air quality and healthy vegetation. Soil conditions are generally favorable, though moisture levels are something to monitor.`,
            futurePredictions: predictionsResult.predictions,
            cropRecommendations: recommendationsResult.cropRecommendations,
            environmentalSolutions: "Based on the data, AI suggests promoting native plant species to improve biodiversity and soil health. Consider implementing rainwater harvesting systems to manage water resources more effectively, especially with predicted dry spells.",
            riskAssessment: riskAssessmentResult.riskAssessment
        };

        return {
            ...envData,
            ...aiInsights,
        };

    } catch (error) {
        console.error("Error fetching location data:", error);
        throw new Error("Failed to get data from services.");
    }
}