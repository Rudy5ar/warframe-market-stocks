export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AlertType = "spread" | "price_drop";

export type ScanStatus = "idle" | "running" | "error";

export interface Database {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          url_name: string;
          item_name: string;
          thumb: string | null;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          id: string;
          url_name: string;
          item_name: string;
          thumb?: string | null;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          url_name?: string;
          item_name?: string;
          thumb?: string | null;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_cursor: {
        Row: {
          id: number;
          offset: number;
          last_run_at: string | null;
          status: ScanStatus;
          updated_at: string;
        };
        Insert: {
          id?: number;
          offset?: number;
          last_run_at?: string | null;
          status?: ScanStatus;
          updated_at?: string;
        };
        Update: {
          id?: number;
          offset?: number;
          last_run_at?: string | null;
          status?: ScanStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      item_snapshots: {
        Row: {
          url_name: string;
          lowest_sell: number | null;
          highest_buy: number | null;
          spread: number | null;
          roi_pct: number | null;
          median_48h: number | null;
          volume_48h: number | null;
          scanned_at: string;
        };
        Insert: {
          url_name: string;
          lowest_sell?: number | null;
          highest_buy?: number | null;
          spread?: number | null;
          roi_pct?: number | null;
          median_48h?: number | null;
          volume_48h?: number | null;
          scanned_at?: string;
        };
        Update: {
          url_name?: string;
          lowest_sell?: number | null;
          highest_buy?: number | null;
          spread?: number | null;
          roi_pct?: number | null;
          median_48h?: number | null;
          volume_48h?: number | null;
          scanned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_snapshots_url_name_fkey";
            columns: ["url_name"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["url_name"];
          },
        ];
      };
      item_snapshot_history: {
        Row: {
          id: number;
          url_name: string;
          lowest_sell: number | null;
          highest_buy: number | null;
          spread: number | null;
          roi_pct: number | null;
          median_48h: number | null;
          volume_48h: number | null;
          scanned_at: string;
        };
        Insert: {
          id?: number;
          url_name: string;
          lowest_sell?: number | null;
          highest_buy?: number | null;
          spread?: number | null;
          roi_pct?: number | null;
          median_48h?: number | null;
          volume_48h?: number | null;
          scanned_at?: string;
        };
        Update: {
          id?: number;
          url_name?: string;
          lowest_sell?: number | null;
          highest_buy?: number | null;
          spread?: number | null;
          roi_pct?: number | null;
          median_48h?: number | null;
          volume_48h?: number | null;
          scanned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_snapshot_history_url_name_fkey";
            columns: ["url_name"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["url_name"];
          },
        ];
      };
      alerts: {
        Row: {
          id: number;
          type: AlertType;
          url_name: string;
          payload: Json;
          alert_day: string;
          created_at: string;
          notified_discord_at: string | null;
        };
        Insert: {
          id?: number;
          type: AlertType;
          url_name: string;
          payload?: Json;
          alert_day?: string;
          created_at?: string;
          notified_discord_at?: string | null;
        };
        Update: {
          id?: number;
          type?: AlertType;
          url_name?: string;
          payload?: Json;
          alert_day?: string;
          created_at?: string;
          notified_discord_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_url_name_fkey";
            columns: ["url_name"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["url_name"];
          },
        ];
      };
      watchlist: {
        Row: {
          url_name: string;
          created_at: string;
        };
        Insert: {
          url_name: string;
          created_at?: string;
        };
        Update: {
          url_name?: string;
          created_at?: string;
        };
        // No FK in migration — pins may exist before manifest sync
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    // App-level unions only; DB uses text CHECK constraints, not Postgres enums
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
