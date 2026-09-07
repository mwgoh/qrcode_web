export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          kind: string;
          content: string;
          fields: Json;
          options: Json;
          logo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          label?: string;
          kind: string;
          content: string;
          fields?: Json;
          options?: Json;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          kind?: string;
          content?: string;
          fields?: Json;
          options?: Json;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

export type QrCodeRow = Database["public"]["Tables"]["qr_codes"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
