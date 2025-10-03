'use server';
/**
 * @fileOverview Master AI orchestrator with improved error handling
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

const orchestratorFlow = ai.defineFlow(
  {
    name: 'aiInsightsOrchestratorFlow',
    inputSchema: z.any(), 
    outputSchema: OrchestratorOutputSchema,
  },
  async (environmentalData: EnvironmentalData) => {
    
    console.log('🚀 Starting AI Orchestrator for location:', environmentalData.location.name);
    
    // Call all AI flows in parallel
    const aiCalls = [
      futureTrendPredictions(environmentalData),
      getCropRecommendations(environmentalData),
      aiRiskAssessment(environmentalData),
      getSimplifiedExplanation(environmentalData),
      aiEnvironmentalSolutions(environmentalData),
      healthAdvisory(environmentalData),
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

    // Log detailed error information
    results.forEach((result, index) => {
      const flowNames = ['Future Predictions', 'Crop Recommendations', 'Risk Assessment', 
                        'Simplified Explanation', 'Environmental Solutions', 'Health Advisory'];
      
      if (result.status === 'rejected') {
        console.error(`❌ ${flowNames[index]} failed:`, result.reason);
        console.error('Error details:', JSON.stringify(result.reason, null, 2));
      } else {
        console.log(`✅ ${flowNames[index]} succeeded`);
      }
    });

    const summary = generateSummary(environmentalData);
    
    const output: AIOrchestratorOutput = {
      summary,
      futurePredictions: predictionsResult.status === 'fulfilled' 
          ? predictionsResult.value.predictions 
          : `Error: ${predictionsResult.status === 'rejected' ? predictionsResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
      cropRecommendations: cropRecommendationsResult.status === 'fulfilled' 
          ? cropRecommendationsResult.value.cropRecommendations 
          : `Error: ${cropRecommendationsResult.status === 'rejected' ? cropRecommendationsResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
      riskAssessment: riskAssessmentResult.status === 'fulfilled' 
          ? riskAssessmentResult.value.riskAssessment 
          : `Error: ${riskAssessmentResult.status === 'rejected' ? riskAssessmentResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
      simplifiedExplanation: simplifiedExplanationResult.status === 'fulfilled' 
          ? simplifiedExplanationResult.value.simplifiedExplanation 
          : `Error: ${simplifiedExplanationResult.status === 'rejected' ? simplifiedExplanationResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
      environmentalSolutions: environmentalSolutionsResult.status === 'fulfilled' 
          ? environmentalSolutionsResult.value.solutions 
          : `Error: ${environmentalSolutionsResult.status === 'rejected' ? environmentalSolutionsResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
      healthAdvisory: healthResult.status === 'fulfilled' 
          ? healthResult.value.healthAdvisory 
          : `Error: ${healthResult.status === 'rejected' ? healthResult.reason?.message || 'Unknown error' : 'Failed to generate'}`,
    };

    console.log('🎉 AI Orchestrator completed');
    
    return output;
  }
);

export async function aiInsightsOrchestrator(input: EnvironmentalData): Promise<AIOrchestratorOutput> {
  try {
    return await orchestratorFlow(input);
  } catch (error) {
    console.error('💥 Critical error in AI Orchestrator:', error);
    throw error;
  }
}
