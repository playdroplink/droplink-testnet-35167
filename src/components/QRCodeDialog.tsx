import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  username: string;
}

export const QRCodeDialog = ({ open, onOpenChange, url, username }: QRCodeDialogProps) => {
  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${username}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Store</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-lg relative w-[272px] h-[272px] flex items-center justify-center">
            <QRCodeSVG
              id="qr-code-svg"
              value={url}
              size={256}
              level="H"
              includeMargin={true}
            />
              <img
                src="/droplink-logo.png"
                alt="Droplink Logo"
                className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-white"
                style={{ pointerEvents: 'none', background: 'white', borderRadius: '0.5rem' }}
              />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to visit your store
          </p>
          <Button onClick={downloadQRCode} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
