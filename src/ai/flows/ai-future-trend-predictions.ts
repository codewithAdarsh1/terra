'use server';

/**
 * @fileOverview AI-powered future trend predictions for environmental data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EnvironmentalData } from '@/lib/types';

const FutureTrendPredictionsOutputSchema = z.object({
  predictions: z.string().describe('Future environmental trend predictions for the specified location.'),
});
export type FutureTrendPredictionsOutput = z.infer<typeof FutureTrendPredictionsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'futureTrendPredictionsPrompt',
  model: 'googleai/gemini-pro',
  input: {schema: z.any()},
  output: {schema: FutureTrendPredictionsOutputSchema},
  prompt: `You are an AI assistant specialized in predicting future environmental trends based on current and historical data.

  Analyze the following data for the given location and provide predictions for future environmental trends over the next 1-3 months. Consider seasonality and the provided metrics.

  Location: {{location.name}}

  Current Data Snapshot:
  - Air Quality (Aerosol Index): {{airQuality.aerosolIndex}}
  - Surface Temperature: {{weather.currentTemp}}°C
  - Vegetation Index (NDVI): {{vegetation.ndvi}}
  - Soil Moisture: {{soil.moisture}}
  - Fire Risk: {{fire.fireRisk}}
  - 5-Day Forecast: {{weather.forecast.[0].condition}}, {{weather.forecast.[1].condition}}, {{weather.forecast.[2].condition}}

  Based on this snapshot, provide short-term predictions for:
  1. Temperature and precipitation trends.
  2. Vegetation health and potential changes.
  3. Air quality outlook.
  4. Potential shifts in fire or drought risk.
  `,
});

export async function futureTrendPredictions(environmentalData: EnvironmentalData): Promise<FutureTrendPredictionsOutput> {
    const {output} = await prompt(environmentalData);
    return output!;
}
