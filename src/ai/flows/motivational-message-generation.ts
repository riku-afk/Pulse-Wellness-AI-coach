'use server';

/**
 * @fileOverview Generates empathetic and motivational messages based on user check-in data.
 *
 * - motivationalMessageGeneration - A function that generates the motivational message.
 * - MotivationalMessageInput - The input type for the motivationalMessageGeneration function.
 * - MotivationalMessageOutput - The return type for the motivationalMessageGeneration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MotivationalMessageInputSchema = z.object({
  mood: z.string().describe('The user’s current mood (e.g., happy, sad, tired).'),
  energy: z.number().describe('The user’s energy level on a scale of 1 to 5.'),
  sleep: z.number().describe('The number of hours the user slept last night.'),
  notes: z.string().describe('Any additional notes from the user about their day.'),
});
export type MotivationalMessageInput = z.infer<typeof MotivationalMessageInputSchema>;

const MotivationalMessageOutputSchema = z.object({
  motivation: z.string().describe('A short, empathetic, and motivational message for the user.'),
});
export type MotivationalMessageOutput = z.infer<typeof MotivationalMessageOutputSchema>;

export async function motivationalMessageGeneration(input: MotivationalMessageInput): Promise<MotivationalMessageOutput> {
  return motivationalMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'motivationalMessagePrompt',
  input: {schema: MotivationalMessageInputSchema},
  output: {schema: MotivationalMessageOutputSchema},
  prompt: `You are Pulse, a friendly and emotionally intelligent AI wellness coach.

Based on the following check-in data, provide a short motivational or empathetic message (1-2 sentences) to encourage the user. Use warm, conversational language and focus on tiny, realistic improvements. Always keep the reply under 30 words.

Mood: {{{mood}}}
Energy Level: {{{energy}}}
Sleep: {{{sleep}}}
Notes: {{{notes}}}

Motivational Message: `,
});

const motivationalMessageFlow = ai.defineFlow(
  {
    name: 'motivationalMessageFlow',
    inputSchema: MotivationalMessageInputSchema,
    outputSchema: MotivationalMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
