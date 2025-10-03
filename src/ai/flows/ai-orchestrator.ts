'use server';
/**
 * @fileOverview This file contains the AI orchestrator flow that coordinates all other AI insight flows.
 *
 * - aiInsightsOrchestrator - A function that takes raw environmental data and orchestrates calls to various AI tools to generate a comprehensive analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { EnvironmentalData } from '@/lib/types';
import { getCropRecommendations } from './ai-crop-recommendations';
import { futureTrendPredictions } from './ai-future-trend-predictions';
import { aiRiskAssessment } from './ai-risk-assessment';
import { getSimplifiedExplanation } from '../ai-simplified-data-explanations';
import { aiEnvironmentalSolutions } from '../ai-environmental-solutions';


// Define schemas for the orchestrator
const EnvironmentalDataSchema = z.object({
  airQuality: z.object({
    aqi: z.number(),
    pm25: z.number(),
    pm10: z.number(),
    o3: z.number(),
    no2: z.number(),
    so2: z.number(),
    co: z.number(),
  }),
  soil: z.object({
    moisture: z.number(),
    temperature: z.number(),
    ph: z.number(),
    nitrogen: z.number(),
    phosphorus: z.number(),
    potassium: z.number(),
  }),
  fire: z.object({
    activeFires: z.number(),
    fireRisk: z.union([z.literal('low'), z.literal('medium'), z.literal('high'), z.literal('very-high'), z.literal('unknown')]),
  }),
  water: z.object({
    surfaceWater: z.number(),
    precipitation: z.number(),
  }),
  weather: z.object({
    currentTemp: z.number(),
    forecast: z.array(z.object({
      day: z.string(),
      temp: z.number(),
      max: z.number(),
      min: z.number(),
      condition: z.string(),
    })),
  }),
  vegetation: z.object({
    ndvi: z.number(),
  }),
  lastUpdated: z.string(),
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  name: z.string().optional(),
});

const OrchestratorInputSchema = z.object({
  location: LocationSchema,
  environmentalData: EnvironmentalDataSchema,
});

const OrchestratorOutputSchema = z.object({
  summary: z.string(),
  futurePredictions: z.string(),
  cropRecommendations: z.string(),
  riskAssessment: z.string(),
  simplifiedExplanation: z.string(),
  environmentalSolutions: z.string(),
});

export type AIOrchestratorInput = z.infer<typeof OrchestratorInputSchema>;
export type AIOrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;


// Helper functions for data formatting
function formatSoilData(soil: EnvironmentalData['soil']): string {
  return `Moisture: ${soil.moisture}, Temp: ${soil.temperature}°C, pH: ${soil.ph}, N: ${soil.nitrogen}, P: ${soil.phosphorus}, K: ${soil.potassium}`;
}

function formatWeatherData(
  weather: EnvironmentalData['weather'],
  vegetation: EnvironmentalData['vegetation']
): string {
  return `Current Temp: ${weather.currentTemp}°C, NDVI: ${vegetation.ndvi}, Forecast: ${weather.forecast
    .map(f => `${f.day}: ${f.temp}°C`)
    .join(', ')}`;
}

function formatAirQualityData(airQuality: EnvironmentalData['airQuality']): string {
  return `AQI: ${airQuality.aqi}, PM2.5: ${airQuality.pm25}, PM10: ${airQuality.pm10}, O3: ${airQuality.o3}`;
}

function formatFireData(fire: EnvironmentalData['fire']): string {
  return `Active Fires: ${fire.activeFires}, Risk Level: ${fire.fireRisk}`;
}

function formatWaterData(water: EnvironmentalData['water']): string {
  return `Precipitation: ${water.precipitation}mm, Surface Water: ${(water.surfaceWater * 100).toFixed(1)}%`;
}

function generateHistoricalContext(data: EnvironmentalData): string {
    const trends = {
        temperature: data.weather.currentTemp > 25 ? 'above average' : 'moderate',
        precipitation: data.water.precipitation < 5 ? 'below average' : 'normal',
        vegetation: data.vegetation.ndvi > 0.5 ? 'healthy' : 'stressed',
        airQuality: data.airQuality.aqi < 100 ? 'good' : 'moderate to poor',
      };
  return `Historical analysis shows ${trends.temperature} temperatures with ${trends.precipitation} precipitation patterns. ` +
         `Vegetation health is ${trends.vegetation}. Current fire risk is ${data.fire.fireRisk}. ` +
         `Air quality has been ${trends.airQuality}.`;
}

function generateSummary(locationName: string, data: EnvironmentalData): string {
  const airQualityStatus = data.airQuality.aqi < 50 ? 'excellent' :
                          data.airQuality.aqi < 100 ? 'good' :
                          data.airQuality.aqi < 150 ? 'moderate' : 'poor';
  
  const vegetationStatus = data.vegetation.ndvi > 0.6 ? 'very healthy' :
                          data.vegetation.ndvi > 0.4 ? 'healthy' :
                          data.vegetation.ndvi > 0.2 ? 'moderate' : 'stressed';
  
  const moistureStatus = data.soil.moisture > 0.6 ? 'high' :
                        data.soil.moisture > 0.3 ? 'adequate' : 'low';

  return `Environmental assessment for ${locationName}: Air quality is ${airQualityStatus} with an AQI of ${data.airQuality.aqi}. ` +
         `Vegetation shows ${vegetationStatus} conditions with an NDVI of ${data.vegetation.ndvi.toFixed(2)}. ` +
         `Soil moisture levels are ${moistureStatus} at ${(data.soil.moisture * 100).toFixed(1)}%. ` +
         `Fire risk is currently ${data.fire.fireRisk} with ${data.fire.activeFires} active fires detected in the region. ` +
         `Current temperature is ${data.weather.currentTemp}°C with ${data.water.precipitation}mm of recent precipitation.`;
}


// Main orchestrator flow
const orchestratorFlow = ai.defineFlow({
  name: 'aiInsightsOrchestratorFlow',
  inputSchema: OrchestratorInputSchema,
  outputSchema: OrchestratorOutputSchema,
}, async (input) => {
  const { location, environmentalData } = input;
  
  const locationName = location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  
  const dataStrings = {
    soil: formatSoilData(environmentalData.soil),
    weather: formatWeatherData(environmentalData.weather, environmentalData.vegetation),
    airQuality: formatAirQualityData(environmentalData.airQuality),
    fire: formatFireData(environmentalData.fire),
    water: formatWaterData(environmentalData.water),
    temperature: `Current: ${environmentalData.weather.currentTemp}°C`,
    additionalMetrics: `Vegetation Index (NDVI): ${environmentalData.vegetation.ndvi}`,
    historical: generateHistoricalContext(environmentalData),
  };

  try {
    const [
      predictionsResult,
      recommendationsResult,
      riskAssessmentResult,
      simplifiedExplanationResult,
      environmentalSolutionsResult,
    ] = await Promise.all([
      futureTrendPredictions({
        location: locationName,
        historicalData: dataStrings.historical,
      }),
      getCropRecommendations({
        latitude: location.lat,
        longitude: location.lng,
        soilData: dataStrings.soil,
        weatherPatterns: dataStrings.weather,
      }),
      aiRiskAssessment({
        airQuality: dataStrings.airQuality,
        fireData: dataStrings.fire,
        waterResources: dataStrings.water,
        weatherPatterns: dataStrings.weather,
      }),
      getSimplifiedExplanation({
        location: locationName,
        airQuality: dataStrings.airQuality,
        soilData: dataStrings.soil,
        fireDetection: dataStrings.fire,
        waterResources: dataStrings.water,
        weatherPatterns: dataStrings.weather,
        temperature: dataStrings.temperature,
        additionalMetrics: dataStrings.additionalMetrics,
      }),
      aiEnvironmentalSolutions({
        airQuality: dataStrings.airQuality,
        soilData: dataStrings.soil,
        fireDetection: dataStrings.fire,
        waterResources: dataStrings.water,
        weatherPatterns: dataStrings.weather,
        temperature: dataStrings.temperature,
      }),
    ]);

    const summary = generateSummary(locationName, environmentalData);

    return {
      summary,
      futurePredictions: predictionsResult.predictions,
      cropRecommendations: recommendationsResult.cropRecommendations,
      riskAssessment: riskAssessmentResult.riskAssessment,
      simplifiedExplanation: simplifiedExplanationResult.simplifiedExplanation,
      environmentalSolutions: environmentalSolutionsResult.solutions,
    };
  } catch (error) {
    console.error('Error in AI orchestrator:', error);
    
    return {
      summary: `Unable to generate complete AI insights for ${locationName} at this time.`,
      futurePredictions: 'Prediction analysis temporarily unavailable.',
      cropRecommendations: 'Crop recommendations temporarily unavailable.',
      riskAssessment: 'Risk assessment temporarily unavailable.',
      simplifiedExplanation: 'Simplified explanation temporarily unavailable.',
      environmentalSolutions: 'Environmental solutions temporarily unavailable.',
    };
  }
});


export async function aiInsightsOrchestrator(input: AIOrchestratorInput): Promise<AIOrchestratorOutput> {
    return orchestratorFlow(input);
}
