'use server';

/**
 * @fileOverview This file contains the AI-powered environmental solutions flow.
 *
 * - aiEnvironmentalSolutions - A function that suggests actionable environmental solutions based on analyzed data.
 * - AIEnvironmentalSolutionsInput - The input type for the aiEnvironmentalSolutions function.
 * - AIEnvironmentalSolutionsOutput - The return type for the aiEnvironmentalSolutions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIEnvironmentalSolutionsInputSchema = z.object({
  airQuality: z.string().describe('Air quality data (Aerosol Index, Carbon Monoxide) for the location.'),
  soilData: z.string().describe('Soil data for the location.'),
  fireDetection: z.string().describe('Fire detection data for the location.'),
  waterResources: z.string().describe('Water resources data for the location.'),
  weatherPatterns: z.string().describe('Weather patterns for the location.'),
  temperature: z.string().describe('Temperature data for the location.'),
});
export type AIEnvironmentalSolutionsInput = z.infer<typeof AIEnvironmentalSolutionsInputSchema>;

const AIEnvironmentalSolutionsOutputSchema = z.object({
  solutions: z.string().describe('Actionable environmental solutions powered by AI.'),
});
export type AIEnvironmentalSolutionsOutput = z.infer<typeof AIEnvironmentalSolutionsOutputSchema>;

export async function aiEnvironmentalSolutions(input: AIEnvironmentalSolutionsInput): Promise<AIEnvironmentalSolutionsOutput> {
  return aiEnvironmentalSolutionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiEnvironmentalSolutionsPrompt',
  input: {schema: AIEnvironmentalSolutionsInputSchema},
  output: {schema: AIEnvironmentalSolutionsOutputSchema},
  prompt: `You are an AI assistant that suggests actionable environmental solutions based on the analyzed satellite data for a location.

  Provide clear and concise solutions based on the following data derived from NASA's Terra satellite:

  Air Quality (Aerosols & CO): {{{airQuality}}}
  Soil Data: {{{soilData}}}
  Fire Detection (MODIS): {{{fireDetection}}}
  Water Resources: {{{waterResources}}}
  Weather Patterns: {{{weatherPatterns}}}
  Surface Temperature (MODIS): {{{temperature}}}

  Solutions:`,
});

const aiEnvironmentalSolutionsFlow = ai.defineFlow(
  {
    name: 'aiEnvironmentalSolutionsFlow',
    inputSchema: AIEnvironmentalSolutionsInputSchema,
    outputSchema: AIEnvironmentalSolutionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
