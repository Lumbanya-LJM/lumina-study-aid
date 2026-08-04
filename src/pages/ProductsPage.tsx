import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Package, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Product, ProductCategory } from "@/integrations/supabase/types";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const NO_CATEGORY = "none";

interface ProductFormState {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  sellingPrice: string;
  costPrice: string;
  lowStockThreshold: string;
  imageFile: File | null;
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  categoryId: NO_CATEGORY,
  description: "",
  sellingPrice: "",
  costPrice: "",
  lowStockThreshold: "5",
  imageFile: null,
};

export default function ProductsPage() {
  const { business, currency } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("business_id", businessId!)
        .order("name");
      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const categoryName = (id: string | null) =>
    categories?.find((category) => category.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.sku ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      categoryId: product.category_id ?? NO_CATEGORY,
      description: product.description ?? "",
      sellingPrice: String(product.selling_price),
      costPrice: String(product.cost_price),
      lowStockThreshold: String(product.low_stock_threshold),
      imageFile: null,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = editing?.image_url ?? null;
      if (form.imageFile) {
        const path = `${businessId}/${crypto.randomUUID()}-${form.imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, form.imageFile, { upsert: false });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        business_id: businessId!,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category_id: form.categoryId === NO_CATEGORY ? null : form.categoryId,
        description: form.description.trim() || null,
        selling_price: Number(form.sellingPrice) || 0,
        cost_price: Number(form.costPrice) || 0,
        low_stock_threshold: Number(form.lowStockThreshold) || 0,
        image_url: imageUrl,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (product: Product) => {
      // Soft delete keeps sale history intact
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product removed");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    const { error } = await supabase
      .from("product_categories")
      .insert({ business_id: businessId!, name: newCategory.trim() });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That category already exists" : error.message);
    } else {
      setNewCategory("");
      queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
    }
  };

  const removeCategory = async (category: ProductCategory) => {
    const { error } = await supabase.from("product_categories").delete().eq("id", category.id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage what your business sells."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="mr-1.5 h-4 w-4" /> Categories
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Product
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="bg-card pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products?.length ? "No products match your search" : "No products yet"}
          description={
            products?.length
              ? "Try a different search or category filter."
              : "Add your first product to start tracking stock and sales."
          }
          action={
            !products?.length && (
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Product
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
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-9 w-9 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {categoryName(product.category_id)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMoney(product.cost_price, currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatMoney(product.selling_price, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          product.current_stock <= 0
                            ? "destructive"
                            : product.current_stock <= product.low_stock_threshold
                              ? "outline"
                              : "secondary"
                        }
                        className="font-mono"
                      >
                        {product.current_stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(product)}
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

      {/* Add/Edit product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this product's details." : "Add a product or service you sell."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name *</Label>
              <Input
                id="p-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="MacBook Air M2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="MBA-M2-256"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {(categories ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Cost price</Label>
                <Input
                  id="p-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Selling price *</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-low">Low stock alert</Label>
                <Input
                  id="p-low"
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-image">Product image</Label>
              <Input
                id="p-image"
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] ?? null })}
              />
              {editing?.image_url && !form.imageFile && (
                <p className="text-xs text-muted-foreground">Current image will be kept unless you choose a new one.</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories dialog */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Product Categories</DialogTitle>
            <DialogDescription>Group products for filtering and reporting.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addCategory} className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Electronics"
            />
            <Button type="submit">Add</Button>
          </form>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {(categories ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>
            )}
            {(categories ?? []).map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                {category.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeCategory(category)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The product will be hidden from your catalogue. Past sales and stock history are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
