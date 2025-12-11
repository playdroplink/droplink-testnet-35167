import InboxMessages from "../components/InboxMessages";

export default function InboxPage() {
  // You may want to get the current user's username from context/auth
  // For now, we'll use a placeholder
  const receiverUsername = "YOUR_USERNAME_HERE";
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      <InboxMessages receiverUsername={receiverUsername} />
    </div>
  );
}
