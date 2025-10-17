"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChartRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const logUuid = params.logUuid as string;

  useEffect(() => {
    // Redirect old URL format to new simplified format
    if (logUuid) {
      // Preserve URL parameters when redirecting
      const currentUrl = new URL(window.location.href);
      const searchParams = currentUrl.searchParams.toString();

      const newUrl = `/charts/${logUuid}${searchParams ? `?${searchParams}` : ''}`;
      router.replace(newUrl);
    }
  }, [logUuid, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <div>
          <p className="text-lg font-medium text-muted-foreground">
            Redirecting...
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Taking you to the chart...
          </p>
        </div>
      </div>
    </div>
  );
}