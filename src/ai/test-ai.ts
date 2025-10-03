'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const testPrompt = ai.definePrompt({
  name: 'testPrompt',
  model: 'groq/llama3-70b-8192',
  input: { schema: z.object({ text: z.string() }) },
  output: { schema: z.object({ response: z.string() }) },
  prompt: 'Say hello to {{text}}',
});

export async function runTest() {
  try {
    const result = await testPrompt({ text: 'world' });
    console.log('✅ AI is working:', result);
    return result;
  } catch (error) {
    console.error('❌ AI failed:', error);
    throw error;
  }
}

runTest();
