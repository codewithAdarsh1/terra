'use server';

/**
 * @fileOverview This file contains the AI-powered risk assessment flow.
 *
 * - aiRiskAssessment - A function that provides an AI-powered risk assessment based on environmental data.
 * - AIRiskAssessmentInput - The input type for the aiRiskAssessment function.
 * - AIRiskAssessmentOutput - The return type for the aiRiskassessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIRiskAssessmentInputSchema = z.object({
  airQuality: z.string().describe('Air quality data for the location.'),
  fireData: z.string().describe('Fire data, including active fires and risk level.'),
  waterResources: z.string().describe('Water resources data, including precipitation.'),
  weatherPatterns: z.string().describe('Current weather patterns.'),
});
export type AIRiskAssessmentInput = z.infer<typeof AIRiskAssessmentInputSchema>;

const AIRiskAssessmentOutputSchema = z.object({
  riskAssessment: z.string().describe('A comprehensive risk assessment covering drought, fire, and other environmental factors.'),
});
export type AIRiskAssessmentOutput = z.infer<typeof AIRiskAssessmentOutputSchema>;

export async function aiRiskAssessment(input: AIRiskAssessmentInput): Promise<AIRiskAssessmentOutput> {
  return aiRiskAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiRiskAssessmentPrompt',
  input: {schema: AIRiskAssessmentInputSchema},
  output: {schema: AIRiskAssessmentOutputSchema},
  prompt: `You are an AI assistant that specializes in environmental risk assessment.
  
  Analyze the following data and provide a concise risk assessment. Focus on drought risk, fire risk, and potential air quality issues.

  Air Quality: {{{airQuality}}}
  Fire Data: {{{fireData}}}
  Water Resources: {{{waterResources}}}
  Weather Patterns: {{{weatherPatterns}}}

  Risk Assessment:`,
});

const aiRiskAssessmentFlow = ai.defineFlow(
  {
    name: 'aiRiskAssessmentFlow',
    inputSchema: AIRiskAssessmentInputSchema,
    outputSchema: AIRiskAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
