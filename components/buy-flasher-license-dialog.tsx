"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { Vehicle } from "@/lib/api";

// Extend JSX to include stripe-buy-button custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-buy-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "buy-button-id": string;
        "publishable-key": string;
      };
    }
  }
}

interface BuyFlasherLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51RFuPcL4MMBy2HQ1UVtdtfhAoNhGXL4W6uvUj88rGKwO5LldFmRAcTPswLYJugmzjOuRcpGyo27i7M7BchOsuMaK00oenNOVRx";

// Stripe button configurations
const ENGINE_BUTTONS = {
  MDG1: {
    title: "Engine - MDG1",
    buttonId: "buy_btn_1SJaPvL4MMBy2HQ1tuawIG1W",
  },
  MEVDC17: {
    title: "Engine - MEVDC17",
    buttonId: "buy_btn_1RwU6tL4MMBy2HQ1vkyrCfCw",
  },
};

const TRANSMISSION_BUTTON = {
  title: "Transmission - MEVDC17",
  buttonId: "buy_btn_1Ro4rtL4MMBy2HQ1oVkdbNC8",
};

export function BuyFlasherLicenseDialog({
  open,
  onOpenChange,
  vehicle,
}: BuyFlasherLicenseDialogProps) {
  useEffect(() => {
    // Load Stripe buy button script if not already loaded
    if (open && !document.querySelector('script[src*="js.stripe.com"]')) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/buy-button.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        // Cleanup: remove script when dialog unmounts
        document.body.removeChild(script);
      };
    }
  }, [open]);

  if (!vehicle) return null;

  // Determine engine license type based on engine_code
  const engineButton = vehicle.engine_code?.startsWith("B")
    ? ENGINE_BUTTONS.MDG1
    : ENGINE_BUTTONS.MEVDC17;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buy Flasher License</DialogTitle>
          <DialogDescription>
            Purchase licenses for engine and transmission tuning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vehicle Information */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    VIN
                  </p>
                  <p className="text-sm font-mono">{vehicle.vin}</p>
                </div>
                {vehicle.model && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Model
                    </p>
                    <p className="text-sm">{vehicle.model}</p>
                  </div>
                )}
                {vehicle.transmission && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Transmission
                    </p>
                    <p className="text-sm">{vehicle.transmission}</p>
                  </div>
                )}
                {vehicle.engine_code && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Engine
                    </p>
                    <p className="text-sm font-mono">{vehicle.engine_code}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* License Purchase Options */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">
                Select License to Purchase:
              </h3>
            </div>

            {/* License Cards in One Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Engine License */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">{engineButton.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        License for engine tuning
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <stripe-buy-button
                        buy-button-id={engineButton.buttonId}
                        publishable-key={STRIPE_PUBLISHABLE_KEY}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transmission License */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">
                        {TRANSMISSION_BUTTON.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        License for transmission tuning
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <stripe-buy-button
                        buy-button-id={TRANSMISSION_BUTTON.buttonId}
                        publishable-key={STRIPE_PUBLISHABLE_KEY}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
