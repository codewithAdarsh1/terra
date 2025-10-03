'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating simplified explanations of environmental data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';

// Define the output schema for the flow
const SimplifiedExplanationOutputSchema = z.object({
  simplifiedExplanation: z.string().describe('A simplified, easy-to-understand explanation of the environmental data.'),
});
export type SimplifiedExplanationOutput = z.infer<typeof SimplifiedExplanationOutputSchema>;

// Define the Genkit prompt
const simplifiedExplanationPrompt = ai.definePrompt({
  name: 'simplifiedExplanationPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: z.any()},
  output: {schema: SimplifiedExplanationOutputSchema},
  prompt: `You are an AI assistant that specializes in simplifying complex environmental data from NASA's Terra satellite for the average person.

  Given the following environmental data for {{location.name}}, create a concise and easy-to-understand explanation of the current environmental conditions.
  Focus on the most important and impactful information, and avoid technical jargon. Explain what the numbers mean in simple terms.

  - Air Quality (Aerosol & CO): An Aerosol Index of {{airQuality.aerosolIndex}} and Carbon Monoxide level of {{airQuality.co}}.
  - Soil & Vegetation: Soil moisture is at {{soil.moisture}} and the vegetation index (NDVI) is {{vegetation.ndvi}}.
  - Fire Situation: There are {{fire.activeFires}} active fires with a risk level of '{{fire.fireRisk}}'.
  - Weather: The current surface temperature is {{weather.currentTemp}}°C.

  Based on this, what is the simple story of what is happening in this location?
  `,
});

// Define the Genkit flow
const simplifiedExplanationFlow = ai.defineFlow(
  {
    name: 'simplifiedExplanationFlow',
    inputSchema: z.any(),
    outputSchema: SimplifiedExplanationOutputSchema,
  },
  async (environmentalData) => {
    const {output} = await simplifiedExplanationPrompt(environmentalData);
    return output!;
  }
);

/**
 * Generates a simplified explanation of environmental data for a given location.
 */
export async function getSimplifiedExplanation(input: EnvironmentalData): Promise<SimplifiedExplanationOutput> {
  return simplifiedExplanationFlow(input);
}
