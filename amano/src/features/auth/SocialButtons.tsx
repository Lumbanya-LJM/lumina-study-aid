import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "./store";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.6 2.8c2.2-2 3.8-5 3.8-8.5z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.6-2.9c-1 .7-2.4 1.2-4.3 1.2-3.1 0-5.8-2.1-6.8-5l-3.8 2.9C3.3 21.2 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.4 6.7C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.3l3.8-2.9z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4L18.9 3C16.9 1.1 14.2 0 12 0 7.3 0 3.3 2.8 1.4 6.7l3.8 2.9c1-2.9 3.7-4.9 6.8-4.9z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-4zM14.4 5.6c.7-.8 1.1-1.9 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function SocialButtons() {
  const signInWithOAuth = useAuth((s) => s.signInWithOAuth);
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  const go = async (provider: "google" | "apple" | "microsoft") => {
    setBusy(provider);
    await signInWithOAuth(provider);
    navigate("/onboarding");
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="outline" loading={busy === "google"} onClick={() => go("google")} aria-label="Continue with Google">
        {busy !== "google" && <GoogleGlyph />}
      </Button>
      <Button variant="outline" loading={busy === "apple"} onClick={() => go("apple")} aria-label="Continue with Apple">
        {busy !== "apple" && <AppleGlyph />}
      </Button>
      <Button variant="outline" loading={busy === "microsoft"} onClick={() => go("microsoft")} aria-label="Continue with Microsoft">
        {busy !== "microsoft" && <MicrosoftGlyph />}
      </Button>
    </div>
  );
}
