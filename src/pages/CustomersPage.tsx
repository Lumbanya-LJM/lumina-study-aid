import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Customer } from "@/integrations/supabase/types";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomersPage() {
  const { business, currency } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers-full", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [customersResult, salesResult] = await Promise.all([
        supabase.from("customers").select("*").eq("business_id", businessId!).order("full_name"),
        supabase
          .from("sales")
          .select("customer_id, total_amount, sold_at")
          .eq("business_id", businessId!)
          .not("customer_id", "is", null),
      ]);
      if (customersResult.error) throw customersResult.error;
      if (salesResult.error) throw salesResult.error;

      const statsByCustomer = new Map<string, { orders: number; total: number; last: string }>();
      for (const sale of salesResult.data) {
        const existing = statsByCustomer.get(sale.customer_id!) ?? { orders: 0, total: 0, last: "" };
        existing.orders += 1;
        existing.total += Number(sale.total_amount);
        if (!existing.last || sale.sold_at > existing.last) existing.last = sale.sold_at;
        statsByCustomer.set(sale.customer_id!, existing);
      }

      return (customersResult.data as Customer[]).map((customer) => ({
        ...customer,
        stats: statsByCustomer.get(customer.id) ?? { orders: 0, total: 0, last: "" },
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!search) return customers ?? [];
    return (customers ?? []).filter(
      (customer) =>
        customer.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (customer.phone ?? "").includes(search),
    );
  }, [customers, search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setName(customer.full_name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: businessId!,
        full_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer added");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers-full", businessId] });
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      const { error } = await supabase.from("customers").delete().eq("id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["customers-full", businessId] });
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Know your customers. Build loyalty."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="bg-card pl-9"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={customers?.length ? "No customers match your search" : "No customers yet"}
          description={
            customers?.length
              ? "Try a different name or phone number."
              : "Add customers here, or create them while recording a sale."
          }
          action={
            !customers?.length && (
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Last Purchase</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.phone ?? customer.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(customer.stats.orders)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(customer.stats.total, currency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.stats.last ? formatDate(customer.stats.last) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(customer)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(customer)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this customer's details." : "Add a customer to track their purchases."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Full name *</Label>
              <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their past sales are kept but will show as walk-in purchases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
