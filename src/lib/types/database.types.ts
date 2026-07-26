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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          id: string
          image_urls: string[] | null
          instructions_en: string | null
          instructions_ru: string | null
          is_custom: boolean
          mechanic: string
          name: string
          name_ru: string | null
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles: Database["public"]["Enums"]["muscle_group"][]
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          id?: string
          image_urls?: string[] | null
          instructions_en?: string | null
          instructions_ru?: string | null
          is_custom?: boolean
          mechanic: string
          name: string
          name_ru?: string | null
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          image_urls?: string[] | null
          instructions_en?: string | null
          instructions_ru?: string | null
          is_custom?: boolean
          mechanic?: string
          name?: string
          name_ru?: string | null
          primary_muscle?: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          body_fat_pct: number | null
          created_at: string
          display_name: string | null
          height_cm: number | null
          id: string
          last_streak_milestone: number
          locale: string
          share_activity: boolean
          training_location:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule: number[] | null
          training_since: string | null
          time_zone: string
          unit_system: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          body_fat_pct?: number | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id: string
          last_streak_milestone?: number
          locale?: string
          share_activity?: boolean
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule?: number[] | null
          training_since?: string | null
          time_zone?: string
          unit_system?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          body_fat_pct?: number | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id?: string
          last_streak_milestone?: number
          locale?: string
          share_activity?: boolean
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule?: number[] | null
          training_since?: string | null
          time_zone?: string
          unit_system?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      set_entries: {
        Row: {
          calculated_1rm: number | null
          client_mutation_id: string | null
          created_at: string
          exercise_id: string
          id: string
          is_warmup: boolean
          reps: number
          rest_seconds: number | null
          rpe: number | null
          session_id: string
          set_number: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          calculated_1rm?: number | null
          client_mutation_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          is_warmup?: boolean
          reps: number
          rest_seconds?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          user_id: string
          weight_kg: number
        }
        Update: {
          calculated_1rm?: number | null
          client_mutation_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          is_warmup?: boolean
          reps?: number
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          ai_debrief: Json | null
          cardio_activity: Database["public"]["Enums"]["cardio_activity"] | null
          cardio_avg_hr: number | null
          cardio_calories: number | null
          cardio_distance_km: number | null
          cardio_duration_seconds: number | null
          created_at: string
          finished_at: string | null
          id: string
          mood_score: number | null
          notes: string | null
          session_type: string
          started_at: string
          total_volume_kg: number
          user_id: string
        }
        Insert: {
          ai_debrief?: Json | null
          cardio_activity?: Database["public"]["Enums"]["cardio_activity"] | null
          cardio_avg_hr?: number | null
          cardio_calories?: number | null
          cardio_distance_km?: number | null
          cardio_duration_seconds?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          session_type?: string
          started_at?: string
          total_volume_kg?: number
          user_id: string
        }
        Update: {
          ai_debrief?: Json | null
          cardio_activity?: Database["public"]["Enums"]["cardio_activity"] | null
          cardio_avg_hr?: number | null
          cardio_calories?: number | null
          cardio_distance_km?: number | null
          cardio_duration_seconds?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          session_type?: string
          started_at?: string
          total_volume_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_shares: {
        Row: {
          created_at: string
          revoked_at: string | null
          session_id: string
          snapshot: Json
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          revoked_at?: string | null
          session_id: string
          snapshot: Json
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          revoked_at?: string | null
          session_id?: string
          snapshot?: Json
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_workout: {
        Args: { p_token: string }
        Returns: Json
      }
      claim_reminder_delivery: {
        Args: { p_user_id: string; p_kind: string; p_local_date: string }
        Returns: boolean
      }
      consume_ai_quota: {
        Args: { p_kind: string }
        Returns: Json
      }
      claim_test_push: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      complete_onboarding: {
        Args: {
          p_location: Database["public"]["Enums"]["training_location"] | null
          p_schedule: number[]
          p_templates: Json
        }
        Returns: undefined
      }
      add_warmup_sets: {
        Args: {
          p_exercise_id: string
          p_session_id: string
          p_sets: Json
          p_starting_set_number: number
        }
        Returns: Database["public"]["Tables"]["set_entries"]["Row"][]
      }
      finish_workout: {
        Args: { p_session_id: string }
        Returns: Json
      }
      finish_my_stale_sessions: {
        Args: { p_idle_hours?: number }
        Returns: number
      }
      get_last_sets_for_exercises: {
        Args: {
          p_current_session: string
          p_exercise_ids: string[]
        }
        Returns: Database["public"]["Tables"]["set_entries"]["Row"][]
      }
      get_performed_exercise_ids: {
        Args: Record<PropertyKey, never>
        Returns: Array<{ exercise_id: string; last_performed_at: string }>
      }
      get_last_weights_for_exercises: {
        Args: { p_exercise_ids: string[] }
        Returns: Array<{ exercise_id: string; weight_kg: number }>
      }
      get_finished_session_dates: {
        Args: { p_user_id: string }
        Returns: Array<{ date: string }>
      }
      save_workout_templates: {
        Args: { p_templates: Json }
        Returns: number
      }
      save_offline_set: {
        Args: {
          p_calculated_1rm: number | null
          p_client_mutation_id: string
          p_exercise_id: string
          p_reps: number
          p_rpe: number | null
          p_session_id: string
          p_set_number: number
          p_weight_kg: number
        }
        Returns: Json
      }
      save_body_metrics: {
        Args: {
          p_height_cm: number
          p_weight_kg: number
        }
        Returns: undefined
      }
    }
    Enums: {
      cardio_activity:
        | "running"
        | "cycling"
        | "walking"
        | "swimming"
        | "rowing"
        | "elliptical"
        | "hiit"
        | "other"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "machine"
        | "cable"
        | "bodyweight"
        | "smith"
        | "ez_bar"
        | "kettlebell"
        | "band"
        | "plate"
        | "other"
      muscle_group:
        | "chest"
        | "back"
        | "biceps"
        | "triceps"
        | "forearms"
        | "core"
        | "quads"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "traps"
        | "lats"
        | "rear_delts"
        | "front_delts"
        | "side_delts"
        | "cardio"
      training_location: "gym" | "home" | "both"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      equipment_type: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
        "smith",
        "ez_bar",
        "kettlebell",
        "band",
        "plate",
        "other",
      ],
      muscle_group: [
        "chest",
        "back",
        "biceps",
        "triceps",
        "forearms",
        "core",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "traps",
        "lats",
        "rear_delts",
        "front_delts",
        "side_delts",
        "cardio",
      ],
      training_location: ["gym", "home", "both"],
    },
  },
} as const
