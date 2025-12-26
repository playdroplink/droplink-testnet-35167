import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { VirtualCard } from "@/components/VirtualCard";
import { Download, Printer, RefreshCw, Palette, Share2, Link, AlertCircle, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CardGenerator() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Get full profile data from localStorage
  const profileData = localStorage.getItem("profile");
  const profile = profileData ? JSON.parse(profileData) : null;
  
  // Get user data from localStorage as fallback
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  
  // Use profile username or fallback to user username
  const username = profile?.username || user?.username || "yourusername";
  
  // Store URL from user's store - use actual username for proper routing
  const storeUrl = `${window.location.origin}/store/${username}`;

  // Card customization state - default colors: Sky Blue theme
  const [frontColor, setFrontColor] = useState(
    profile?.theme_settings?.backgroundColor || "#2bbdee"
  );
  const [backColor, setBackColor] = useState("#2bbdee");
  const [textColor, setTextColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState(
    profile?.theme_settings?.primaryColor || "#fafafa"
  );
  const [shareableLink, setShareableLink] = useState("");
  const [showShareLink, setShowShareLink] = useState(false);
  const [viewCardOnly, setViewCardOnly] = useState(false);
  
  // Detect Pi Browser
  const isPiBrowser = navigator.userAgent.includes("PiBrowser") || window.location.hostname.includes("pi.app");

  // Preset color themes
  const presets = [
    {
      name: "Classic Blue",
      front: "#1a1a2e",
      back: "#16213e",
      text: "#ffffff",
      accent: "#87ceeb",
    },
    {
      name: "Purple Dream",
      front: "#2d1b69",
      back: "#1e0342",
      text: "#ffffff",
      accent: "#c77dff",
    },
    {
      name: "Emerald",
      front: "#064e3b",
      back: "#022c22",
      text: "#ffffff",
      accent: "#34d399",
    },
    {
      name: "Rose Gold",
      front: "#4a1942",
      back: "#2d0a2b",
      text: "#ffffff",
      accent: "#f9a8d4",
    },
    {
      name: "Ocean",
      front: "#0c4a6e",
      back: "#082f49",
      text: "#ffffff",
      accent: "#7dd3fc",
    },
    {
      name: "Sunset",
      front: "#7c2d12",
      back: "#431407",
      text: "#ffffff",
      accent: "#fdba74",
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setFrontColor(preset.front);
    setBackColor(preset.back);
    setTextColor(preset.text);
    setAccentColor(preset.accent);
    toast({
      title: "Theme Applied",
      description: `${preset.name} theme has been applied to your card.`,
    });
  };

  const resetColors = () => {
    setFrontColor("#1a1a2e");
    setBackColor("#16213e");
    setTextColor("#ffffff");
    setAccentColor("#87ceeb");
    toast({
      title: "Colors Reset",
      description: "Card colors have been reset to default.",
    });
  };

  const handlePrint = () => {
    window.print();
    toast({
      title: "Printing...",
      description: "Your card is being prepared for printing.",
    });
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `droplink-card-${username}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Downloaded!",
        description: "Your card has been saved as PNG.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        logging: false,
      });

      // Standard credit card size: 85.6mm x 53.98mm
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98],
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
      pdf.save(`droplink-card-${username}.pdf`);

      toast({
        title: "Downloaded!",
        description: "Your card has been saved as PDF.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateShareableLink = () => {
    // Create shareable URL with card customization data
    const params = new URLSearchParams({
      username,
      frontColor,
      backColor,
      textColor,
      accentColor,
    });
    const link = `${window.location.origin}/card-generator?${params.toString()}`;
    setShareableLink(link);
    setShowShareLink(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(link);
    
    toast({
      title: "Link Copied!",
      description: "Open this link in any browser to download your card.",
    });
  };

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      {/* View Card Only Mode */}
      {viewCardOnly && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl">
            <Button
              onClick={() => setViewCardOnly(false)}
              variant="ghost"
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </Button>
            <VirtualCard
              username={username}
              storeUrl={storeUrl}
              frontColor={frontColor}
              backColor={backColor}
              textColor={textColor}
              accentColor={accentColor}
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-sky-500">
            Virtual Card Generator
          </h1>
          <p className="text-muted-foreground">
            Create your personalized Droplink card with QR code
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card Preview */}
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Card Preview
              </h2>
              <div ref={cardRef} className="print-area">
                <VirtualCard
                  username={username}
                  storeUrl={storeUrl}
                  frontColor={frontColor}
                  backColor={backColor}
                  textColor={textColor}
                  accentColor={accentColor}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6 no-print">
                <Button
                  onClick={() => setViewCardOnly(true)}
                  variant="outline"
                  className="w-full col-span-2"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Card Only
                </Button>
                <Button
                  onClick={generateShareableLink}
                  className="w-full col-span-2 bg-sky-500 hover:bg-sky-600"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Get Download Link
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Card
                </Button>
                <Button
                  onClick={handleDownloadPNG}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="w-full col-span-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF (Print Ready)
                </Button>
              </div>
            </Card>

            {/* Pi Browser Notice */}
            {isPiBrowser && (
              <Alert className="no-print bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <strong>Pi Browser Users:</strong> Downloads may be restricted. Use the "Generate Share Link" button to open in another browser!
                </AlertDescription>
              </Alert>
            )}

            {/* Share Link Card (Always visible if link generated) */}
            {shareableLink && (
              <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-200 dark:border-green-800 no-print">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Download or Share Link
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Open this link in any browser to download your card:<br />
                  <a href={shareableLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{shareableLink}</a>
                </p>
                <div className="flex gap-2">
                  <Input
                    value={shareableLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    onClick={copyShareableLink}
                    size="sm"
                    variant="outline"
                  >
                    Copy
                  </Button>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 no-print">
              <h3 className="font-semibold mb-2">💳 About Your Card</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Standard credit card size (85.6 × 53.98 mm)</li>
                <li>✓ QR code links to your store: @{username}</li>
                <li>✓ High-quality print ready</li>
                <li>✓ Download as PNG or PDF</li>
                <li>✓ Click card to see both sides</li>
                {isPiBrowser && (
                  <li className="text-amber-600 font-semibold">⚠️ Use share link for downloads</li>
                )}
              </ul>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="space-y-6 no-print">
            {/* Color Customization */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Customize Colors</h2>
                <Button
                  onClick={resetColors}
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="frontColor">Front Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="frontColor"
                      type="color"
                      value={frontColor}
                      onChange={(e) => setFrontColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={frontColor}
                      onChange={(e) => setFrontColor(e.target.value)}
                      placeholder="#1a1a2e"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backColor">Back Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="backColor"
                      type="color"
                      value={backColor}
                      onChange={(e) => setBackColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={backColor}
                      onChange={(e) => setBackColor(e.target.value)}
                      placeholder="#16213e"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accentColor">Accent Color (Droplink Logo)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#87ceeb"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Preset Themes */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4">Preset Themes</h2>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: preset.front }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-sm font-medium">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Card Details */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4">Card Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-mono font-semibold">@{username}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Store URL:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {storeUrl}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Card Size:</span>
                  <span className="font-semibold">85.6 × 53.98 mm</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-semibold text-blue-600">Pi Network</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: 85.6mm 53.98mm;
            margin: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 85.6mm !important;
            height: 53.98mm !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            page-break-after: avoid;
            page-break-before: avoid;
            page-break-inside: avoid;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
