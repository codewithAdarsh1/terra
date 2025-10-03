'use server';

/**
 * @fileOverview AI-powered future trend predictions for environmental data.
 *
 * - futureTrendPredictions - A function that generates future environmental trend predictions.
 * - FutureTrendPredictionsInput - The input type for the futureTrendPredictions function.
 * - FutureTrendPredictionsOutput - The return type for the futureTrendPredictions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FutureTrendPredictionsInputSchema = z.object({
  location: z.string().describe('The location for which to predict future environmental trends.'),
  historicalData: z.string().describe('Historical environmental data for the specified location.'),
});
export type FutureTrendPredictionsInput = z.infer<typeof FutureTrendPredictionsInputSchema>;

const FutureTrendPredictionsOutputSchema = z.object({
  predictions: z.string().describe('Future environmental trend predictions for the specified location.'),
});
export type FutureTrendPredictionsOutput = z.infer<typeof FutureTrendPredictionsOutputSchema>;

export async function futureTrendPredictions(input: FutureTrendPredictionsInput): Promise<FutureTrendPredictionsOutput> {
  return futureTrendPredictionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'futureTrendPredictionsPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: FutureTrendPredictionsInputSchema},
  output: {schema: FutureTrendPredictionsOutputSchema},
  prompt: `You are an AI assistant specialized in predicting future environmental trends based on historical data.

  Analyze the historical data for the given location and provide predictions for future environmental trends.

  Location: {{{location}}}
  Historical Data: {{{historicalData}}}

  Predictions:
  `,
});

const futureTrendPredictionsFlow = ai.defineFlow(
  {
    name: 'futureTrendPredictionsFlow',
    inputSchema: FutureTrendPredictionsInputSchema,
    outputSchema: FutureTrendPredictionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
