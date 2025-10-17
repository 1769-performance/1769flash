"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChartVisualizer } from "@/components/chart-visualizer";
import { EcuPanel } from "@/components/ecu-panel";
import { EnhancedProjectHeader } from "@/components/enhanced-project-header";
import { ProjectMessages } from "@/components/project-messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { getJson, type ECU, type Log, type Project } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [ecus, setEcus] = useState<ECU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEcuSerial, setSelectedEcuSerial] = useState<string | null>(
    null
  );
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

  // Chart visualization state
  const [chartLog, setChartLog] = useState<Log | null>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  const isDealer = user?.profile_type === "dealer";
  const projectUuid =
    typeof params.uuid === "string"
      ? params.uuid
      : Array.isArray(params.uuid)
      ? params.uuid[0]
      : undefined;

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectUuid) return;

      try {
        setLoading(true);
        // Fetch project with nested ECUs, files, and logs in a single optimized request
        const projectData = await getJson<Project>(`/projects/${projectUuid}/`);
        setProject(projectData);

        // ECUs are now included in the project response with nested files and logs
        if (projectData.ecus) {
          setEcus(projectData.ecus);
        } else {
          setEcus([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectUuid]);

  // Listen for service worker messages (notification click reload)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.log("[Project Page] Service worker not supported");
      return;
    }

    console.log("[Project Page] Setting up service worker message listener");

    const handleMessage = (event: MessageEvent) => {
      console.log("[Project Page] ========== Received message from SW ==========");
      console.log("[Project Page] Message type:", event.data?.type);
      console.log("[Project Page] Full message data:", JSON.stringify(event.data, null, 2));

      // Handle file list refresh request from notification click
      if (event.data?.type === "RELOAD_PAGE") {
        console.log("[Project Page] 🔄 RELOAD_PAGE message received, refreshing file list...");
        // Trigger file list refresh (same as Solution 1)
        setFileRefreshTrigger((prev) => prev + 1);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    console.log("[Project Page] ✅ Message listener registered");

    return () => {
      console.log("[Project Page] 🧹 Cleaning up message listener");
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleEcuClick = (serial: string) => {
    setSelectedEcuSerial(selectedEcuSerial === serial ? null : serial);
  };

  const handleFileUploadSuccess = async () => {
    // Reload project data to show the new file
    if (projectUuid) {
      try {
        const projectData = await getJson<Project>(`/projects/${projectUuid}/`);
        setProject(projectData);
        if (projectData.ecus) {
          setEcus(projectData.ecus);
        }
      } catch (err) {
        console.error("Error reloading project data:", err);
      }
    }
  };

  const handleLogVisualize = (log: Log) => {
    // Show chart modal directly on the current page
    setChartLog(log);
    setChartModalOpen(true);
  };

  const handleChartClose = () => {
    setChartModalOpen(false);
    setChartLog(null);
  };

  // Handle when messages are marked as read to refresh the projects list
  const handleMessagesRead = () => {
    // Refresh the router to update any cached data
    router.refresh();
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error: {error || "Project not found"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>

      {/* Main Layout */}
      <div className="space-y-6">
        {/* Enhanced Project Header */}
        <EnhancedProjectHeader project={project} />

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <EcuPanel
              ecus={ecus}
              selectedEcuSerial={selectedEcuSerial}
              onEcuClick={handleEcuClick}
              isDealer={isDealer}
              projectUuid={project.uuid}
              onLogVisualize={handleLogVisualize}
              onFileUploaded={handleFileUploadSuccess}
              externalRefreshTrigger={fileRefreshTrigger}
            />
          </div>

          <div className="lg:col-span-2">
            <ProjectMessages
              projectId={project.uuid}
              projectTitle={project.title}
              onMessagesRead={handleMessagesRead}
            />
          </div>
        </div>
      </div>

      {/* Chart Visualizer Modal */}
      <ChartVisualizer
        log={chartLog}
        open={chartModalOpen}
        onClose={handleChartClose}
        projectUuid={project.uuid}
      />
    </div>
  );
}
