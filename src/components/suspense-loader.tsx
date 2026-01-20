// src/components/suspense-loader.tsx
import { CgSpinner } from "react-icons/cg";

/**
 * A simple, centered loading spinner for Suspense fallbacks.
 * This is shown to the user while lazy-loaded components are fetched.
 */
export const SuspenseLoader = () => {
  return (
    <div className="w-full py-48 flex flex-col items-center justify-center">
      <CgSpinner className="animate-spin text-4xl text-primary" />
    </div>
  );
};
