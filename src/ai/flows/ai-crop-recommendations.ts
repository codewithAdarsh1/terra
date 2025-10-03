'use server';
/**
 * @fileOverview An AI agent that provides crop recommendations for a given location.
 *
 * - getCropRecommendations - A function that returns crop recommendations for a given location.
 * - CropRecommendationsInput - The input type for the getCropRecommendations function.
 * - CropRecommendationsOutput - The return type for the getCropRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CropRecommendationsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  soilData: z.string().describe('The soil data for the location.'),
  weatherPatterns: z.string().describe('The weather patterns for the location.'),
});
export type CropRecommendationsInput = z.infer<typeof CropRecommendationsInputSchema>;

const CropRecommendationsOutputSchema = z.object({
  cropRecommendations: z.string().describe('The AI-driven crop recommendations for the selected location.'),
});
export type CropRecommendationsOutput = z.infer<typeof CropRecommendationsOutputSchema>;

export async function getCropRecommendations(input: CropRecommendationsInput): Promise<CropRecommendationsOutput> {
  return cropRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cropRecommendationsPrompt',
  input: {schema: CropRecommendationsInputSchema},
  output: {schema: CropRecommendationsOutputSchema},
  prompt: `You are an expert agricultural advisor. Based on the provided soil data and weather patterns for a specific location, you will provide crop recommendations.

Location Latitude: {{{latitude}}}
Location Longitude: {{{longitude}}}
Soil Data: {{{soilData}}}
Weather Patterns: {{{weatherPatterns}}}

Provide a detailed explanation of why you are recommending these crops, including specific benefits and considerations based on the provided data. Format as a numbered list.
`,
});

const cropRecommendationsFlow = ai.defineFlow(
  {
    name: 'cropRecommendationsFlow',
    inputSchema: CropRecommendationsInputSchema,
    outputSchema: CropRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
