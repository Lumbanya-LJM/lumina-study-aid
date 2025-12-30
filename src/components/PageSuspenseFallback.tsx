// ⚡ Bolt: This component is a fallback UI shown to users
// while a lazy-loaded page component is being fetched.
// It provides a smooth loading experience and prevents a blank screen.
import { Loader2 } from "lucide-react";

const PageSuspenseFallback = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default PageSuspenseFallback;
