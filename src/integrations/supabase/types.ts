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
      game_entries: {
        Row: {
          bet: number
          created_at: string
          id: string
          note: string | null
          pattern_code: string
          result: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bet: number
          created_at?: string
          id?: string
          note?: string | null
          pattern_code: string
          result: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bet?: number
          created_at?: string
          id?: string
          note?: string | null
          pattern_code?: string
          result?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patterns: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          position: number
          rule: Json
          targets: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          position?: number
          rule?: Json
          targets?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          position?: number
          rule?: Json
          targets?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          player_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          player_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          player_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_live_spins: {
        Row: {
          created_at: string
          device_id: string
          id: string
          number: number
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          number: number
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          number?: number
        }
        Relationships: []
      }
      pull_rules: {
        Row: {
          created_at: string
          id: string
          min_count: number
          singleton: boolean
          top_n: number
          updated_at: string
          window_size: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_count?: number
          singleton?: boolean
          top_n?: number
          updated_at?: string
          window_size?: number
        }
        Update: {
          created_at?: string
          id?: string
          min_count?: number
          singleton?: boolean
          top_n?: number
          updated_at?: string
          window_size?: number
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          id: string
          name: string
          numbers: number[]
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          numbers?: number[]
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          numbers?: number[]
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      sheet_config: {
        Row: {
          created_at: string
          id: string
          sheet_name: string
          spreadsheet_id: string
          start_row: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sheet_name?: string
          spreadsheet_id: string
          start_row?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sheet_name?: string
          spreadsheet_id?: string
          start_row?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheet_pings: {
        Row: {
          created_at: string
          id: string
          numero: number | null
          rodada: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          numero?: number | null
          rodada?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          numero?: number | null
          rodada?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      sheet_webhook: {
        Row: {
          created_at: string
          id: string
          singleton: boolean
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          singleton?: boolean
          token?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          singleton?: boolean
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      spins: {
        Row: {
          color: string
          column_idx: number
          created_at: string
          dozen: number
          id: string
          number: number
          sector: string
          sheet_round: number | null
          source: string
          user_id: string
        }
        Insert: {
          color: string
          column_idx: number
          created_at?: string
          dozen: number
          id?: string
          number: number
          sector: string
          sheet_round?: number | null
          source?: string
          user_id: string
        }
        Update: {
          color?: string
          column_idx?: number
          created_at?: string
          dozen?: number
          id?: string
          number?: number
          sector?: string
          sheet_round?: number | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
