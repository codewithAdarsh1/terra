'use server';

/**
 * @fileOverview This file contains the AI-powered health advisory flow.
 *
 * - healthAdvisory - A function that provides an AI-powered health advisory based on environmental data.
 * - HealthAdvisoryInput - The input type for the healthAdvisory function.
 * - HealthAdvisoryOutput - The return type for the healthAdvisory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthAdvisoryInputSchema = z.object({
  airQuality: z.string().describe('Air quality data (Aerosol Index, CO) for the location.'),
  temperature: z.string().describe('Surface temperature and weather patterns for the location.'),
  fireData: z.string().describe('Fire detection data for the location.'),
});
export type HealthAdvisoryInput = z.infer<typeof HealthAdvisoryInputSchema>;

const HealthAdvisoryOutputSchema = z.object({
  healthAdvisory: z.string().describe('A comprehensive health advisory based on the provided environmental data.'),
});
export type HealthAdvisoryOutput = z.infer<typeof HealthAdvisoryOutputSchema>;

export async function healthAdvisory(input: HealthAdvisoryInput): Promise<HealthAdvisoryOutput> {
  return healthAdvisoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthAdvisoryPrompt',
  input: {schema: HealthAdvisoryInputSchema},
  output: {schema: HealthAdvisoryOutputSchema},
  prompt: `You are a public health expert providing advice based on environmental data from NASA satellites.
  
  Analyze the following data and generate a concise health advisory. Focus on respiratory health, heat exposure, and risks from fires. Provide actionable recommendations for the general public and for sensitive groups.

  Air Quality (Aerosol & CO): {{{airQuality}}}
  Temperature & Weather: {{{temperature}}}
  Fire Data (MODIS): {{{fireData}}}

  Health Advisory:`,
});

const healthAdvisoryFlow = ai.defineFlow(
  {
    name: 'healthAdvisoryFlow',
    inputSchema: HealthAdvisoryInputSchema,
    outputSchema: HealthAdvisoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
