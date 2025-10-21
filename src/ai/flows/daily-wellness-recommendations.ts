'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating daily wellness recommendations based on user input.
 *
 * It includes:
 * - `dailyWellnessRecommendations`: A function to generate personalized wellness recommendations.
 * - `DailyWellnessInput`: The input type for the `dailyWellnessRecommendations` function.
 * - `DailyWellnessOutput`: The output type for the `dailyWellnessRecommendations` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyWellnessInputSchema = z.object({
  mood: z.string().describe('The user\'s mood for the day (e.g., happy, sad, tired).'),
  energy: z.number().describe('The user\'s energy level on a scale of 1 to 5.'),
  sleep: z.number().describe('The number of hours the user slept last night.'),
  notes: z.string().describe('Any additional notes from the user about their day.'),
});

export type DailyWellnessInput = z.infer<typeof DailyWellnessInputSchema>;

const DailyWellnessOutputSchema = z.object({
  recommendation: z.string().describe('A short, personalized wellness recommendation (1-2 sentences).'),
  motivation: z.string().describe('A motivational or empathetic message (1-2 sentences).'),
  activity: z.string().optional().describe('A suggested short activity (e.g., breathing, stretching, journaling).'),
});

export type DailyWellnessOutput = z.infer<typeof DailyWellnessOutputSchema>;

export async function dailyWellnessRecommendations(input: DailyWellnessInput): Promise<DailyWellnessOutput> {
  return dailyWellnessRecommendationsFlow(input);
}

const dailyWellnessPrompt = ai.definePrompt({
  name: 'dailyWellnessPrompt',
  input: {schema: DailyWellnessInputSchema},
  output: {schema: DailyWellnessOutputSchema},
  prompt: `You are Pulse, a friendly and emotionally intelligent AI wellness coach designed to help users improve their daily physical and mental well-being.
Your tone is gentle, supportive, and encouraging — never judgmental.

You receive daily check-in data about a user’s mood, sleep, and energy levels. Based on this data, you will provide:

A short personalized wellness recommendation (1–2 sentences)

A motivational or empathetic message (1–2 sentences)

(Optional) A suggested short activity (e.g., breathing, stretching, journaling).

Focus on tiny, realistic improvements instead of big lifestyle changes.
Use warm, conversational language — talk like a real coach who genuinely cares.

If the user’s data shows low mood, energy, or sleep, respond with compassion and a small, actionable suggestion.
If the user’s data is good, respond with positive reinforcement and encourage consistency.

Always keep the total reply under 120 words.

User Input:
{
  "mood": "{{mood}}",
  "energy": {{energy}},
  "sleep": {{sleep}},
  "notes": "{{notes}}"
}`,
});

const dailyWellnessRecommendationsFlow = ai.defineFlow(
  {
    name: 'dailyWellnessRecommendationsFlow',
    inputSchema: DailyWellnessInputSchema,
    outputSchema: DailyWellnessOutputSchema,
  },
  async input => {
    const {output} = await dailyWellnessPrompt(input);
    return output!;
  }
);
