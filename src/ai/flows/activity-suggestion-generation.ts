'use server';

/**
 * @fileOverview A flow that generates personalized activity suggestions based on user check-in data.
 *
 * This file exports:
 * - `getActivitySuggestion`: A function to generate an activity suggestion.
 * - `ActivitySuggestionInput`: The input type for `getActivitySuggestion`.
 * - `ActivitySuggestionOutput`: The output type for `getActivitySuggestion`.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActivitySuggestionInputSchema = z.object({
  mood: z.string().describe('The user\'s current mood (e.g., happy, sad, tired).'),
  energy: z.number().describe('The user\'s current energy level (1-5, 1 being very low, 5 being very high).'),
  sleep: z.number().describe('The number of hours the user slept last night.'),
  notes: z.string().describe('Any additional notes from the user about their day.'),
});
export type ActivitySuggestionInput = z.infer<typeof ActivitySuggestionInputSchema>;

const ActivitySuggestionOutputSchema = z.object({
  activity: z.string().describe('A suggested brief activity (e.g., breathing, stretching, journaling) that aligns with the user\'s needs and data.'),
});
export type ActivitySuggestionOutput = z.infer<typeof ActivitySuggestionOutputSchema>;

export async function getActivitySuggestion(input: ActivitySuggestionInput): Promise<ActivitySuggestionOutput> {
  return activitySuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'activitySuggestionPrompt',
  input: {schema: ActivitySuggestionInputSchema},
  output: {schema: ActivitySuggestionOutputSchema},
  prompt: `You are Pulse, a friendly and emotionally intelligent AI wellness coach.

  Based on the following user data, suggest a brief activity (e.g., breathing exercise, stretching, journaling) that aligns with the user's needs. Focus on activities that can provide immediate well-being.

  Mood: {{{mood}}}
  Energy Level: {{{energy}}}
  Sleep: {{{sleep}}}
  Notes: {{{notes}}}

  Activity Suggestion:`,
});

const activitySuggestionFlow = ai.defineFlow(
  {
    name: 'activitySuggestionFlow',
    inputSchema: ActivitySuggestionInputSchema,
    outputSchema: ActivitySuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
