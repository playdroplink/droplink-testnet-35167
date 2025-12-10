/**
 * Dev Mode Toggle Component
 * 
 * Allows quick enable/disable of dev mode for testing
 * Only shows in dev environment
 */

import { Button } from "@/components/ui/button";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { getDevModeStatus, enableDevMode, disableDevMode } from "@/lib/dev-auth";
import { useState, useEffect } from "react";

export function DevModeToggle() {
  const [status, setStatus] = useState(getDevModeStatus());

  useEffect(() => {
    setStatus(getDevModeStatus());
  }, []);

  if (!status.envEnabled && !status.localStorageEnabled) {
    return null; // Don't show if dev mode is not available
  }

  const handleToggle = () => {
    if (status.enabled) {
      disableDevMode();
    } else {
      enableDevMode();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleToggle}
        size="sm"
        variant={status.enabled ? "default" : "outline"}
        className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white border-0"
        title="Toggle Dev Mode (Auth Bypass)"
      >
        {status.enabled ? (
          <>
            <ToggleRight className="h-4 w-4" />
            Dev Mode ON
          </>
        ) : (
          <>
            <ToggleLeft className="h-4 w-4" />
            Dev Mode OFF
          </>
        )}
      </Button>
    </div>
  );
}
