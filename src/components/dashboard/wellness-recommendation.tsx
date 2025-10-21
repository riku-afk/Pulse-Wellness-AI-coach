"use client";

import type { DailyWellnessOutput } from "@/ai/flows/daily-wellness-recommendations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Lightbulb, Sparkles } from "lucide-react";

interface WellnessRecommendationProps {
  data: DailyWellnessOutput;
  onReset: () => void;
}

export function WellnessRecommendation({ data, onReset }: WellnessRecommendationProps) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle>Your Daily Pulse</CardTitle>
        <CardDescription>
          Here are some personalized suggestions based on your check-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Lightbulb className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Recommendation</h3>
            <p className="text-muted-foreground">{data.recommendation}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Sparkles className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Motivation</h3>
            <p className="text-muted-foreground">{data.motivation}</p>
          </div>
        </div>
        {data.activity && (
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <BookOpen className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Activity Suggestion</h3>
              <p className="text-muted-foreground">{data.activity}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onReset} className="w-full">
          Complete another check-in
        </Button>
      </CardFooter>
    </div>
  );
}
