'use server';
/**
 * @fileOverview Master AI orchestrator that coordinates all AI insights generation for environmental data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { EnvironmentalData } from '@/lib/types';
import { getCropRecommendations } from './ai-crop-recommendations';
import { futureTrendPredictions } from './ai-future-trend-predictions';
import { aiRiskAssessment } from './ai-risk-assessment';
import { getSimplifiedExplanation } from '../ai-simplified-data-explanations';
import { aiEnvironmentalSolutions } from '../ai-environmental-solutions';
import { healthAdvisory } from './ai-health-advisory';

// Define the output schema for the orchestrator
const OrchestratorOutputSchema = z.object({
  summary: z.string().describe('Executive summary of environmental conditions'),
  futurePredictions: z.string().describe('AI-generated future trend predictions'),
  cropRecommendations: z.string().describe('AI-driven crop recommendations'),
  riskAssessment: z.string().describe('Environmental risk assessment'),
  simplifiedExplanation: z.string().describe('Simplified explanation for general audience'),
  environmentalSolutions: z.string().describe('Recommended environmental solutions'),
  healthAdvisory: z.string().describe('AI-powered health advisory'),
});

export type AIOrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;


/**
 * Generates a concise summary of the environmental data.
 * This is a non-AI helper function to create a baseline summary.
 */
function generateSummary(data: EnvironmentalData): string {
  const locationName = data.location.name || `${data.location.lat.toFixed(2)}, ${data.location.lng.toFixed(2)}`;
  
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


// Main orchestrator flow
const orchestratorFlow = ai.defineFlow(
  {
    name: 'aiInsightsOrchestratorFlow',
    // Input is now the raw EnvironmentalData object
    inputSchema: z.any(), 
    outputSchema: OrchestratorOutputSchema,
  },
  async (environmentalData: EnvironmentalData) => {
    
    // All AI flows are called in parallel
    const aiCalls = [
      futureTrendPredictions(environmentalData),
      getCropRecommendations(environmentalData),
      aiRiskAssessment(environmentalData),
      getSimplifiedExplanation(environmentalData),
      aiEnvironmentalSolutions(environmentalData),
      healthAdvisory(environmentalData),
    ];

    // Use Promise.allSettled to ensure all promises complete, even if some fail
    const results = await Promise.allSettled(aiCalls);
    
    const [
      predictionsResult,
      cropRecommendationsResult,
      riskAssessmentResult,
      simplifiedExplanationResult,
      environmentalSolutionsResult,
      healthResult
    ] = results;

    // A non-AI summary is generated as a baseline
    const summary = generateSummary(environmentalData);
    
    // Construct the final output, with fallbacks for failed calls
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
          : `Environmental conditions at ${environmentalData.location.name} are being analyzed.`,
      environmentalSolutions: environmentalSolutionsResult.status === 'fulfilled' 
          ? environmentalSolutionsResult.value.solutions 
          : 'Environmental solutions are being formulated.',
      healthAdvisory: healthResult.status === 'fulfilled' 
          ? healthResult.value.healthAdvisory 
          : 'Health advisory is currently unavailable.',
    };

    // Log any failed promises for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`AI flow at index ${index} failed:`, result.reason);
      }
    });

    return output;
  }
);

// Export the main orchestrator function
export async function aiInsightsOrchestrator(input: EnvironmentalData): Promise<AIOrchestratorOutput> {
  return orchestratorFlow(input);
}
