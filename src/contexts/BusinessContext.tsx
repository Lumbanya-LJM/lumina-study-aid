import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Business } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

interface BusinessContextValue {
  business: Business | null;
  role: AppRole | null;
  isOwner: boolean;
  loading: boolean;
  currency: string;
  refresh: () => void;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: membership, error } = await supabase
        .from("business_members")
        .select("role, business_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!membership) return { business: null, role: null };

      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", membership.business_id)
        .single();
      if (bizError) throw bizError;

      return { business, role: membership.role };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-business"] });
  };

  return (
    <BusinessContext.Provider
      value={{
        business: data?.business ?? null,
        role: data?.role ?? null,
        isOwner: data?.role === "business_owner",
        loading: isLoading,
        currency: data?.business?.currency_code ?? "ZMW",
        refresh,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
