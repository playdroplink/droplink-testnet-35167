

import { PiAuthButton } from "@/components/PiAuthButton";

const Index = () => {

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <h1 className="mb-4 text-4xl font-bold">Welcome to DropLink</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
        <PiAuthButton />
      </div>
    </div>
  );
};

export default Index;
