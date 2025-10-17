"use client";

import { ChartVisualizer } from "@/components/chart-visualizer";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getJson, type Log, type Project, type PaginatedResponse } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChartPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logUuid = params.logUuid as string;

  // Parse URL parameters for chart state
  const [urlParams, setUrlParams] = useState<URLSearchParams>(() => {
    if (typeof window !== 'undefined') {
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

        // Validate user is authenticated
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Get all projects the user has access to (fetch all pages)
        let allProjects: Project[] = [];
        let offset = 0;
        const limit = 100; // Fetch more projects per request to reduce API calls

        while (true) {
          const projectsResponse = await getJson<PaginatedResponse<Project>>(`/projects/?limit=${limit}&offset=${offset}`);
          const projectsData = projectsResponse.results || [];
          allProjects = [...allProjects, ...projectsData];

          // If we got fewer projects than the limit, we've reached the end
          if (projectsData.length < limit) {
            break;
          }

          offset += limit;

          // Safety check to prevent infinite loops
          if (offset > 1000) {
            break;
          }
        }

        let foundLog: Log | null = null;
        let foundProject: Project | null = null;

        // Search for the log across all accessible projects
        for (const projectData of allProjects) {
          // Check if user has access to this project
          let hasAccess = false;

          if (user.profile_type === "dealer") {
            hasAccess = typeof projectData.dealer === 'string'
              ? projectData.dealer === user.user?.username
              : projectData.dealer?.uuid === user.profile?.uuid;
          } else if (user.profile_type === "customer") {
            hasAccess = typeof projectData.customer === 'string'
              ? projectData.customer === user.user?.username
              : projectData.customer?.uuid === user.profile?.uuid;
          }

          if (!hasAccess) {
            continue; // Skip projects user doesn't have access to
          }

          // Fetch detailed project data with ECUs and files
          const detailedProject = await getJson<Project>(`/projects/${projectData.uuid}/`);

          // Search for the log in this project
          for (const ecu of detailedProject.ecus || []) {
            for (const file of ecu.files || []) {
              for (const logItem of file.logs || []) {
                if (logItem.uuid === logUuid) {
                  foundLog = logItem;
                  foundProject = detailedProject;
                  break;
                }
              }
              if (foundLog) break;
            }
            if (foundLog) break;
          }

          if (foundLog) break;

          // If not found in nested data, try individual file API calls
          if (!foundLog) {
            const allFiles = detailedProject.ecus?.flatMap(ecu => ecu.files || []) || [];

            for (const file of allFiles) {
              try {
                const fileData = await getJson<{ logs: Log[] }>(`/files/${file.uuid}/logs/`);
                const logInFile = fileData.logs.find(logItem => logItem.uuid === logUuid);
                if (logInFile) {
                  foundLog = logInFile;
                  foundProject = detailedProject;
                  break;
                }
              } catch (err) {
                // Continue searching other files
                continue;
              }
            }
          }

          if (foundLog) break;
        }

        if (!foundLog) {
          throw new Error("Log not found or you don't have access to it");
        }

        if (!foundProject) {
          throw new Error("Project not found");
        }

        setProject(foundProject);
        setLog(foundLog);

      } catch (err) {
        console.error("Failed to load chart data:", err);
        setError(err instanceof Error ? err.message : "Failed to load chart data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [logUuid, user]);

  const handleClose = () => {
    // Navigate back to the specific project page if we have project context
    if (project?.uuid) {
      router.push(`/projects/${project.uuid}`);
    } else {
      // Fallback to general projects page
      router.push("/projects");
    }
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
            <h2 className="text-lg font-semibold text-destructive">Chart Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                if (project?.uuid) {
                  router.push(`/projects/${project.uuid}`);
                } else {
                  router.push("/projects");
                }
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              {project?.uuid ? "Back to Project" : "Back to Projects"}
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
      projectUuid={project?.uuid || ""}
      urlParams={urlParams}
    />
  );
}