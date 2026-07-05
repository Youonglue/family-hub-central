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
      chore_completions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          chore_id: string
          completed_at: string
          id: string
          member_id: string
          owner_id: string
          points_awarded: number
          status: Database["public"]["Enums"]["chore_completion_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          chore_id: string
          completed_at?: string
          id?: string
          member_id: string
          owner_id: string
          points_awarded: number
          status?: Database["public"]["Enums"]["chore_completion_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          chore_id?: string
          completed_at?: string
          id?: string
          member_id?: string
          owner_id?: string
          points_awarded?: number
          status?: Database["public"]["Enums"]["chore_completion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "chore_completions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_points"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "chore_completions_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_points"
            referencedColumns: ["member_id"]
          },
        ]
      }
      chores: {
        Row: {
          active: boolean
          created_at: string
          id: string
          member_id: string | null
          owner_id: string
          points: number
          recurrence: Database["public"]["Enums"]["chore_recurrence"]
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          member_id?: string | null
          owner_id: string
          points?: number
          recurrence?: Database["public"]["Enums"]["chore_recurrence"]
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          member_id?: string | null
          owner_id?: string
          points?: number
          recurrence?: Database["public"]["Enums"]["chore_recurrence"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_points"
            referencedColumns: ["member_id"]
          },
        ]
      }
      events: {
        Row: {
          color: string | null
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          member_id: string | null
          owner_id: string
          starts_at: string
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          member_id?: string | null
          owner_id: string
          starts_at: string
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          member_id?: string | null
          owner_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_points"
            referencedColumns: ["member_id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_color: string
          created_at: string
          id: string
          is_kid: boolean
          is_parent: boolean
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_kid?: boolean
          is_parent?: boolean
          name: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_kid?: boolean
          is_parent?: boolean
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      meal_plan: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          meal: Database["public"]["Enums"]["meal_type"]
          owner_id: string
          plan_date: string
          recipe_id: string | null
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          owner_id: string
          plan_date: string
          recipe_id?: string | null
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          owner_id?: string
          plan_date?: string
          recipe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          ingredients: Json
          name: string
          notes: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients?: Json
          name: string
          notes?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients?: Json
          name?: string
          notes?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          member_id: string
          owner_id: string
          points_spent: number
          redeemed_at: string
          reward_id: string
        }
        Insert: {
          id?: string
          member_id: string
          owner_id: string
          points_spent: number
          redeemed_at?: string
          reward_id: string
        }
        Update: {
          id?: string
          member_id?: string
          owner_id?: string
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_points"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          cost_points: number
          created_at: string
          icon: string | null
          id: string
          owner_id: string
          title: string
        }
        Insert: {
          active?: boolean
          cost_points?: number
          created_at?: string
          icon?: string | null
          id?: string
          owner_id: string
          title: string
        }
        Update: {
          active?: boolean
          cost_points?: number
          created_at?: string
          icon?: string | null
          id?: string
          owner_id?: string
          title?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          category: string | null
          checked: boolean
          checked_at: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          quantity: string | null
        }
        Insert: {
          category?: string | null
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          quantity?: string | null
        }
        Update: {
          category?: string | null
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          quantity?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      member_points: {
        Row: {
          avatar_color: string | null
          balance: number | null
          is_kid: boolean | null
          is_parent: boolean | null
          member_id: string | null
          name: string | null
          owner_id: string | null
          week_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chore_completion_status: "pending" | "approved" | "rejected"
      chore_recurrence: "daily" | "weekly" | "once"
      meal_type: "breakfast" | "lunch" | "dinner"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      chore_completion_status: ["pending", "approved", "rejected"],
      chore_recurrence: ["daily", "weekly", "once"],
      meal_type: ["breakfast", "lunch", "dinner"],
    },
  },
} as const
