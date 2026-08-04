import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole, BusinessLocation } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { business, isOwner, refresh } = useBusiness();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  // Business profile form
  const [bizName, setBizName] = useState("");
  const [bizIndustry, setBizIndustry] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizHours, setBizHours] = useState("");

  // Account form
  const [myName, setMyName] = useState("");
  const [myPhone, setMyPhone] = useState("");

  // Locations
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  useEffect(() => {
    if (business) {
      setBizName(business.name);
      setBizIndustry(business.industry ?? "");
      setBizPhone(business.phone ?? "");
      setBizEmail(business.email ?? "");
      setBizAddress(business.address ?? "");
      setBizCity(business.city ?? "");
      setBizHours(business.operating_hours ?? "");
    }
  }, [business]);

  useEffect(() => {
    if (profile) {
      setMyName(profile.full_name);
      setMyPhone(profile.phone ?? "");
    }
  }, [profile]);

  const { data: locations } = useQuery({
    queryKey: ["locations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_locations")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at");
      if (error) throw error;
      return data as BusinessLocation[];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at");
      if (error) throw error;

      const userIds = data.map((member) => member.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      return data.map((member) => ({
        ...member,
        profile: profiles.find((p) => p.id === member.user_id) ?? null,
      }));
    },
  });

  const saveBusiness = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: bizName.trim(),
          industry: bizIndustry.trim() || null,
          phone: bizPhone.trim() || null,
          email: bizEmail.trim() || null,
          address: bizAddress.trim() || null,
          city: bizCity.trim() || null,
          operating_hours: bizHours.trim() || null,
        })
        .eq("id", businessId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business profile saved");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: myName.trim(), phone: myPhone.trim() || null })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      refreshProfile();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addLocation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_locations").insert({
        business_id: businessId!,
        name: locationName.trim(),
        address: locationAddress.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Location added");
      setLocationName("");
      setLocationAddress("");
      queryClient.invalidateQueries({ queryKey: ["locations", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations", businessId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: AppRole }) => {
      const { error } = await supabase.from("business_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["members", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("business_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["members", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyJoinCode = () => {
    if (business?.join_code) {
      navigator.clipboard.writeText(business.join_code);
      toast.success("Join code copied");
    }
  };

  const handleBusinessSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveBusiness.mutate();
  };

  const handleAccountSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveAccount.mutate();
  };

  const handleLocationSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (locationName.trim()) addLocation.mutate();
  };

  return (
    <div>
      <PageHeader title="Settings" description="Business profile, locations, team, and your account." />

      <Tabs defaultValue="business">
        <TabsList className="mb-4">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="account">My Account</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="max-w-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Business Profile</CardTitle>
              <CardDescription>
                {isOwner ? "These details describe your business." : "Only the business owner can edit these details."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBusinessSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input value={bizName} onChange={(e) => setBizName(e.target.value)} disabled={!isOwner} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Input value={bizIndustry} onChange={(e) => setBizIndustry(e.target.value)} disabled={!isOwner} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} disabled={!isOwner} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} disabled={!isOwner} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Physical address</Label>
                    <Input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} disabled={!isOwner} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={bizCity} onChange={(e) => setBizCity(e.target.value)} disabled={!isOwner} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Operating hours</Label>
                  <Input
                    value={bizHours}
                    onChange={(e) => setBizHours(e.target.value)}
                    disabled={!isOwner}
                    placeholder="Mon–Sat, 08:00–18:00"
                  />
                </div>
                {isOwner && (
                  <Button type="submit" disabled={saveBusiness.isPending}>
                    {saveBusiness.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card className="max-w-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Business Locations</CardTitle>
              <CardDescription>Track the physical locations your business operates from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwner && (
                <form onSubmit={handleLocationSubmit} className="flex flex-wrap gap-2">
                  <Input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Location name"
                    className="w-40 flex-1"
                    required
                  />
                  <Input
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Address (optional)"
                    className="w-48 flex-1"
                  />
                  <Button type="submit" disabled={addLocation.isPending}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </form>
              )}
              <div className="space-y-2">
                {(locations ?? []).map((location) => (
                  <div key={location.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {location.name}{" "}
                          {location.is_primary && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              Primary
                            </Badge>
                          )}
                        </p>
                        {location.address && <p className="text-xs text-muted-foreground">{location.address}</p>}
                      </div>
                    </div>
                    {isOwner && !location.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeLocation.mutate(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <div className="max-w-2xl space-y-4">
            {isOwner && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Invite Staff</CardTitle>
                  <CardDescription>
                    Staff create their own AMANO account, choose "Join as Staff", and enter this code.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg border bg-secondary px-4 py-2 font-mono text-lg font-bold tracking-widest">
                      {business?.join_code}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyJoinCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>People with access to this business.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(members ?? []).map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.full_name || "Unnamed user"}
                        {member.user_id === user?.id && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(member.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && member.user_id !== user?.id ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(role) =>
                              changeRole.mutate({ memberId: member.id, role: role as AppRole })
                            }
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="business_owner">Business Owner</SelectItem>
                              <SelectItem value="staff">Staff Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeMember.mutate(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">
                          {member.role === "business_owner" ? "Business Owner" : "Staff Member"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <Card className="max-w-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-base">My Profile</CardTitle>
              <CardDescription>Signed in as {user?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={myName} onChange={(e) => setMyName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" value={myPhone} onChange={(e) => setMyPhone(e.target.value)} />
                </div>
                <Button type="submit" disabled={saveAccount.isPending}>
                  {saveAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
