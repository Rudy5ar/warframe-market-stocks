import { AlertsTable } from "@/components/AlertsList";
import { getRecentAlerts } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alerts — WF Stocks",
};

export default async function AlertsPage() {
  const alerts = await getRecentAlerts(100);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-platinum">Alerts</h1>
        <p className="text-sm text-platinum-faint">
          Spread/ROI and price-drop alerts, deduped to one per item per UTC day.
        </p>
      </div>
      <AlertsTable rows={alerts} />
    </div>
  );
}
