"use client";

import { ChartVisualizer } from "@/components/chart-visualizer";
import { Card } from "@/components/ui/card";
import {
  getJsonPublic,
  type Log,
} from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChartPage() {
  const params = useParams();
  const router = useRouter();

  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logUuid = params.logUuid as string;

  // Parse URL parameters for chart state
  const [urlParams, setUrlParams] = useState<URLSearchParams>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });

  useEffect(() => {
    if (!logUuid) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use public endpoint for chart sharing (no authentication required)
        const publicLogData = await getJsonPublic<Log>(`/logs/${logUuid}/`);
        setLog(publicLogData);
        console.log("Successfully loaded log from public endpoint");
      } catch (err) {
        console.error("Failed to load chart data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load chart data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [logUuid]);

  const handleClose = () => {
    // Navigate back to the previous page
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <div>
            <p className="text-lg font-medium text-muted-foreground">
              Loading Chart Visualization
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Preparing your data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold text-destructive">
              Chart Error
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push("/projects")}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ChartVisualizer
      log={log}
      open={true}
      onClose={handleClose}
      projectUuid=""
      urlParams={urlParams}
    />
  );
}
