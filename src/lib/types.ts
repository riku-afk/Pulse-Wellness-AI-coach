export type Mood = 'Happy' | 'Neutral' | 'Sad';

export interface CheckIn {
  id: string;
  date: string;
  mood: Mood;
  energy: number;
  sleep: number;
  notes?: string;
}
