
import { Loader2 } from "lucide-react";

export const FullPageSpinner = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
};
