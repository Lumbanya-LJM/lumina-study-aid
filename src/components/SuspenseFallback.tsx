import { Spinner } from "@/components/ui/spinner";

const SuspenseFallback = () => {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <Spinner className="size-8" />
    </div>
  );
};

export default SuspenseFallback;
