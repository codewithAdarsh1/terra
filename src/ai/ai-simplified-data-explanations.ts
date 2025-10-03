'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating simplified explanations of environmental data.
 *
 * The flow takes in raw environmental data and uses Gemini AI to produce user-friendly insights.
 * @fileOverview
 * - `getSimplifiedExplanation` - A function that takes raw environmental data as input and returns a simplified explanation.
 * - `SimplifiedExplanationInput` - The input type for the `getSimplifiedExplanation` function.
 * - `SimplifiedExplanationOutput` - The output type for the `getSimplifiedExplanation` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const SimplifiedExplanationInputSchema = z.object({
  location: z.string().describe('The location for which the environmental data is being requested.'),
  airQuality: z.string().describe('Air quality data (Aerosol Index, CO) for the specified location.'),
  soilData: z.string().describe('Soil data for the specified location.'),
  fireDetection: z.string().describe('Fire detection data for the specified location.'),
  waterResources: z.string().describe('Water resources data for the specified location.'),
  weatherPatterns: z.string().describe('Weather patterns for the specified location.'),
  temperature: z.string().describe('Surface temperature data for the specified location.'),
  additionalMetrics: z.string().describe('Additional environmental metrics for the specified location.'),
});
export type SimplifiedExplanationInput = z.infer<typeof SimplifiedExplanationInputSchema>;

// Define the output schema for the flow
const SimplifiedExplanationOutputSchema = z.object({
  simplifiedExplanation: z.string().describe('A simplified, easy-to-understand explanation of the environmental data.'),
});
export type SimplifiedExplanationOutput = z.infer<typeof SimplifiedExplanationOutputSchema>;

// Define the Genkit prompt
const simplifiedExplanationPrompt = ai.definePrompt({
  name: 'simplifiedExplanationPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: SimplifiedExplanationInputSchema},
  output: {schema: SimplifiedExplanationOutputSchema},
  prompt: `You are an AI assistant that specializes in simplifying complex environmental data from NASA's Terra satellite for the average person.

  Given the following environmental data for {{location}}, create a concise and easy-to-understand explanation of the current environmental conditions.
  Focus on the most important and impactful information, and avoid technical jargon.

  Air Quality (Aerosols & CO): {{airQuality}}
  Soil Data: {{soilData}}
  Fire Detection (MODIS): {{fireDetection}}
  Water Resources: {{waterResources}}
  Weather Patterns: {{weatherPatterns}}
  Surface Temperature (MODIS): {{temperature}}
  Additional Metrics (NDVI): {{additionalMetrics}}

  Simplified Explanation:`,
});

// Define the Genkit flow
const simplifiedExplanationFlow = ai.defineFlow(
  {
    name: 'simplifiedExplanationFlow',
    inputSchema: SimplifiedExplanationInputSchema,
    outputSchema: SimplifiedExplanationOutputSchema,
  },
  async input => {
    const {output} = await simplifiedExplanationPrompt(input);
    return output!;
  }
);

/**
 * Generates a simplified explanation of environmental data for a given location.
 *
 * @param input - The input data containing environmental information.
 * @returns A promise that resolves to an object containing the simplified explanation.
 */
export async function getSimplifiedExplanation(input: SimplifiedExplanationInput): Promise<SimplifiedExplanationOutput> {
  return simplifiedExplanationFlow(input);
}
