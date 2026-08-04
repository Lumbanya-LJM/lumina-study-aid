import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Boxes, Loader2, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import type { MovementType } from "@/integrations/supabase/types";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActionKind = "stock_in" | "stock_out" | "adjustment";

const movementLabels: Record<MovementType, string> = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  adjustment: "Adjustment",
  sale: "Sale",
};

const movementStyles: Record<MovementType, string> = {
  stock_in: "bg-success/10 text-success border-success/30",
  stock_out: "bg-warning/15 text-foreground border-warning/40",
  adjustment: "bg-secondary text-secondary-foreground",
  sale: "bg-accent/10 text-accent border-accent/30",
};

export default function InventoryPage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<ActionKind>("stock_in");
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const { data: products, isLoading: productsLoading } = useQuery({
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
      return data;
    },
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["movements", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, products(name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Array<{
        id: string;
        movement_type: MovementType;
        quantity_change: number;
        note: string | null;
        created_at: string;
        products: { name: string } | null;
      }>;
    },
  });

  const lowStock = (products ?? []).filter((p) => p.current_stock <= p.low_stock_threshold);

  const openDialog = (kind: ActionKind) => {
    setAction(kind);
    setProductId("");
    setQuantity("");
    setNote("");
    setDialogOpen(true);
  };

  const recordMovement = useMutation({
    mutationFn: async () => {
      const product = products?.find((p) => p.id === productId);
      if (!product) throw new Error("Select a product");
      const qty = Number(quantity);
      if (!Number.isFinite(qty)) throw new Error("Enter a valid quantity");

      let change: number;
      if (action === "stock_in") {
        if (qty <= 0) throw new Error("Quantity must be positive");
        change = qty;
      } else if (action === "stock_out") {
        if (qty <= 0) throw new Error("Quantity must be positive");
        change = -qty;
      } else {
        // adjustment: user enters the correct counted stock level
        change = qty - product.current_stock;
        if (change === 0) throw new Error("Stock level is already " + qty);
      }

      const { error } = await supabase.from("inventory_movements").insert({
        business_id: businessId!,
        product_id: productId,
        movement_type: action,
        quantity_change: change,
        note: note.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["movements", businessId] });
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      queryClient.invalidateQueries({ queryKey: ["low-stock", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    recordMovement.mutate();
  };

  const selectedProduct = products?.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock movement across your products."
        actions={
          <>
            <Button variant="outline" onClick={() => openDialog("adjustment")}>
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Adjust
            </Button>
            <Button variant="outline" onClick={() => openDialog("stock_out")}>
              <ArrowDownCircle className="mr-1.5 h-4 w-4" /> Remove Stock
            </Button>
            <Button onClick={() => openDialog("stock_in")}>
              <ArrowUpCircle className="mr-1.5 h-4 w-4" /> Add Stock
            </Button>
          </>
        }
      />

      <Tabs defaultValue="levels">
        <TabsList className="mb-4">
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            Low Stock
            {lowStock.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1 text-[10px]">
                {lowStock.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          {productsLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (products ?? []).length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No products to track"
              description="Add products first, then manage their stock here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">In Stock</TableHead>
                      <TableHead className="text-right">Alert Level</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right font-mono">{product.current_stock}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {product.low_stock_threshold}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.current_stock <= 0 ? (
                            <Badge variant="destructive">Out of stock</Badge>
                          ) : product.current_stock <= product.low_stock_threshold ? (
                            <Badge className="border-warning/40 bg-warning/15 text-foreground" variant="outline">
                              Low stock
                            </Badge>
                          ) : (
                            <Badge className="border-success/30 bg-success/10 text-success" variant="outline">
                              In stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements">
          {movementsLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (movements ?? []).length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No stock movements yet"
              description="Stock you add, remove, adjust, or sell will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movements ?? []).map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(movement.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{movement.products?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={movementStyles[movement.movement_type]}>
                            {movementLabels[movement.movement_type]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            "text-right font-mono font-semibold " +
                            (movement.quantity_change > 0 ? "text-success" : "text-destructive")
                          }
                        >
                          {movement.quantity_change > 0 ? "+" : ""}
                          {movement.quantity_change}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                          {movement.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {lowStock.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No low stock alerts"
              description="Products at or below their alert level will show up here."
            />
          ) : (
            <div className="space-y-2">
              {lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.current_stock} left · alert at {product.low_stock_threshold}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openDialog("stock_in");
                      setProductId(product.id);
                    }}
                  >
                    Restock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "stock_in" ? "Add Stock" : action === "stock_out" ? "Remove Stock" : "Stock Adjustment"}
            </DialogTitle>
            <DialogDescription>
              {action === "stock_in"
                ? "Record new stock received."
                : action === "stock_out"
                  ? "Record stock leaving outside of a sale (damage, transfer, personal use)."
                  : "Correct the stock level after a physical count."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(products ?? []).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.current_stock} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-qty">
                {action === "adjustment" ? "Counted stock level *" : "Quantity *"}
              </Label>
              <Input
                id="m-qty"
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {action === "adjustment" && selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  System shows {selectedProduct.current_stock}. Enter the correct level.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-note">Note</Label>
              <Input
                id="m-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={action === "stock_in" ? "e.g. New delivery from supplier" : "Reason"}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordMovement.isPending || !productId}>
                {recordMovement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
