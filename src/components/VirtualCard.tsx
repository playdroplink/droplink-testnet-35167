import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

interface VirtualCardProps {
  username: string;
  storeUrl: string;
  frontColor?: string;
  backColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const VirtualCard = ({
  username,
  storeUrl,
  frontColor = "#2bbdee",
  backColor = "#2bbdee",
  textColor = "#000000",
  accentColor = "#fafafa",
}: VirtualCardProps) => {
  // Ensure any legacy theme styles exist so the card renders consistently
  useEffect(() => {
    if (!document.getElementById("virtual-card-styles")) {
      const style = document.createElement("style");
      style.id = "virtual-card-styles";
      style.textContent = `
        .card-no-flip {
          transform: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="w-full mx-auto">
      <Card
        className="relative w-full aspect-[1.586/1] rounded-2xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden card-no-flip"
        style={{
          backgroundColor: frontColor,
          color: textColor,
        }}
      >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8" style={{ color: accentColor }} />
              <span className="text-sm font-bold tracking-wider" style={{ color: accentColor }}>
                DROPLINK
              </span>
            </div>
            <div className="text-xs opacity-70" style={{ color: textColor }}>VIRTUAL CARD</div>
          </div>

          {/* QR Code Center */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className="bg-white p-3 sm:p-4 rounded-xl shadow-lg relative"
              style={{ backgroundColor: "white" }}
            >
              <QRCodeSVG
                value={storeUrl}
                size={window.innerWidth < 640 ? 100 : 140}
                level="H"
                includeMargin={false}
                fgColor="#000000"
              />
              {/* Logo in center of QR code */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-0.5 sm:p-1">
                <img
                  src="https://i.ibb.co/hJSD8rCj/Gemini-Generated-Image-ar8t52ar8t52ar8t-1.png"
                  alt="Droplink"
                  className="w-7 h-7 sm:w-10 sm:h-10 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Username Footer */}
          <div className="flex items-end justify-between relative z-10">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: textColor }}>MERCHANT</div>
              <div className="text-lg font-bold tracking-wide" style={{ color: textColor }}>@{username}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium mb-1" style={{ color: textColor }}>NETWORK</div>
              <div className="text-sm font-semibold" style={{ color: textColor }}>
                Pi Network
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: accentColor }}
          />
        </Card>
    </div>
  );
};
