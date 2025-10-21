import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Your Profile"
        description="Manage your personal information and wellness goals."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Your profile and settings will be managed from this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This section is under construction. You'll soon be able to update your profile here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
