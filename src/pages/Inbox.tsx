import { usePiNetwork } from "@/hooks/usePiNetwork";
import InboxMessages from "../components/InboxMessages";

export default function InboxPage() {
  const { user } = usePiNetwork();
  const receiverUsername = user?.username || "";
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      <InboxMessages receiverUsername={receiverUsername} />
    </div>
  );
}
