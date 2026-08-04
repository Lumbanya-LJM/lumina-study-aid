import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Minus, Package, Plus, Search, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import type { PaymentMethod, Product } from "@/integrations/supabase/types";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WALK_IN = "walk-in";

interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const { business, currency } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>(WALK_IN);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("business_id", businessId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!search) return products ?? [];
    return (products ?? []).filter(
      (product) =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.sku ?? "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [products, search]);

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { product, quantity: 1, unitPrice: Number(product.selling_price) }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === id ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const setUnitPrice = (id: string, value: string) => {
    setCart((current) =>
      current.map((line) =>
        line.product.id === id ? { ...line, unitPrice: Number(value) || 0 } : line,
      ),
    );
  };

  const removeLine = (id: string) => {
    setCart((current) => current.filter((line) => line.product.id !== id));
  };

  const createCustomer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          business_id: businessId!,
          full_name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Customer added");
      setNewCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] }).then(() => {
        setCustomerId(data.id);
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recordSale = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Add at least one product to the sale");
      const { data, error } = await supabase.rpc("record_sale", {
        _business_id: businessId!,
        _items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          unit_price: line.unitPrice,
        })),
        _customer_id: customerId === WALK_IN ? null : customerId,
        _payment_method: paymentMethod,
        _note: note.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Sale recorded — ${formatMoney(total, currency)}`);
      queryClient.invalidateQueries({ queryKey: ["sales", businessId] });
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      queryClient.invalidateQueries({ queryKey: ["movements", businessId] });
      navigate("/sales");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Sale</h1>
          <p className="text-sm text-muted-foreground">Pick products, choose the customer, done.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Product picker */}
        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No products found. Add products first.
              </p>
            ) : (
              <div className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-10 w-10 rounded-md border object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(product.selling_price, currency)}
                      </p>
                    </div>
                    <Badge
                      variant={product.current_stock <= 0 ? "destructive" : "secondary"}
                      className="shrink-0 font-mono text-[10px]"
                    >
                      {product.current_stock}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart / checkout */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" /> Sale Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tap products on the left to add them.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div key={line.product.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{line.product.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(line.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-mono text-sm">{line.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(line.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => setUnitPrice(line.product.id, e.target.value)}
                          className="h-8 w-24 text-right font-mono text-sm"
                        />
                        <span className="w-20 text-right text-sm font-semibold">
                          {formatMoney(line.quantity * line.unitPrice, currency)}
                        </span>
                      </div>
                    </div>
                    {line.quantity > line.product.current_stock && (
                      <p className="mt-1.5 text-xs font-medium text-destructive">
                        Only {line.product.current_stock} in stock — this will go negative.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Customer</Label>
                  <button
                    type="button"
                    onClick={() => setNewCustomerOpen(true)}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> New customer
                  </button>
                </div>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WALK_IN}>Walk-in customer</SelectItem>
                    {(customers ?? []).map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit (pay later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sale-note">Note</Label>
                <Input id="sale-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{formatMoney(total, currency)}</span>
              </div>

              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="lg"
                disabled={cart.length === 0 || recordSale.isPending}
                onClick={() => recordSale.mutate()}
              >
                {recordSale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>Add the customer so this sale counts towards their history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nc-name">Full name *</Label>
              <Input id="nc-name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-phone">Phone</Label>
              <Input id="nc-phone" type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCustomerName.trim() || createCustomer.isPending}
              onClick={() => createCustomer.mutate()}
            >
              {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
