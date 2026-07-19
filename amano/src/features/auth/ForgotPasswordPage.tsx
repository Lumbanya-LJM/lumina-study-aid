import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthLayout>
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary/40" strokeWidth={1.25} />
          <h2 className="font-serif text-2xl text-foreground">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="text-foreground">{email}</span>,
            a reset link is on its way.
          </p>
          <Button variant="outline" asChild className="w-full">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <header>
            <h2 className="font-serif text-3xl text-foreground">Reset password</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </header>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" variant="gold" className="w-full">
            Send reset link
          </Button>
          <p className="text-center text-sm">
            <Link to="/auth" className="text-accent hover:text-primary">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
