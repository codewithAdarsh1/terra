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

const prompt = ai.definePrompt({
  name: 'healthAdvisoryPrompt',
  model: 'googleai/gemini-pro',
  input: {schema: z.any()},
  output: {schema: HealthAdvisoryOutputSchema},
  prompt: `You are a public health expert providing advice based on environmental data from NASA satellites for the location: {{location.name}}.
  
  Analyze the following data and generate a concise health advisory. Focus on respiratory health, heat exposure, and risks from fires. Provide actionable recommendations for the general public and for sensitive groups.

  - Air Quality: Aerosol Index is {{airQuality.aerosolIndex}} and CO is {{airQuality.co}}.
  - Temperature & Weather: Current surface temperature is {{weather.currentTemp}}°C.
  - Fire Data: {{fire.activeFires}} active fires and risk level is '{{fire.fireRisk}}'.

  Health Advisory:`,
});

export async function healthAdvisory(environmentalData: EnvironmentalData): Promise<HealthAdvisoryOutput> {
    const {output} = await prompt(environmentalData);
    if (!output) {
      throw new Error("Failed to get health advisory from AI");
    }
    return output;
}
