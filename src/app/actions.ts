// @/app/actions.ts
'use server';

import { dailyWellnessRecommendations, DailyWellnessInput, DailyWellnessOutput } from '@/ai/flows/daily-wellness-recommendations';
import { z } from 'zod';

const formSchema = z.object({
  mood: z.enum(['Happy', 'Neutral', 'Sad']),
  energy: z.coerce.number().min(1).max(5),
  sleep: z.coerce.number().min(0).max(12),
  notes: z.string().max(500).optional(),
});

export type WellnessRecommendationResponse = {
    success?: DailyWellnessOutput;
    error?: string;
}

export async function getWellnessRecommendation(
  data: unknown
): Promise<WellnessRecommendationResponse> {
  const parsedData = formSchema.safeParse(data);

  if (!parsedData.success) {
    console.error("Validation failed:", parsedData.error);
    return { error: 'Invalid data provided.' };
  }

  const input: DailyWellnessInput = {
    mood: parsedData.data.mood,
    energy: parsedData.data.energy,
    sleep: parsedData.data.sleep,
    notes: parsedData.data.notes || '',
  };

  try {
    const result = await dailyWellnessRecommendations(input);
    return { success: result };
  } catch (e) {
    console.error("AI flow error:", e);
    return { error: 'Failed to get your personalized recommendation. Please try again later.' };
  }
}
