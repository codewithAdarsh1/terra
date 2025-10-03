'use server';

/**
 * @fileOverview This file contains the AI-powered health advisory flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';


const HealthAdvisoryOutputSchema = z.object({
  healthAdvisory: z.string().describe('A comprehensive health advisory based on the provided environmental data.'),
});
export type HealthAdvisoryOutput = z.infer<typeof HealthAdvisoryOutputSchema>;

export async function healthAdvisory(environmentalData: EnvironmentalData): Promise<HealthAdvisoryOutput> {
  return healthAdvisoryFlow(environmentalData);
}

const prompt = ai.definePrompt({
  name: 'healthAdvisoryPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: z.any()},
  output: {schema: HealthAdvisoryOutputSchema},
  prompt: `You are a public health expert providing advice based on environmental data from NASA satellites for the location: {{{environmentalData.location.name}}}.
  
  Analyze the following data and generate a concise health advisory. Focus on respiratory health, heat exposure, and risks from fires. Provide actionable recommendations for the general public and for sensitive groups.

  - Air Quality: Aerosol Index is {{{environmentalData.airQuality.aerosolIndex}}} and CO is {{{environmentalData.airQuality.co}}}.
  - Temperature & Weather: Current surface temperature is {{{environmentalData.weather.currentTemp}}}°C.
  - Fire Data: {{{environmentalData.fire.activeFires}}} active fires and risk level is '{{{environmentalData.fire.fireRisk}}}'.

  Health Advisory:`,
});

const healthAdvisoryFlow = ai.defineFlow(
  {
    name: 'healthAdvisoryFlow',
    inputSchema: z.any(),
    outputSchema: HealthAdvisoryOutputSchema,
  },
  async (environmentalData) => {
    const {output} = await prompt({environmentalData});
    return output!;
  }
);
