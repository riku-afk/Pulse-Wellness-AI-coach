import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Your History"
        description="Review your past check-ins and progress over time."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            A detailed log of your wellness journey will be available here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This section is under construction. Check back later to see your full history!</p>
        </CardContent>
      </Card>
    </div>
  );
}
