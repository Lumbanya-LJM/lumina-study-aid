import { AmanoLogo } from "@/components/shared/AmanoLogo";

export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 text-center">
      <AmanoLogo light showTagline className="mb-8 justify-center" />
      <div className="max-w-lg rounded-xl bg-white/5 p-8 text-white/90">
        <h1 className="text-xl font-bold text-white">Almost there — connect Supabase</h1>
        <p className="mt-3 text-sm leading-relaxed">
          AMANO needs a Supabase project to store your data. Create one at{" "}
          <span className="font-semibold">supabase.com</span>, run the migration in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">supabase/migrations</code>, then copy{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.example</code> to{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env</code> and fill in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
        <p className="mt-3 text-sm">Restart the dev server afterwards and this screen will disappear.</p>
      </div>
    </div>
  );
}
