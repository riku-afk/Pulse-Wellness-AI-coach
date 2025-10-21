"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getWellnessRecommendation,
  type WellnessRecommendationResponse,
} from "@/app/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { DailyWellnessOutput } from "@/ai/flows/daily-wellness-recommendations";
import { MoodSelector } from "./mood-selector";
import { WellnessRecommendation } from "./wellness-recommendation";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  mood: z.enum(["Happy", "Neutral", "Sad"], {
    required_error: "Please select your mood.",
  }),
  energy: z.array(z.number()).default([3]),
  sleep: z.array(z.number()).default([7]),
  notes: z.string().max(300, "Notes can't exceed 300 characters.").optional(),
});

type FormData = z.infer<typeof formSchema>;

export function DailyCheckInCard() {
  const [result, setResult] = useState<DailyWellnessOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mood: undefined,
      energy: [3],
      sleep: [7],
      notes: "",
    },
  });

  const energyValue = form.watch("energy")[0];
  const sleepValue = form.watch("sleep")[0];

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    const submissionData = {
      ...data,
      energy: data.energy[0],
      sleep: data.sleep[0],
    };

    const response: WellnessRecommendationResponse = await getWellnessRecommendation(submissionData);

    if (response.error) {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: response.error,
      });
    } else if (response.success) {
      setResult(response.success);
    }
    setIsLoading(false);
  }

  if (result) {
    return (
      <Card className="min-h-[550px] flex flex-col">
        <WellnessRecommendation data={result} onReset={() => {
          setResult(null);
          form.reset();
        }} />
      </Card>
    );
  }

  return (
    <Card className="min-h-[550px]">
      <CardHeader>
        <CardTitle>Daily Check-in</CardTitle>
        <CardDescription>Tell us how you're feeling today.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">How's your mood?</FormLabel>
                  <FormControl>
                    <MoodSelector field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energy"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-base font-semibold">Energy Level</FormLabel>
                    <span className="text-sm font-bold text-primary w-8 text-center">{energyValue}/5</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sleep"
              render={({ field }) => (
                <FormItem>
                   <div className="flex justify-between items-center">
                      <FormLabel className="text-base font-semibold">Hours Slept</FormLabel>
                      <span className="text-sm font-bold text-primary w-8 text-center">{sleepValue}h</span>
                    </div>
                  <FormControl>
                    <Slider
                      min={0}
                      max={12}
                      step={0.5}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Any thoughts to share? (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Feeling drained after work..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting your Pulse...
                </>
              ) : (
                "Get My Recommendation"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
