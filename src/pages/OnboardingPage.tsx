import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Loader2, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import { AmanoLogo } from "@/components/shared/AmanoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const industries = [
  "Retail & General Trading",
  "Groceries & Food",
  "Fashion & Clothing",
  "Electronics",
  "Home & Living",
  "Beauty & Cosmetics",
  "Hardware & Construction",
  "Agriculture",
  "Services",
  "Hospitality & Restaurants",
  "Other",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useBusiness();
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");

  const [joinCode, setJoinCode] = useState("");

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.rpc("create_business", {
      _name: name.trim(),
      _industry: industry || null,
      _phone: phone.trim() || null,
      _email: email.trim() || null,
      _address: address.trim() || null,
      _city: city.trim() || null,
      _operating_hours: hours.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Business created — welcome to AMANO!");
      refresh();
      navigate("/dashboard");
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.rpc("join_business", { _join_code: joinCode.trim() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("Invalid join code") ? "Invalid join code" : error.message);
    } else {
      toast.success("You've joined the business");
      refresh();
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 py-10">
      <AmanoLogo light showTagline className="mb-8 justify-center" />
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Set up your workspace</CardTitle>
          <CardDescription>Register your business, or join an existing one as staff.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="create" className="gap-1.5">
                <Building2 className="h-4 w-4" /> New Business
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-1.5">
                <UsersRound className="h-4 w-4" /> Join as Staff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-name">Business name *</Label>
                  <Input id="biz-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Zambezi Home & Living" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-phone">Business phone</Label>
                    <Input id="biz-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+260 ..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="biz-email">Business email</Label>
                  <Input id="biz-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-address">Physical address</Label>
                    <Input id="biz-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plot 5, Great East Rd" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-city">City</Label>
                    <Input id="biz-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lusaka" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="biz-hours">Operating hours</Label>
                  <Input id="biz-hours" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Sat, 08:00–18:00" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Business
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="join-code">Business join code</Label>
                  <Input
                    id="join-code"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 4F7A9C21"
                    className="font-mono tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask the business owner for the join code shown in their Settings page.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join Business
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <button
            type="button"
            onClick={() => signOut()}
            className="mt-4 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
