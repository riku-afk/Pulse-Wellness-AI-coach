import { DailyCheckInCard } from "@/components/dashboard/daily-check-in-card";
import { DataCharts } from "@/components/dashboard/data-charts";
import { PageHeader } from "@/components/dashboard/page-header";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Good Morning!"
        description="Ready for your daily check-in? Let's see how you're doing."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyCheckInCard />
        </div>
        <aside className="lg:col-span-1">
          <DataCharts />
        </aside>
      </div>
    </main>
  );
}
