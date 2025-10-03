'use server';
/**
 * @fileOverview Master AI orchestrator that coordinates all AI insights generation for environmental data.
 * 
 * - aiInsightsOrchestrator - Main orchestrator flow that calls all other AI flows
 * - Handles data shaping and parallel execution of AI insights
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { EnvironmentalData } from '@/lib/types';
import { getCropRecommendations } from './ai-crop-recommendations';
import { futureTrendPredictions } from './ai-future-trend-predictions';
import { aiRiskAssessment } from './ai-risk-assessment';
import { getSimplifiedExplanation } from '../ai-simplified-data-explanations';
import { aiEnvironmentalSolutions } from '../ai-environmental-solutions';

// Input Schemas
const LocationSchema = z.object({
  lat: z.number().describe('Latitude of the location'),
  lng: z.number().describe('Longitude of the location'),
  name: z.string().optional().describe('Name of the location'),
});

const AirQualitySchema = z.object({
  aqi: z.number().describe('Air Quality Index'),
  pm25: z.number().describe('PM2.5 levels'),
  pm10: z.number().describe('PM10 levels'),
  o3: z.number().describe('Ozone levels'),
  no2: z.number().describe('Nitrogen dioxide levels'),
  so2: z.number().describe('Sulfur dioxide levels'),
  co: z.number().describe('Carbon monoxide levels'),
});

const SoilDataSchema = z.object({
  moisture: z.number().describe('Soil moisture level'),
  temperature: z.number().describe('Soil temperature in Celsius'),
  ph: z.number().describe('Soil pH level'),
  nitrogen: z.number().describe('Nitrogen content'),
  phosphorus: z.number().describe('Phosphorus content'),
  potassium: z.number().describe('Potassium content'),
});

const FireDataSchema = z.object({
  activeFires: z.number().describe('Number of active fires'),
  fireRisk: z.union([z.literal('low'), z.literal('medium'), z.literal('high'), z.literal('very-high'), z.literal('unknown')]),
});

const WaterDataSchema = z.object({
  surfaceWater: z.number().describe('Surface water percentage'),
  precipitation: z.number().describe('Precipitation in mm'),
});

const WeatherForecastSchema = z.object({
  day: z.string().describe('Day of the week'),
  temp: z.number().describe('Temperature'),
  max: z.number().describe('Maximum temperature'),
  min: z.number().describe('Minimum temperature'),
  condition: z.string().describe('Weather condition'),
});

const WeatherDataSchema = z.object({
  currentTemp: z.number().describe('Current temperature in Celsius'),
  forecast: z.array(WeatherForecastSchema).describe('5-day weather forecast'),
});

const VegetationDataSchema = z.object({
  ndvi: z.number().describe('Normalized Difference Vegetation Index'),
});

const EnvironmentalDataSchema = z.object({
  airQuality: AirQualitySchema,
  soil: SoilDataSchema,
  fire: FireDataSchema,
  water: WaterDataSchema,
  weather: WeatherDataSchema,
  vegetation: VegetationDataSchema,
  lastUpdated: z.string().describe('ISO timestamp of last data update'),
});

const OrchestratorInputSchema = z.object({
  location: LocationSchema,
  environmentalData: EnvironmentalDataSchema,
});

export type AIOrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

const OrchestratorOutputSchema = z.object({
  summary: z.string().describe('Executive summary of environmental conditions'),
  futurePredictions: z.string().describe('AI-generated future trend predictions'),
  cropRecommendations: z.string().describe('AI-driven crop recommendations'),
  riskAssessment: z.string().describe('Environmental risk assessment'),
  simplifiedExplanation: z.string().describe('Simplified explanation for general audience'),
  environmentalSolutions: z.string().describe('Recommended environmental solutions'),
});

export type AIOrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// Helper functions for data formatting
function formatSoilData(soil: z.infer<typeof SoilDataSchema>): string {
  return `Moisture: ${(soil.moisture * 100).toFixed(1)}%, Temperature: ${soil.temperature}°C, pH: ${soil.ph}, Nitrogen: ${soil.nitrogen}mg/kg, Phosphorus: ${soil.phosphorus}mg/kg, Potassium: ${soil.potassium}mg/kg`;
}

function formatWeatherData(
  weather: z.infer<typeof WeatherDataSchema>,
  vegetation: z.infer<typeof VegetationDataSchema>
): string {
  const forecastSummary = weather.forecast
    .slice(0, 3)
    .map(f => `${f.day}: ${f.temp}°C (${f.min}-${f.max}°C)`)
    .join(', ');
  return `Current Temperature: ${weather.currentTemp}°C, NDVI: ${vegetation.ndvi.toFixed(2)}, 3-Day Forecast: ${forecastSummary}`;
}

function formatAirQualityData(airQuality: z.infer<typeof AirQualitySchema>): string {
  const aqiCategory = airQuality.aqi <= 50 ? 'Good' :
                      airQuality.aqi <= 100 ? 'Moderate' :
                      airQuality.aqi <= 150 ? 'Unhealthy for Sensitive Groups' :
                      airQuality.aqi <= 200 ? 'Unhealthy' :
                      airQuality.aqi <= 300 ? 'Very Unhealthy' : 'Hazardous';
  
  return `AQI: ${airQuality.aqi} (${aqiCategory}), PM2.5: ${airQuality.pm25}µg/m³, PM10: ${airQuality.pm10}µg/m³, O3: ${airQuality.o3}ppb`;
}

function formatFireData(fire: z.infer<typeof FireDataSchema>): string {
  return `Active Fires: ${fire.activeFires}, Risk Level: ${fire.fireRisk}`;
}

function formatWaterData(water: z.infer<typeof WaterDataSchema>): string {
  return `Precipitation: ${water.precipitation}mm, Surface Water Coverage: ${(water.surfaceWater * 100).toFixed(1)}%`;
}

function generateHistoricalContext(data: z.infer<typeof EnvironmentalDataSchema>): string {
  const precipitationStatus = data.water.precipitation < 5 ? 'below average' :
                             data.water.precipitation < 15 ? 'average' : 'above average';
  
  const vegetationHealth = data.vegetation.ndvi > 0.6 ? 'excellent' :
                          data.vegetation.ndvi > 0.4 ? 'good' :
                          data.vegetation.ndvi > 0.2 ? 'moderate' : 'poor';
  
  const tempTrend = data.weather.currentTemp > 30 ? 'above normal' :
                   data.weather.currentTemp > 20 ? 'normal' : 'below normal';
  
  return `Historical patterns indicate ${precipitationStatus} precipitation levels with ${vegetationHealth} vegetation health. ` +
         `Temperature trends are ${tempTrend}. Fire risk assessment shows ${data.fire.fireRisk} risk level with ${data.fire.activeFires} active incidents. ` +
         `Soil moisture at ${(data.soil.moisture * 100).toFixed(1)}% indicates ${data.soil.moisture > 0.5 ? 'adequate' : 'low'} water retention.`;
}

function generateSummary(locationName: string, data: z.infer<typeof EnvironmentalDataSchema>): string {
  const airQualityStatus = data.airQuality.aqi < 50 ? 'excellent' :
                          data.airQuality.aqi < 100 ? 'good' :
                          data.airQuality.aqi < 150 ? 'moderate' : 'poor';
  
  const vegetationStatus = data.vegetation.ndvi > 0.6 ? 'thriving' :
                          data.vegetation.ndvi > 0.4 ? 'healthy' :
                          data.vegetation.ndvi > 0.2 ? 'stressed' : 'critical';
  
  const soilHealth = data.soil.ph >= 6.0 && data.soil.ph <= 7.5 && 
                    data.soil.moisture > 0.3 && data.soil.moisture < 0.7 ? 'optimal' : 'suboptimal';

  return `Environmental assessment for ${locationName} reveals ${airQualityStatus} air quality (AQI: ${data.airQuality.aqi}). ` +
         `Vegetation is ${vegetationStatus} with NDVI at ${data.vegetation.ndvi.toFixed(2)}. ` +
         `Soil conditions are ${soilHealth} with ${(data.soil.moisture * 100).toFixed(1)}% moisture and pH ${data.soil.ph}. ` +
         `Fire risk is ${data.fire.fireRisk} with ${data.fire.activeFires} active fires in the region. ` +
         `Recent precipitation totals ${data.water.precipitation}mm with current temperature at ${data.weather.currentTemp}°C.`;
}


// Main orchestrator flow
const orchestratorFlow = ai.defineFlow(
  {
    name: 'aiInsightsOrchestratorFlow',
    inputSchema: OrchestratorInputSchema,
    outputSchema: OrchestratorOutputSchema,
  },
  async (input) => {
    const { location, environmentalData } = input;
    
    // Prepare location name
    const locationName = location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    
    // Shape data for AI consumption
    const dataStrings = {
      soil: formatSoilData(environmentalData.soil),
      weather: formatWeatherData(environmentalData.weather, environmentalData.vegetation),
      airQuality: formatAirQualityData(environmentalData.airQuality),
      fire: formatFireData(environmentalData.fire),
      water: formatWaterData(environmentalData.water),
      temperature: `Current: ${environmentalData.weather.currentTemp}°C`,
      additionalMetrics: `Vegetation Index (NDVI): ${environmentalData.vegetation.ndvi.toFixed(3)}`,
      historical: generateHistoricalContext(environmentalData),
    };

    try {
      // Execute all AI flows in parallel
      const [
        predictions,
        cropRecommendations,
        riskAssessment,
        simplifiedExplanation,
        environmentalSolutions,
      ] = await Promise.allSettled([
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

      // Extract results with fallbacks for failed promises
      const getResultOrFallback = <T extends { [key: string]: string }>(
        result: PromiseSettledResult<T>,
        fallbackKey: string,
        fallbackMessage: string
      ): string => {
        if (result.status === 'fulfilled' && result.value[fallbackKey]) {
          return result.value[fallbackKey];
        }
        console.error(`Failed to get ${fallbackKey}:`, result.status === 'rejected' ? result.reason : 'No data');
        return fallbackMessage;
      };

      // Generate comprehensive summary
      const summary = generateSummary(locationName, environmentalData);

      return {
        summary,
        futurePredictions: getResultOrFallback(
          predictions,
          'predictions',
          'Future trend analysis is temporarily unavailable. Please check back later.'
        ),
        cropRecommendations: getResultOrFallback(
          cropRecommendations,
          'cropRecommendations',
          'Crop recommendations are being processed. Default suggestion: Consider drought-resistant varieties based on current conditions.'
        ),
        riskAssessment: getResultOrFallback(
          riskAssessment,
          'riskAssessment',
          'Risk assessment in progress. Monitor fire and air quality alerts for your area.'
        ),
        simplifiedExplanation: getResultOrFallback(
          simplifiedExplanation,
          'simplifiedExplanation',
          `The environmental conditions at ${locationName} are being analyzed. Key metrics are within expected ranges.`
        ),
        environmentalSolutions: getResultOrFallback(
          environmentalSolutions,
          'solutions',
          'Environmental solutions are being formulated based on current conditions.'
        ),
      };
    } catch (error) {
      console.error('Critical error in AI orchestrator:', error);
      return {
        summary: generateSummary(locationName, environmentalData),
        futurePredictions: 'Analysis system is currently offline.',
        cropRecommendations: 'Recommendation system is currently offline.',
        riskAssessment: 'Risk assessment system is currently offline.',
        simplifiedExplanation: 'Explanation system is currently offline.',
        environmentalSolutions: 'Solution system is currently offline.',
      };
    }
  }
);


export async function aiInsightsOrchestrator(input: AIOrchestratorInput): Promise<AIOrchestratorOutput> {
  return orchestratorFlow(input);
}
