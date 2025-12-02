import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const PiBrowserModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Pi Browser Required</DialogTitle>
        <DialogDescription>
          This feature requires Pi Network authentication and must be loaded in the official Pi Browser.<br />
          Please open this app in Pi Browser to sign in with Pi Network.<br />
          <a href="https://minepi.com/get" target="_blank" rel="noopener noreferrer" className="block mt-4 mb-2 w-full rounded-md bg-[#FF8200] text-white hover:bg-[#cc6900] py-3 text-center font-medium transition-colors">Download Pi Browser</a>
        </DialogDescription>
      </DialogHeader>
      <Button onClick={onClose} className="w-full mt-2">Close</Button>
    </DialogContent>
  </Dialog>
);
