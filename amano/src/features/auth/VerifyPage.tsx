import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { AuthLayout } from "./AuthLayout";
import { DEMO_OTP, useAuth } from "./store";

export default function VerifyPage() {
  const { user, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value: string) => {
    setBusy(true);
    setError(null);
    const { error } = await verifyEmail(value);
    setBusy(false);
    if (error) return setError(error);
    toast.success("Email verified. Welcome to Amano.");
    navigate("/onboarding");
  };

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <header className="space-y-1.5">
          <h2 className="font-serif text-3xl text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a six-digit code to{" "}
            <span className="text-foreground">{user?.email ?? "your inbox"}</span>.
            <br />
            <span className="text-xs">
              (Prototype: the code is {DEMO_OTP}.)
            </span>
          </p>
        </header>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (v.length === 6) void submit(v);
            }}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          variant="gold"
          className="w-full"
          loading={busy}
          disabled={code.length < 6}
          onClick={() => submit(code)}
        >
          Verify
        </Button>

        <button
          className="text-sm text-accent hover:text-primary"
          onClick={() => toast.info("A new code is on its way.")}
        >
          Resend code
        </button>
      </div>
    </AuthLayout>
  );
}
