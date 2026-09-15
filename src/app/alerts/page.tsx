import { AlertsTable } from "@/components/AlertsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRecentAlerts } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alerts — WF Stocks",
};

export default async function AlertsPage() {
  const alerts = await getRecentAlerts(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Spread/ROI and price-drop alerts, one per item per UTC day."
      />
      <AlertsTable rows={alerts} />
    </div>
  );
}
