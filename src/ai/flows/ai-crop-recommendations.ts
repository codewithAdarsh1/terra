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

const prompt = ai.definePrompt({
  name: 'cropRecommendationsPrompt',
  model: 'googleai/gemini-pro',
  input: { schema: z.any() },
  output: {schema: CropRecommendationsOutputSchema},
  prompt: `You are an expert agricultural advisor. Based on the provided environmental data for a specific location, you will provide crop recommendations.

Location: {{location.name}} (Lat: {{location.lat}}, Lon: {{location.lng}})

Key Data Points:
- Soil Moisture: {{soil.moisture}}
- Soil Temperature: {{soil.temperature}}°C
- Soil pH: {{soil.ph}}
- Soil Nutrients (N-P-K): {{soil.nitrogen}}-{{soil.phosphorus}}-{{soil.potassium}} mg/kg
- Current Surface Temperature: {{weather.currentTemp}}°C
- Vegetation Index (NDVI): {{vegetation.ndvi}}
- Recent Precipitation: {{water.precipitation}} mm

Provide a detailed explanation of why you are recommending these crops, including specific benefits and considerations based on the provided data. Format as a numbered list.
`,
});


export async function getCropRecommendations(environmentalData: EnvironmentalData): Promise<CropRecommendationsOutput> {
    const {output} = await prompt(environmentalData);
    return output!;
}
