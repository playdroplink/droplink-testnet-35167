import React, { useEffect } from "react";

// Pi AdNetwork Banner Integration (see: https://github.com/pi-apps/pi-platform-docs/blob/master/ads.md)
const PiAdsBanner: React.FC = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi && window.Pi.openAd) {
      // Show a banner ad at the bottom
      window.Pi.openAd({
        type: "banner",
        position: "bottom"
      });
    }
  }, []);

  return (
    <div id="pi-ad-banner" style={{ width: "100%", minHeight: 60, textAlign: "center" }}>
      {/* Pi AdNetwork banner will be injected here by the Pi SDK */}
    </div>
  );
};

export default PiAdsBanner;
