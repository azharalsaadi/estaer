/**
 * Hand-written, minimal Supabase `Database` generic — just enough of the
 * schema for the tables a feature's `apis/*.api.ts` actually queries so
 * far. This is NOT the full schema (see supabase/migrations/ for that);
 * it only needs to grow when a new feature starts querying a new table.
 *
 * If the project later adopts the Supabase CLI, run
 * `supabase gen types typescript` and replace this file's contents with
 * the generated output — nothing outside this file needs to change, since
 * only lib/supabaseClient.ts imports it.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          email: string
          display_name: string | null
          role: "member" | "admin"
          created_at: string
        }
        Insert: {
          user_id: string
          email: string
          display_name?: string | null
          role?: "member" | "admin"
          created_at?: string
        }
        Update: {
          user_id?: string
          email?: string
          display_name?: string | null
          role?: "member" | "admin"
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          id: string
          name: string
          category_id: string
          serial_number: string
          active: boolean
          image_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id: string
          serial_number: string
          active?: boolean
          image_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string
          serial_number?: string
          active?: boolean
          image_path?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          id: string
          user_id: string
          item_id: string
          start_date: string
          end_date: string
          reason: string
          status: "pending" | "approved" | "rejected" | "returned"
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: "requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          id: string
          request_id: string
          from_status: "pending" | "approved" | "rejected" | "returned" | null
          to_status: "pending" | "approved" | "rejected" | "returned"
          actor_id: string
          note: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          id: string
          request_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_request: {
        Args: {
          p_item_id: string
          p_start_date: string
          p_end_date: string
          p_reason: string
        }
        Returns: Database["public"]["Tables"]["requests"]["Row"]
      }
      update_request_status: {
        Args: {
          p_request_id: string
          p_new_status: "pending" | "approved" | "rejected" | "returned"
          p_rejection_reason?: string | null
        }
        Returns: Database["public"]["Tables"]["requests"]["Row"]
      }
      cancel_request: {
        Args: { p_request_id: string }
        Returns: Database["public"]["Tables"]["requests"]["Row"]
      }
      get_item_availability: {
        Args: { p_item_ids: string[] }
        Returns: { item_id: string; is_available: boolean }[]
      }
      get_item_booked_ranges: {
        Args: { p_item_id: string }
        Returns: { start_date: string; end_date: string }[]
      }
    }
  }
}
