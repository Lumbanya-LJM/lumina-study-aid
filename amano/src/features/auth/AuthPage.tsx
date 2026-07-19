import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthLayout } from "./AuthLayout";
import { SocialButtons } from "./SocialButtons";
import { useAuth } from "./store";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, "Tell us your name"),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export default function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  const isSignUp = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const { signUp, signInWithPassword } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : (signInSchema as never)),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const onSubmit = async (values: SignUpValues | SignInValues) => {
    setServerError(null);
    if (isSignUp) {
      const v = values as SignUpValues;
      const { error } = await signUp(v);
      if (error) return setServerError(error);
      navigate("/auth/verify");
    } else {
      const { error } = await signInWithPassword(values);
      if (error) return setServerError(error);
      navigate(returnTo ?? "/home");
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header>
          <h2 className="font-serif text-3xl text-foreground">
            {isSignUp ? "Join Amano" : "Welcome back"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignUp
              ? "Start learning, earning, and growing today."
              : "Pick up exactly where you left off."}
          </p>
        </header>

        <SocialButtons />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            or with email
          </span>
          <Separator className="flex-1" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSignUp && (
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Misozi Tembo" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    {!isSignUp && (
                      <Link
                        to="/auth/forgot"
                        className="text-xs text-accent hover:text-primary"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              loading={form.formState.isSubmitting}
            >
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already on Amano? " : "New to Amano? "}
          <Link
            to={isSignUp ? "/auth" : "/auth/signup"}
            className="font-medium text-accent hover:text-primary"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
