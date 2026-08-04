import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { BarChart3, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { formatMoney, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { Banknote, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Metrics {
  revenue: number;
  sales_count: number;
  items_sold: number;
  profit: number;
}

export default function ReportsPage() {
  const { business, currency } = useBusiness();
  const businessId = business?.id;

  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fromIso = useMemo(() => new Date(fromDate + "T00:00:00").toISOString(), [fromDate]);
  const toIso = useMemo(() => new Date(toDate + "T23:59:59").toISOString(), [toDate]);

  const { data: metrics } = useQuery({
    queryKey: ["report-metrics", businessId, fromIso, toIso],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_metrics", {
        _business_id: businessId!,
        _from: fromIso,
        _to: toIso,
      });
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const { data: trend } = useQuery({
    queryKey: ["report-trend", businessId, fromIso, toIso],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("revenue_trend", {
        _business_id: businessId!,
        _from: fromIso,
        _to: toIso,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: bestSellers } = useQuery({
    queryKey: ["report-best", businessId, fromIso, toIso],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("best_sellers", {
        _business_id: businessId!,
        _from: fromIso,
        _to: toIso,
        _limit: 20,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["report-sales", businessId, fromIso, toIso],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("sale_number, sold_at, total_amount, payment_method, customers(full_name)")
        .eq("business_id", businessId!)
        .gte("sold_at", fromIso)
        .lte("sold_at", toIso)
        .order("sold_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        sale_number: number;
        sold_at: string;
        total_amount: number;
        payment_method: string;
        customers: { full_name: string } | null;
      }>;
    },
  });

  const chartData = (trend ?? []).map((point) => ({
    label: format(parseISO(point.day), "d MMM"),
    revenue: Number(point.revenue),
  }));

  const exportCsv = () => {
    const rows = [
      ["Sale #", "Date", "Customer", "Payment Method", "Total"],
      ...(sales ?? []).map((sale) => [
        String(sale.sale_number),
        format(parseISO(sale.sold_at), "yyyy-MM-dd HH:mm"),
        sale.customers?.full_name ?? "Walk-in",
        sale.payment_method,
        String(sale.total_amount),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amano-sales-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales performance over any period."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!sales?.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-card" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-card" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={formatMoney(metrics?.revenue, currency)} icon={Banknote} tone="accent" />
        <StatCard label="Profit" value={formatMoney(metrics?.profit, currency)} icon={TrendingUp} tone="accent" />
        <StatCard
          label="Sales"
          value={formatNumber(metrics?.sales_count)}
          hint={`${formatNumber(metrics?.items_sold)} items sold`}
          icon={Receipt}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    width={70}
                    tickFormatter={(value: number) => formatMoney(value, currency)}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatMoney(value, currency), "Revenue"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Product Performance</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto scrollbar-thin">
            {(bestSellers ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bestSellers ?? []).map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(item.units_sold)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(item.revenue, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales in Period ({formatNumber(sales?.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {(sales ?? []).length === 0 ? (
            <EmptyState icon={BarChart3} title="No sales in this period" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sales ?? []).map((sale) => (
                    <TableRow key={sale.sale_number}>
                      <TableCell className="font-mono">#{sale.sale_number}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(parseISO(sale.sold_at), "d MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">{sale.customers?.full_name ?? "Walk-in"}</TableCell>
                      <TableCell className="text-sm capitalize">{sale.payment_method.replace("_", " ")}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(sale.total_amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
