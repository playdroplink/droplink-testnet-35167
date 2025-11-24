import React from "react";
import droplinkLogo from "@/assets/droplink-logo.png";

export const DroplinkSpinner: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    style={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    }}
    aria-label="Loading"
  >
    <img
      src={droplinkLogo}
      alt="Droplink Logo"
      style={{
        width: size * 0.8,
        height: size * 0.8,
        animation: "droplink-spin 1s linear infinite",
        filter: "drop-shadow(0 0 8px #b3e5fc)",
      }}
    />
    <style>{`
      @keyframes droplink-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
