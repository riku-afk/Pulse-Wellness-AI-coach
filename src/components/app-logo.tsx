import { HeartPulse } from "lucide-react";

export function AppLogo() {
  return (
    <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-5 w-5" />
      </div>
      <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
        PulseWell
      </span>
    </div>
  );
}
