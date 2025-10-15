"use client";

import { ChartVisualizer } from "@/components/chart-visualizer";
import { EcuPanel } from "@/components/ecu-panel";
import { LicensesTable } from "@/components/licenses-table";
import { PaymentsTable } from "@/components/payments-table";
import { ProjectsTable } from "@/components/projects-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getJson, type Log, type Vehicle } from "@/lib/api";
import { ArrowLeft, Car, CreditCard, FileText, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VehicleDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEcuSerial, setSelectedEcuSerial] = useState<string | null>(
    null
  );

  // Chart visualization state
  const [chartLog, setChartLog] = useState<Log | null>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!params.vin) return;

      try {
        setLoading(true);
        const vehicleData = await getJson<Vehicle>(
          `/vehicles/${params.vin}/?expand=licenses,payments,projects`
        );
        setVehicle(vehicleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vehicle");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [params.vin]);

  const getPaidOptions = (vehicle: Vehicle): string[] => {
    const options: string[] = [];
    if (vehicle.egs_paid) options.push("EGS");
    if (vehicle.swap_paid) options.push("Swap");
    if (vehicle.egs_swap_paid) options.push("EGS Swap");
    return options;
  };

  const refetchVehicle = async () => {
    if (!params.vin) return;
    try {
      const vehicleData = await getJson<Vehicle>(
        `/vehicles/${params.vin}/?expand=licenses,payments,projects`
      );
      setVehicle(vehicleData);
    } catch (err) {
      console.error("Failed to refetch vehicle data:", err);
    }
  };

  const handleLogVisualize = (log: Log) => {
    setChartLog(log);
    setChartModalOpen(true);
  };

  const handleChartClose = () => {
    setChartModalOpen(false);
    setChartLog(null);
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

  if (error || !vehicle) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error: {error || "Vehicle not found"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/vehicles">Back to Vehicles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-4 mb-4 md:mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vehicles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Vehicles</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Vehicle Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Car className="h-6 w-6 shrink-0" />
                  <span className="break-all">Vehicle</span>
                </CardTitle>
                <CardDescription>
                  Vehicle details and management
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-sm font-medium">VIN</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {vehicle.vin}
                </p>
              </div>

              {/* Show dealer column only for customers */}
              {user?.profile_type === "customer" && vehicle.dealer && (
                <div>
                  <p className="text-sm font-medium">Dealer</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.dealer}
                  </p>
                </div>
              )}

              {/* Show customer column only for dealers */}
              {user?.profile_type === "dealer" && vehicle.customer && (
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.customer}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Paid Options</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getPaidOptions(vehicle).map((option) => (
                    <Badge key={option} variant="outline" className="text-xs">
                      {option}
                    </Badge>
                  ))}
                  {getPaidOptions(vehicle).length === 0 && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              {vehicle.created && (
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(vehicle.created).toLocaleDateString()}
                  </p>
                </div>
              )}

              {vehicle.series && (
                <div>
                  <p className="text-sm font-medium">Series</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.series}
                  </p>
                </div>
              )}

              {vehicle.fa_codes && vehicle.fa_codes.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm font-medium">FA Codes</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vehicle.fa_codes.map((code, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ECUs Block */}
        {vehicle.ecus && vehicle.ecus.length > 0 && (
          <EcuPanel
            ecus={vehicle.ecus}
            selectedEcuSerial={selectedEcuSerial}
            onEcuClick={setSelectedEcuSerial}
            isDealer={user?.profile_type === "dealer"}
            onFileUploaded={refetchVehicle}
            onLogVisualize={handleLogVisualize}
          />
        )}

        {/* Projects Block */}
        {vehicle.projects && vehicle.projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Projects ({vehicle.projects.length})
              </CardTitle>
              <CardDescription>
                Projects associated with this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectsTable
                projects={vehicle.projects}
                showDealerColumn={user?.profile_type === "customer"}
                vehicleDealer={vehicle.dealer}
              />
            </CardContent>
          </Card>
        )}

        {/* Payments Block */}
        {vehicle.payments && vehicle.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Payments ({vehicle.payments.length})
              </CardTitle>
              <CardDescription>
                Payment history for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentsTable payments={vehicle.payments} />
            </CardContent>
          </Card>
        )}

        {/* Licenses Block */}
        {vehicle.licenses && vehicle.licenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Licenses ({vehicle.licenses.length})
              </CardTitle>
              <CardDescription>
                License information for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LicensesTable licenses={vehicle.licenses} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart Visualizer Modal */}
      <ChartVisualizer
        log={chartLog}
        open={chartModalOpen}
        onClose={handleChartClose}
      />
    </div>
  );
}
