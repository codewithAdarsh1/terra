'use server';

/**
 * @fileOverview This file contains the AI-powered risk assessment flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';

const AIRiskAssessmentOutputSchema = z.object({
  riskAssessment: z.string().describe('A comprehensive risk assessment covering drought, fire, and other environmental factors.'),
});
export type AIRiskAssessmentOutput = z.infer<typeof AIRiskAssessmentOutputSchema>;

export async function aiRiskAssessment(environmentalData: EnvironmentalData): Promise<AIRiskAssessmentOutput> {
  return aiRiskAssessmentFlow(environmentalData);
}

const prompt = ai.definePrompt({
  name: 'aiRiskAssessmentPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: z.any()},
  output: {schema: AIRiskAssessmentOutputSchema},
  prompt: `You are an AI assistant that specializes in environmental risk assessment using data from NASA's Terra satellite.
  
  Analyze the following data for {{{location.name}}} and provide a concise risk assessment. Focus on drought risk, fire risk, and potential air quality issues based on aerosols and CO.

  - Air Quality: Aerosol Index of {{{airQuality.aerosolIndex}}} and CO level of {{{airQuality.co}}}.
  - Fire Data: {{{fire.activeFires}}} active fires detected with a risk level of '{{{fire.fireRisk}}}'.
  - Water & Soil: Recent precipitation of {{{water.precipitation}}} mm and soil moisture at {{{soil.moisture}}}.
  - Temperature: Current surface temperature is {{{weather.currentTemp}}}°C.
  - Vegetation Health (NDVI): {{{vegetation.ndvi}}}.

  Synthesize this into a risk assessment covering:
  1.  **Drought Risk:** Based on precipitation, soil moisture, and temperature.
  2.  **Fire Risk:** Based on active fires, risk level, temperature, and vegetation dryness (inferred from NDVI).
  3.  **Air Quality Risk:** Based on aerosol index, CO levels, and fire data.
  `,
});

const aiRiskAssessmentFlow = ai.defineFlow(
  {
    name: 'aiRiskAssessmentFlow',
    inputSchema: z.any(),
    outputSchema: AIRiskAssessmentOutputSchema,
  },
  async (environmentalData) => {
    const {output} = await prompt(environmentalData);
    return output!;
  }
);
