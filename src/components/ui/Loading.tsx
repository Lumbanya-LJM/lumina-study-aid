// ⚡ Bolt: A simple, reusable loading spinner component.
// This provides a better user experience than a plain text "Loading..." message
// during Suspense fallbacks.
export const Loading = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};
