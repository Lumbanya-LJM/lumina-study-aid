export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "business_owner" | "staff" | "system_admin";
export type MovementType = "stock_in" | "stock_out" | "adjustment" | "sale";
export type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer" | "credit";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          industry: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string;
          currency_code: string;
          operating_hours: string | null;
          logo_url: string | null;
          join_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          industry?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          currency_code?: string;
          operating_hours?: string | null;
          logo_url?: string | null;
          join_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          industry?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          currency_code?: string;
          operating_hours?: string | null;
          logo_url?: string | null;
          join_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: AppRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_locations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          address?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          name: string;
          sku: string | null;
          description: string | null;
          selling_price: number;
          cost_price: number;
          image_url: string | null;
          current_stock: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          name: string;
          sku?: string | null;
          description?: string | null;
          selling_price?: number;
          cost_price?: number;
          image_url?: string | null;
          current_stock?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          name?: string;
          sku?: string | null;
          description?: string | null;
          selling_price?: number;
          cost_price?: number;
          image_url?: string | null;
          current_stock?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          movement_type: MovementType;
          quantity_change: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          movement_type: MovementType;
          quantity_change: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          movement_type?: MovementType;
          quantity_change?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          sale_number: number;
          total_amount: number;
          payment_method: PaymentMethod;
          note: string | null;
          created_by: string | null;
          sold_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          sale_number: number;
          total_amount?: number;
          payment_method?: PaymentMethod;
          note?: string | null;
          created_by?: string | null;
          sold_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          sale_number?: number;
          total_amount?: number;
          payment_method?: PaymentMethod;
          note?: string | null;
          created_by?: string | null;
          sold_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          business_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          business_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          business_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_business: {
        Args: {
          _name: string;
          _industry?: string | null;
          _phone?: string | null;
          _email?: string | null;
          _address?: string | null;
          _city?: string | null;
          _operating_hours?: string | null;
        };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      join_business: {
        Args: { _join_code: string };
        Returns: string;
      };
      record_sale: {
        Args: {
          _business_id: string;
          _items: Json;
          _customer_id?: string | null;
          _payment_method?: PaymentMethod;
          _note?: string | null;
          _sold_at?: string;
        };
        Returns: string;
      };
      dashboard_metrics: {
        Args: { _business_id: string; _from: string; _to: string };
        Returns: Json;
      };
      revenue_trend: {
        Args: { _business_id: string; _from: string; _to: string };
        Returns: { day: string; revenue: number; sales_count: number }[];
      };
      best_sellers: {
        Args: { _business_id: string; _from: string; _to: string; _limit?: number };
        Returns: {
          product_id: string;
          product_name: string;
          image_url: string | null;
          units_sold: number;
          revenue: number;
        }[];
      };
      top_customers: {
        Args: { _business_id: string; _from: string; _to: string; _limit?: number };
        Returns: {
          customer_id: string;
          customer_name: string;
          orders: number;
          total_spent: number;
        }[];
      };
      is_business_member: {
        Args: { _business_id: string; _user_id?: string };
        Returns: boolean;
      };
      is_business_owner: {
        Args: { _business_id: string; _user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      movement_type: MovementType;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type Business = Tables<"businesses">;
export type BusinessMember = Tables<"business_members">;
export type BusinessLocation = Tables<"business_locations">;
export type ProductCategory = Tables<"product_categories">;
export type Product = Tables<"products">;
export type InventoryMovement = Tables<"inventory_movements">;
export type Customer = Tables<"customers">;
export type Sale = Tables<"sales">;
export type SaleItem = Tables<"sale_items">;
