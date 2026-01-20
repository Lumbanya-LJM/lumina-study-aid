import { Spinner } from "@/components/ui/spinner";

/**
 * ⚡ Bolt: A full-page loader for the Suspense fallback.
 * Prevents layout shifts and provides a clean loading experience
 * while lazy-loaded page components are fetched.
 */
export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
