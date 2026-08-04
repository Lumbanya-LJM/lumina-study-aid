import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import type { PaymentMethod } from "@/integrations/supabase/types";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
  credit: "Credit",
};

export default function SalesPage() {
  const { business, currency } = useBusiness();
  const businessId = business?.id;
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(full_name), sale_items(id, quantity, unit_price, line_total, products(name))")
        .eq("business_id", businessId!)
        .order("sold_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Array<{
        id: string;
        sale_number: number;
        total_amount: number;
        payment_method: PaymentMethod;
        note: string | null;
        sold_at: string;
        customers: { full_name: string } | null;
        sale_items: Array<{
          id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          products: { name: string } | null;
        }>;
      }>;
    },
  });

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Every transaction your business records."
        actions={
          <Button asChild>
            <Link to="/sales/new">
              <Plus className="mr-1.5 h-4 w-4" /> Record Sale
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (sales ?? []).length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No sales recorded yet"
          description="Record your first sale to start building your business intelligence."
          action={
            <Button asChild>
              <Link to="/sales/new">
                <Plus className="mr-1.5 h-4 w-4" /> Record Sale
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Sale</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sales ?? []).map((sale) => {
                  const isOpen = expanded === sale.id;
                  const itemCount = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <>
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : sale.id)}
                      >
                        <TableCell>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-medium">#{sale.sale_number}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(sale.sold_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sale.customers?.full_name ?? <span className="text-muted-foreground">Walk-in</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{paymentLabels[sale.payment_method]}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(itemCount)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(sale.total_amount, currency)}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={sale.id + "-detail"} className="bg-secondary/50 hover:bg-secondary/50">
                          <TableCell colSpan={7} className="px-6 py-3">
                            <div className="space-y-1.5">
                              {sale.sale_items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span>
                                    {item.products?.name ?? "Product"}{" "}
                                    <span className="text-muted-foreground">
                                      × {item.quantity} @ {formatMoney(item.unit_price, currency)}
                                    </span>
                                  </span>
                                  <span className="font-medium">{formatMoney(item.line_total, currency)}</span>
                                </div>
                              ))}
                              {sale.note && (
                                <p className="pt-1 text-xs text-muted-foreground">Note: {sale.note}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
