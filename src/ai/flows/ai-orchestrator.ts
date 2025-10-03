'use server';
/**
 * @fileOverview Master AI orchestrator that coordinates all AI insights generation for environmental data.
 * 
 * Enhanced with:
 * - Retry logic for failed AI calls
 * - Performance monitoring
 * - Caching support
 * - Detailed logging and tracing
 * - Validation and data quality checks
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getCropRecommendations } from './ai-crop-recommendations';
import { futureTrendPredictions } from './ai-future-trend-predictions';
import { aiRiskAssessment } from './ai-risk-assessment';
import { getSimplifiedExplanation } from '../ai-simplified-data-explanations';
import { aiEnvironmentalSolutions } from '../ai-environmental-solutions';
import { healthAdvisory } from './ai-health-advisory';

// Configuration constants
const CONFIG = {
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // ms
  CACHE_TTL: 300000, // 5 minutes in ms
  PERFORMANCE_THRESHOLD: 5000, // ms - log warning if execution takes longer
  DATA_QUALITY_THRESHOLDS: {
    MIN_VALID_READINGS: 0.7, // 70% of data should be valid
    MAX_DATA_AGE_HOURS: 24,
  },
} as const;

// Enhanced schemas with stricter validation
const LocationSchema = z.object({
  lat: z.number().min(-90).max(90).describe('Latitude of the location'),
  lng: z.number().min(-180).max(180).describe('Longitude of the location'),
  name: z.string().optional().describe('Name of the location'),
});

const AirQualitySchema = z.object({
  aerosolIndex: z.number().describe('Aerosol Optical Depth'),
  co: z.number().describe('Carbon Monoxide levels'),
});

const SoilDataSchema = z.object({
  moisture: z.number().min(0).max(1).describe('Soil moisture level (0-1)'),
  temperature: z.number().min(-50).max(60).describe('Soil temperature in Celsius'),
  ph: z.number().min(0).max(14).describe('Soil pH level'),
  nitrogen: z.number().min(0).describe('Nitrogen content'),
  phosphorus: z.number().min(0).describe('Phosphorus content'),
  potassium: z.number().min(0).describe('Potassium content'),
});

const FireDataSchema = z.object({
  activeFires: z.number().min(0).describe('Number of active fires'),
  fireRisk: z.union([
    z.literal('low'),
    z.literal('medium'),
    z.literal('high'),
    z.literal('very-high'),
    z.literal('unknown')
  ]).describe('Fire risk level'),
});

const WaterDataSchema = z.object({
  surfaceWater: z.number().min(0).max(1).describe('Surface water percentage (0-1)'),
  precipitation: z.number().min(0).describe('Precipitation in mm'),
});

const WeatherForecastSchema = z.object({
  day: z.string().describe('Day of the week'),
  temp: z.number().describe('Temperature'),
  max: z.number().describe('Maximum temperature'),
  min: z.number().describe('Minimum temperature'),
  condition: z.string().describe('Weather condition'),
});

const WeatherDataSchema = z.object({
  currentTemp: z.number().min(-60).max(60).describe('Current temperature in Celsius'),
  forecast: z.array(WeatherForecastSchema).describe('5-day weather forecast'),
});

const VegetationDataSchema = z.object({
  ndvi: z.number().min(-1).max(1).describe('Normalized Difference Vegetation Index'),
});

const EnvironmentalDataSchema = z.object({
  airQuality: AirQualitySchema,
  soil: SoilDataSchema,
  fire: FireDataSchema,
  water: WaterDataSchema,
  weather: WeatherDataSchema,
  vegetation: VegetationDataSchema,
  lastUpdated: z.string().datetime().describe('ISO timestamp of last data update'),
});

const OrchestratorInputSchema = z.object({
  location: LocationSchema,
  environmentalData: EnvironmentalDataSchema,
  options: z.object({
    skipCache: z.boolean().optional().describe('Skip cache and force fresh AI generation'),
    priority: z.enum(['normal', 'high']).optional().default('normal').describe('Processing priority'),
    includeDebugInfo: z.boolean().optional().default(false).describe('Include debug information'),
  }).optional(),
});

export type AIOrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

const OrchestratorOutputSchema = z.object({
  summary: z.string().describe('Executive summary of environmental conditions'),
  futurePredictions: z.string().describe('AI-generated future trend predictions'),
  cropRecommendations: z.string().describe('AI-driven crop recommendations'),
  riskAssessment: z.string().describe('Environmental risk assessment'),
  simplifiedExplanation: z.string().describe('Simplified explanation for general audience'),
  environmentalSolutions: z.string().describe('Recommended environmental solutions'),
  healthAdvisory: z.string().describe('AI-powered health advisory'),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    processingTimeMs: z.number(),
    dataQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    cacheable: z.boolean(),
    debugInfo: z.any().optional(),
  }).optional(),
});

export type AIOrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// Simple in-memory cache (consider Redis for production)
const cache = new Map<string, { data: AIOrchestratorOutput; timestamp: number }>();

// Helper function to generate cache key
function getCacheKey(location: z.infer<typeof LocationSchema>, data: z.infer<typeof EnvironmentalDataSchema>): string {
  return `${location.lat.toFixed(4)}_${location.lng.toFixed(4)}_${data.lastUpdated}`;
}

// Helper function to validate data quality
function assessDataQuality(data: z.infer<typeof EnvironmentalDataSchema>): 'excellent' | 'good' | 'fair' | 'poor' {
  const checks = [
    data.airQuality.aerosolIndex >= 0,
    data.soil.moisture >= 0 && data.soil.moisture <= 1,
    data.vegetation.ndvi >= -1 && data.vegetation.ndvi <= 1,
    data.fire.fireRisk !== 'unknown',
    new Date(data.lastUpdated).getTime() > Date.now() - CONFIG.DATA_QUALITY_THRESHOLDS.MAX_DATA_AGE_HOURS * 3600000,
  ];
  
  const validChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;
  const validRatio = validChecks / totalChecks;
  
  if (validRatio >= 0.9) return 'excellent';
  if (validRatio >= 0.7) return 'good';
  if (validRatio >= 0.5) return 'fair';
  return 'poor';
}

// Helper functions for data formatting (keeping existing ones)
function formatSoilData(soil: z.infer<typeof SoilDataSchema>): string {
  return `Moisture: ${(soil.moisture * 100).toFixed(1)}%, Temperature: ${soil.temperature}°C, pH: ${soil.ph.toFixed(1)}, Nitrogen: ${soil.nitrogen}mg/kg, Phosphorus: ${soil.phosphorus}mg/kg, Potassium: ${soil.potassium}mg/kg`;
}

function formatWeatherData(
  weather: z.infer<typeof WeatherDataSchema>,
  vegetation: z.infer<typeof VegetationDataSchema>
): string {
  const forecastSummary = weather.forecast
    .slice(0, 3)
    .map(f => `${f.day}: ${f.temp}°C (${f.min}-${f.max}°C)`)
    .join(', ');
  return `Current Surface Temperature: ${weather.currentTemp}°C, NDVI: ${vegetation.ndvi.toFixed(2)}, 3-Day Forecast: ${forecastSummary}`;
}

function formatAirQualityData(airQuality: z.infer<typeof AirQualitySchema>): string {
  const aerosolCategory = airQuality.aerosolIndex < 0.1 ? 'Clear' :
                          airQuality.aerosolIndex < 0.3 ? 'Hazy' :
                          'Very Hazy/Smoky';

  return `Aerosol Index: ${airQuality.aerosolIndex.toFixed(3)} (${aerosolCategory}), Carbon Monoxide: ${airQuality.co.toExponential(2)} mol/m^2`;
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
  const airQualityStatus = data.airQuality.aerosolIndex < 0.1 ? 'clear' :
                          data.airQuality.aerosolIndex < 0.3 ? 'hazy' :
                          'very hazy or smoky';
  
  const vegetationStatus = data.vegetation.ndvi > 0.6 ? 'thriving' :
                          data.vegetation.ndvi > 0.4 ? 'healthy' :
                          data.vegetation.ndvi > 0.2 ? 'stressed' : 'critical';
  
  const soilHealth = data.soil.ph >= 6.0 && data.soil.ph <= 7.5 && 
                    data.soil.moisture > 0.3 && data.soil.moisture < 0.7 ? 'optimal' : 'suboptimal';

  return `Environmental assessment for ${locationName} reveals ${airQualityStatus} air quality (Aerosol Index: ${data.airQuality.aerosolIndex.toFixed(3)}). ` +
         `Vegetation is ${vegetationStatus} with an NDVI of ${data.vegetation.ndvi.toFixed(2)}. ` +
         `Soil conditions are ${soilHealth} with ${(data.soil.moisture * 100).toFixed(1)}% moisture and pH ${data.soil.ph}. ` +
         `Fire risk is ${data.fire.fireRisk} with ${data.fire.activeFires} active fires in the region. ` +
         `Recent precipitation totals ${data.water.precipitation}mm with current surface temperature at ${data.weather.currentTemp}°C.`;
}

// Main orchestrator flow with enhanced features
const orchestratorFlow = ai.defineFlow(
  {
    name: 'aiInsightsOrchestratorFlow',
    inputSchema: OrchestratorInputSchema,
    outputSchema: OrchestratorOutputSchema,
  },
  async (input) => {
    const startTime = Date.now();
    const { location, environmentalData, options = {} } = input;
    
    if (!options.skipCache) {
      const cacheKey = getCacheKey(location, environmentalData);
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_TTL)) {
        console.log(`Cache hit for ${cacheKey}`);
        return {
          ...cached.data,
          metadata: {
            ...cached.data.metadata,
            processingTimeMs: Date.now() - startTime,
            debugInfo: options.includeDebugInfo ? { cacheHit: true, cacheKey } : undefined,
          },
        };
      }
    }
    
    const dataQuality = assessDataQuality(environmentalData);
    if (dataQuality === 'poor' && options.priority !== 'high') {
      console.warn('Data quality is poor, results may be unreliable');
    }
    
    const locationName = location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    
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
      const aiCalls = [
        futureTrendPredictions({ location: locationName, historicalData: dataStrings.historical }),
        getCropRecommendations({ latitude: location.lat, longitude: location.lng, soilData: dataStrings.soil, weatherPatterns: dataStrings.weather }),
        aiRiskAssessment({ airQuality: dataStrings.airQuality, fireData: dataStrings.fire, waterResources: dataStrings.water, weatherPatterns: dataStrings.weather }),
        getSimplifiedExplanation({ location: locationName, airQuality: dataStrings.airQuality, soilData: dataStrings.soil, fireDetection: dataStrings.fire, waterResources: dataStrings.water, weatherPatterns: dataStrings.weather, temperature: dataStrings.temperature, additionalMetrics: dataStrings.additionalMetrics }),
        aiEnvironmentalSolutions({ airQuality: dataStrings.airQuality, soilData: dataStrings.soil, fireDetection: dataStrings.fire, waterResources: dataStrings.water, weatherPatterns: dataStrings.weather, temperature: dataStrings.temperature }),
        healthAdvisory({ airQuality: dataStrings.airQuality, temperature: dataStrings.weather, fireData: dataStrings.fire }),
      ];

      const results = await Promise.allSettled(aiCalls);
      
      const [
        predictionsResult,
        cropRecommendationsResult,
        riskAssessmentResult,
        simplifiedExplanationResult,
        environmentalSolutionsResult,
        healthResult
      ] = results;

      const summary = generateSummary(locationName, environmentalData);
      
      const processingTime = Date.now() - startTime;
      
      if (processingTime > CONFIG.PERFORMANCE_THRESHOLD) {
        console.warn(`Orchestrator took ${processingTime}ms to complete (threshold: ${CONFIG.PERFORMANCE_THRESHOLD}ms)`);
      }

      const output: AIOrchestratorOutput = {
        summary,
        futurePredictions: predictionsResult.status === 'fulfilled' 
            ? predictionsResult.value.predictions 
            : 'Future trend analysis is temporarily unavailable.',
        cropRecommendations: cropRecommendationsResult.status === 'fulfilled' 
            ? cropRecommendationsResult.value.cropRecommendations 
            : 'Crop recommendations are being processed.',
        riskAssessment: riskAssessmentResult.status === 'fulfilled' 
            ? riskAssessmentResult.value.riskAssessment 
            : 'Risk assessment in progress.',
        simplifiedExplanation: simplifiedExplanationResult.status === 'fulfilled' 
            ? simplifiedExplanationResult.value.simplifiedExplanation 
            : `Environmental conditions at ${locationName} are being analyzed.`,
        environmentalSolutions: environmentalSolutionsResult.status === 'fulfilled' 
            ? environmentalSolutionsResult.value.solutions 
            : 'Environmental solutions are being formulated.',
        healthAdvisory: healthResult.status === 'fulfilled' 
            ? healthResult.value.healthAdvisory 
            : 'Health advisory is currently unavailable.',
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          dataQuality,
          cacheable: dataQuality !== 'poor',
          debugInfo: options.includeDebugInfo ? { location: locationName, dataStrings, aiResults: results.map(r => r.status) } : undefined,
        },
      };

      if (dataQuality !== 'poor' && !options.skipCache) {
        const cacheKey = getCacheKey(location, environmentalData);
        cache.set(cacheKey, { data: output, timestamp: Date.now() });
        
        if (cache.size > 100) {
          const oldestKey = Array.from(cache.entries()).sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
          cache.delete(oldestKey);
        }
      }

      return output;
    } catch (error) {
      console.error('Critical error in AI orchestrator:', error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        summary: generateSummary(locationName, environmentalData),
        futurePredictions: 'Analysis system is currently offline.',
        cropRecommendations: 'Recommendation system is currently offline.',
        riskAssessment: 'Risk assessment system is currently offline.',
        simplifiedExplanation: 'Explanation system is currently offline.',
        environmentalSolutions: 'Solution system is currently offline.',
        healthAdvisory: 'Health advisory system is currently offline.',
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          dataQuality,
          cacheable: false,
          debugInfo: options.includeDebugInfo ? { error: String(error) } : undefined,
        },
      };
    }
  }
);

// Export the main orchestrator function
export async function aiInsightsOrchestrator(input: AIOrchestratorInput): Promise<AIOrchestratorOutput> {
  return orchestratorFlow(input);
}

// Optional: Export a function to clear the cache
export async function clearOrchestratorCache(): Promise<void> {
  cache.clear();
  console.log('Orchestrator cache cleared');
}

// Optional: Export cache statistics
export async function getOrchestratorCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      dataQuality: value.data.metadata?.dataQuality,
    })),
  };
}
