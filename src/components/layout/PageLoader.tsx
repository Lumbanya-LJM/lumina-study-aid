import { Spinner } from "@/components/ui/spinner";

export const PageLoader = () => (
  <div className="flex items-center justify-center py-24 w-full min-h-[50vh]">
    <Spinner className="size-8 text-primary" />
  </div>
);
