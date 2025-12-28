import { Spinner } from "@/components/ui/spinner";

const PageLoader = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="large" />
    </div>
  );
};

export default PageLoader;
