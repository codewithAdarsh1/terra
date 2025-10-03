"use server";

import { getCropRecommendations } from "@/ai/flows/ai-crop-recommendations";
import { futureTrendPredictions } from "@/ai/flows/ai-future-trend-predictions";
import type { Location, EnvironmentalData, AIInsights } from "./types";

// Mock function to simulate fetching data from NASA APIs
async function fetchNasaData(location: Location): Promise<EnvironmentalData> {
  // In a real app, you'd use location.lat and location.lng to call NASA APIs.
  // Using NASA's API key from environment variables.
  // For now, we return mock data.
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

  const now = new Date();
  
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
      temperature: parseFloat((10 + Math.random() * 20).toFixed(2)),
      ph: parseFloat((5.5 + Math.random() * 2).toFixed(2)),
      nitrogen: parseFloat((10 + Math.random() * 20).toFixed(2)),
      phosphorus: parseFloat((5 + Math.random() * 15).toFixed(2)),
      potassium: parseFloat((20 + Math.random() * 30).toFixed(2)),
    },
    fire: {
      activeFires: Math.floor(Math.random() * 5),
      fireRisk: ['low', 'medium', 'high', 'very-high'][Math.floor(Math.random() * 4)] as 'low' | 'medium' | 'high' | 'very-high',
    },
    water: {
      surfaceWater: parseFloat(Math.random().toFixed(2)),
      precipitation: parseFloat((Math.random() * 10).toFixed(2)),
    },
    weather: {
      currentTemp: parseFloat((15 + Math.random() * 15).toFixed(2)),
      forecast: [
        { day: "Mon", temp: parseFloat((15 + Math.random() * 15).toFixed(2)), condition: "Sunny" },
        { day: "Tue", temp: parseFloat((15 + Math.random() * 15).toFixed(2)), condition: "Cloudy" },
        { day: "Wed", temp: parseFloat((15 + Math.random() * 15).toFixed(2)), condition: "Rainy" },
      ],
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
    return { lat: Math.random() * 180 - 90, lng: Math.random() * 360 - 180, name: locationName };
}

export async function getLocationData(location: Location): Promise<EnvironmentalData & AIInsights> {
    try {
        const nasaData = await fetchNasaData(location);
        
        const soilDataString = `Moisture: ${nasaData.soil.moisture}, Temp: ${nasaData.soil.temperature}°C, pH: ${nasaData.soil.ph}`;
        const weatherPatternsString = `Current Temp: ${nasaData.weather.currentTemp}°C, NDVI: ${nasaData.vegetation.ndvi}`;
        const historicalDataString = `Historical data shows fluctuating temperatures and stable NDVI. Recent precipitation has been below average.`;

        const [predictionsResult, recommendationsResult] = await Promise.all([
            futureTrendPredictions({
                location: location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
                historicalData: historicalDataString
            }),
            getCropRecommendations({
                latitude: location.lat,
                longitude: location.lng,
                soilData: soilDataString,
                weatherPatterns: weatherPatternsString
            })
        ]);
        
        const aiInsights: AIInsights = {
            summary: `This AI-generated summary for ${location.name || 'the selected area'} reveals moderate air quality and healthy vegetation. Soil conditions are generally favorable, though moisture levels are something to monitor.`,
            futurePredictions: predictionsResult.predictions,
            cropRecommendations: recommendationsResult.cropRecommendations,
            environmentalSolutions: "Based on the data, AI suggests promoting native plant species to improve biodiversity and soil health. Consider implementing rainwater harvesting systems to manage water resources more effectively, especially with predicted dry spells.",
            riskAssessment: "AI analysis identifies a medium risk of drought in the coming months based on historical precipitation patterns. The current fire risk is low, but this could change if dry conditions persist."
        };

        return {
            ...nasaData,
            ...aiInsights,
        };

    } catch (error) {
        console.error("Error fetching location data:", error);
        throw new Error("Failed to get data from services.");
    }
}
