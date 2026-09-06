export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      barcode_lookup_cache: {
        Row: {
          barcode: string
          description: string | null
          name: string
          updated_at: string
        }
        Insert: {
          barcode: string
          description?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          barcode?: string
          description?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_keywords: {
        Row: {
          category_id: string
          created_at: string
          id: string
          keyword: string
          normalized_keyword: string
          priority: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          keyword: string
          normalized_keyword: string
          priority?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          keyword?: string
          normalized_keyword?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          actual_stock: number
          book_stock: number | null
          category_id: string | null
          cost_price: number | null
          counted_at: string
          created_at: string
          id: string
          jan_code: string | null
          product_id: string | null
          selling_price: number | null
          shelf_location_id: string | null
          sku: string
          store_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_stock: number
          book_stock?: number | null
          category_id?: string | null
          cost_price?: number | null
          counted_at: string
          created_at?: string
          id?: string
          jan_code?: string | null
          product_id?: string | null
          selling_price?: number | null
          shelf_location_id?: string | null
          sku: string
          store_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_stock?: number
          book_stock?: number | null
          category_id?: string | null
          cost_price?: number | null
          counted_at?: string
          created_at?: string
          id?: string
          jan_code?: string | null
          product_id?: string | null
          selling_price?: number | null
          shelf_location_id?: string | null
          sku?: string
          store_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_shelf_location_id_fkey"
            columns: ["shelf_location_id"]
            isOneToOne: false
            referencedRelation: "shelf_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          description: string
          locale: string
          product_id: string
          translated_at: string
        }
        Insert: {
          description: string
          locale: string
          product_id: string
          translated_at?: string
        }
        Update: {
          description?: string
          locale?: string
          product_id?: string
          translated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          shelf_id: string | null
          store_id: string
        }
        Insert: {
          barcode: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          shelf_id?: string | null
          store_id: string
        }
        Update: {
          barcode?: string
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          shelf_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: true
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          id: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shelf_locations: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          location_code: string
          store_id: string
          unity_position_x: number
          unity_position_y: number
          unity_position_z: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_code: string
          store_id: string
          unity_position_x?: number
          unity_position_y?: number
          unity_position_z?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_code?: string
          store_id?: string
          unity_position_x?: number
          unity_position_y?: number
          unity_position_z?: number
        }
        Relationships: [
          {
            foreignKeyName: "shelf_locations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelf_locations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shelves: {
        Row: {
          barcode: string
          created_at: string
          id: string
          location_id: string | null
          store_id: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          location_id?: string | null
          store_id: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          location_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelves_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "shelf_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelves_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          description: string | null
          entry_qr_code: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_qr_code: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_qr_code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
