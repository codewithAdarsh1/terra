'use server';
/**
 * @fileOverview An AI agent that provides crop recommendations based on environmental data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';

const CropRecommendationsOutputSchema = z.object({
  cropRecommendations: z.string().describe('The AI-driven crop recommendations for the selected location.'),
});
export type CropRecommendationsOutput = z.infer<typeof CropRecommendationsOutputSchema>;

export async function getCropRecommendations(environmentalData: EnvironmentalData): Promise<CropRecommendationsOutput> {
  return cropRecommendationsFlow(environmentalData);
}

const prompt = ai.definePrompt({
  name: 'cropRecommendationsPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: { schema: z.any() },
  output: {schema: CropRecommendationsOutputSchema},
  prompt: `You are an expert agricultural advisor. Based on the provided environmental data for a specific location, you will provide crop recommendations.

Location: {{{environmentalData.location.name}}} (Lat: {{{environmentalData.location.lat}}}, Lon: {{{environmentalData.location.lng}}})

Key Data Points:
- Soil Moisture: {{{environmentalData.soil.moisture}}}
- Soil Temperature: {{{environmentalData.soil.temperature}}}°C
- Soil pH: {{{environmentalData.soil.ph}}}
- Soil Nutrients (N-P-K): {{{environmentalData.soil.nitrogen}}}-{{{environmentalData.soil.phosphorus}}}-{{{environmentalData.soil.potassium}}} mg/kg
- Current Surface Temperature: {{{environmentalData.weather.currentTemp}}}°C
- Vegetation Index (NDVI): {{{environmentalData.vegetation.ndvi}}}
- Recent Precipitation: {{{environmentalData.water.precipitation}}} mm

Provide a detailed explanation of why you are recommending these crops, including specific benefits and considerations based on the provided data. Format as a numbered list.
`,
});

const cropRecommendationsFlow = ai.defineFlow(
  {
    name: 'cropRecommendationsFlow',
    inputSchema: z.any(),
    outputSchema: CropRecommendationsOutputSchema,
  },
  async (environmentalData) => {
    const {output} = await prompt({environmentalData});
    return output!;
  }
);
