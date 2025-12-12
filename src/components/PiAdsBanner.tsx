import React, { useEffect } from "react";

// Pi AdNetwork Banner Integration (see: https://github.com/pi-apps/pi-platform-docs/blob/master/ads.md)
const PiAdsBanner: React.FC = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi && window.Pi.Ads) {
      try {
        // Use the Pi Ads API if available
        window.Pi.Ads.showBannerAd?.({
          position: "bottom"
        });
      } catch (err) {
        console.log('Pi Ads not available:', err);
      }
    }
  }, []);

  return (
    <div id="pi-ad-banner" style={{ width: "100%", minHeight: 60, textAlign: "center" }}>
      {/* Pi AdNetwork banner will be injected here by the Pi SDK */}
    </div>
  );
};

export default PiAdsBanner;
