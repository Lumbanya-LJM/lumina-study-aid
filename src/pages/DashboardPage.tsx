import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek, subDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  Package,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeKey = "today" | "week" | "month" | "30days";

interface Metrics {
  revenue: number;
  sales_count: number;
  items_sold: number;
  active_customers: number;
  total_customers: number;
  total_products: number;
  low_stock_count: number;
  inventory_value: number;
  profit: number;
}

function rangeToDates(range: RangeKey): { from: Date; to: Date } {
  const now = new Date();
  switch (range) {
    case "today":
      return { from: startOfDay(now), to: now };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case "30days":
      return { from: subDays(now, 30), to: now };
    case "month":
    default:
      return { from: startOfMonth(now), to: now };
  }
}

export default function DashboardPage() {
  const { business, currency } = useBusiness();
  const { profile } = useAuth();
  const [range, setRange] = useState<RangeKey>("month");

  const { from, to } = useMemo(() => rangeToDates(range), [range]);
  const businessId = business?.id;

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", businessId, range],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_metrics", {
        _business_id: businessId!,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const { data: trend } = useQuery({
    queryKey: ["revenue-trend", businessId, range],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("revenue_trend", {
        _business_id: businessId!,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: bestSellers } = useQuery({
    queryKey: ["best-sellers", businessId, range],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("best_sellers", {
        _business_id: businessId!,
        _from: from.toISOString(),
        _to: to.toISOString(),
        _limit: 5,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers", businessId, range],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("top_customers", {
        _business_id: businessId!,
        _from: from.toISOString(),
        _to: to.toISOString(),
        _limit: 5,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock, low_stock_threshold")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("current_stock", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data.filter((p) => p.current_stock <= p.low_stock_threshold);
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const chartData = (trend ?? []).map((point) => ({
    ...point,
    label: format(parseISO(point.day), "d MMM"),
    revenue: Number(point.revenue),
  }));

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${firstName} 👋`}
        description="Your business at a glance."
        actions={
          <Select value={range} onValueChange={(value) => setRange(value as RangeKey)}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {(lowStock?.length ?? 0) > 0 && (
        <Link
          to="/inventory"
          className="mb-5 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-warning/20"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          {lowStock!.length} product{lowStock!.length === 1 ? "" : "s"} running low on stock — review inventory
        </Link>
      )}

      {metricsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={formatMoney(metrics?.revenue, currency)}
            icon={Banknote}
            tone="accent"
          />
          <StatCard
            label="Profit"
            value={formatMoney(metrics?.profit, currency)}
            icon={TrendingUp}
            tone="accent"
          />
          <StatCard
            label="Sales"
            value={formatNumber(metrics?.sales_count)}
            hint={`${formatNumber(metrics?.items_sold)} items sold`}
            icon={Receipt}
          />
          <StatCard
            label="Customers"
            value={formatNumber(metrics?.total_customers)}
            hint={`${formatNumber(metrics?.active_customers)} active in period`}
            icon={Users}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales in this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    labelClassName="font-medium"
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best Sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(bestSellers ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No sales in this period yet.</p>
            )}
            {(bestSellers ?? []).map((item, index) => (
              <div key={item.product_id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(item.units_sold)} sold</p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(item.revenue, currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topCustomers ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No customer sales in this period yet.
              </p>
            )}
            {(topCustomers ?? []).map((customer) => (
              <div key={customer.customer_id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{customer.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(customer.orders)} order{Number(customer.orders) === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(customer.total_spent, currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              Inventory Snapshot
              <Link to="/inventory" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Active products</p>
                <p className="font-semibold">{formatNumber(metrics?.total_products)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inventory value (cost)</p>
                <p className="font-semibold">{formatMoney(metrics?.inventory_value, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low stock items</p>
                <p className="font-semibold">{formatNumber(metrics?.low_stock_count)}</p>
              </div>
            </div>
            {(lowStock ?? []).slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between border-t py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {product.name}
                </span>
                <Badge variant={product.current_stock <= 0 ? "destructive" : "secondary"} className="font-mono">
                  {product.current_stock} left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
