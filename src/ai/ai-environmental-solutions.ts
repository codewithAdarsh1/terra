'use server';

/**
 * @fileOverview This file contains the AI-powered environmental solutions flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';


const AIEnvironmentalSolutionsOutputSchema = z.object({
  solutions: z.string().describe('Actionable environmental solutions powered by AI.'),
});
export type AIEnvironmentalSolutionsOutput = z.infer<typeof AIEnvironmentalSolutionsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'aiEnvironmentalSolutionsPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: z.any()},
  output: {schema: AIEnvironmentalSolutionsOutputSchema},
  prompt: `You are an AI assistant that suggests actionable environmental solutions based on the analyzed satellite data for a location.

  Provide clear and concise solutions for {{location.name}} based on the following data derived from NASA's Terra satellite:

  - Air Quality: Aerosol Index {{airQuality.aerosolIndex}}, CO {{airQuality.co}}
  - Soil Data: Moisture {{soil.moisture}}, Temp {{soil.temperature}}°C
  - Fire Detection: {{fire.activeFires}} active fires, Risk: {{fire.fireRisk}}
  - Water Resources: Precipitation {{water.precipitation}}mm
  - Vegetation (NDVI): {{vegetation.ndvi}}
  - Surface Temperature: {{weather.currentTemp}}°C

  Based on any negative indicators in the data above, suggest 2-3 targeted, actionable solutions for local authorities or individuals.
  `,
});

export async function aiEnvironmentalSolutions(environmentalData: EnvironmentalData): Promise<AIEnvironmentalSolutionsOutput> {
  const {output} = await prompt(environmentalData);
  return output!;
}
