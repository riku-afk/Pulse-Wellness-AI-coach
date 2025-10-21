"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Mood } from "@/lib/types";
import { Frown, Meh, Smile } from "lucide-react";
import type { ControllerRenderProps } from "react-hook-form";

const moodOptions: { value: Mood; label: string; icon: React.ReactNode }[] = [
  { value: "Happy", label: "Happy", icon: <Smile className="h-8 w-8" /> },
  { value: "Neutral", label: "Neutral", icon: <Meh className="h-8 w-8" /> },
  { value: "Sad", label: "Sad", icon: <Frown className="h-8 w-8" /> },
];

export function MoodSelector({ field }: { field: ControllerRenderProps<any, "mood"> }) {
  return (
    <RadioGroup
      onValueChange={field.onChange}
      defaultValue={field.value}
      className="grid grid-cols-3 gap-4"
    >
      {moodOptions.map((option) => (
        <Label
          key={option.value}
          htmlFor={option.value}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
            field.value === option.value && "border-primary bg-secondary"
          )}
        >
          <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
          {option.icon}
          <span className="font-medium">{option.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}
