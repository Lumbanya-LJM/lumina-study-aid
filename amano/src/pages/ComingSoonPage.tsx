import { Hammer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { EmptyState } from "@/design-system/EmptyState";

/** Placeholder for routes whose module lands in a later phase —
 *  navigation never dead-ends. */
export default function ComingSoonPage({ title }: { title?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const label =
    title ??
    pathname
      .replace(/^\//, "")
      .split("/")[0]
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <EmptyState
        icon={Hammer}
        title={`${label} is on the way`}
        description="This module arrives in an upcoming phase of the Amano build."
        actionLabel="Back to Home"
        onAction={() => navigate("/home")}
        className="w-full max-w-md border-none"
      />
    </div>
  );
}
