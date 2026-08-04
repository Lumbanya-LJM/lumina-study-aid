import { Link } from "react-router-dom";
import { AmanoLogo } from "@/components/shared/AmanoLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <AmanoLogo />
      <div>
        <h1 className="text-5xl font-extrabold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">That page doesn't exist.</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
