export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      action_rate_limits: {
        Row: {
          count: number
          kind: string
          user_id: string
          window_started_at: string
        }
        Insert: {
          count?: number
          kind: string
          user_id: string
          window_started_at?: string
        }
        Update: {
          count?: number
          kind?: string
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          session_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_log: {
        Row: {
          count: number
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          kind: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          content: Json
          date: string
          generated_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: Json
          date: string
          generated_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: Json
          date?: string
          generated_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          biceps_cm: number | null
          body_fat_pct: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          date: string
          height_cm: number | null
          hips_cm: number | null
          id: string
          neck_cm: number | null
          notes: string | null
          thigh_cm: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          biceps_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          neck_cm?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          biceps_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          neck_cm?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          body: string
          created_at: string
          evidence: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          evidence?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          evidence?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          pair_key: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pair_key?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pair_key?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reactions: {
        Row: {
          created_at: string
          emoji: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_notes: {
        Row: {
          exercise_id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_notes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
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
          aliases?: string[]
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
          aliases?: string[]
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
      friendships: {
        Row: {
          created_at: string
          id: string
          requested_by: string | null
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by?: string | null
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string | null
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_fkey"
            columns: ["user_b"]
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
          friend_code: string | null
          height_cm: number | null
          id: string
          last_streak_milestone: number
          locale: string
          onboarded_at: string | null
          share_activity: boolean
          time_zone: string
          training_location:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule: number[] | null
          training_since: string | null
          unit_system: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          body_fat_pct?: number | null
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          height_cm?: number | null
          id: string
          last_streak_milestone?: number
          locale?: string
          onboarded_at?: string | null
          share_activity?: boolean
          time_zone?: string
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule?: number[] | null
          training_since?: string | null
          unit_system?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          body_fat_pct?: number | null
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          height_cm?: number | null
          id?: string
          last_streak_milestone?: number
          locale?: string
          onboarded_at?: string | null
          share_activity?: boolean
          time_zone?: string
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          training_schedule?: number[] | null
          training_since?: string | null
          unit_system?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          storage_path: string
          taken_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
          taken_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
          taken_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_deliveries: {
        Row: {
          claimed_at: string
          kind: string
          local_date: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          kind: string
          local_date: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          kind?: string
          local_date?: string
          user_id?: string
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
      sleep_logs: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours: number
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_exercise_videos: {
        Row: {
          exercise_id: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_videos_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exercise_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          exercise_id: string
          id: string
          starting_e1rm: number
          target_date: string | null
          target_e1rm: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          starting_e1rm?: number
          target_date?: string | null
          target_e1rm: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          starting_e1rm?: number
          target_date?: string | null
          target_e1rm?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_goals_user_id_fkey"
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
          cardio_activity?:
            | Database["public"]["Enums"]["cardio_activity"]
            | null
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
          cardio_activity?:
            | Database["public"]["Enums"]["cardio_activity"]
            | null
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
      workout_templates: {
        Row: {
          created_at: string | null
          exercises: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_event_comment: {
        Args: { p_body: string; p_event_id: string }
        Returns: {
          author_id: string
          comment_id: string
        }[]
      }
      add_warmup_sets: {
        Args: {
          p_exercise_id: string
          p_session_id: string
          p_sets: Json
          p_starting_set_number: number
        }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "set_entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      are_connected: { Args: { a: string; b: string }; Returns: boolean }
      auto_finish_stale_sessions: {
        Args: { p_idle_hours?: number }
        Returns: {
          duration_minutes: number
          session_id: string
          user_id: string
        }[]
      }
      block_user: { Args: { p_target: string }; Returns: undefined }
      claim_reminder_delivery: {
        Args: { p_kind: string; p_local_date: string; p_user_id: string }
        Returns: boolean
      }
      claim_test_push: { Args: never; Returns: boolean }
      complete_onboarding: {
        Args: {
          p_location: Database["public"]["Enums"]["training_location"]
          p_schedule: number[]
          p_templates?: Json
        }
        Returns: undefined
      }
      consume_action_rate_limit: {
        Args: { p_kind: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      consume_ai_quota: { Args: { p_kind: string }; Returns: Json }
      consume_ai_quota_for: {
        Args: { p_kind: string; p_user_id: string }
        Returns: Json
      }
      delete_direct_message: { Args: { p_message: string }; Returns: undefined }
      delete_event_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      emit_activity_event: {
        Args: { p_payload: Json; p_session_id: string; p_type: string }
        Returns: undefined
      }
      ensure_friend_code: { Args: never; Returns: string }
      find_user_by_friend_code: {
        Args: { p_code: string }
        Returns: {
          friend_code: string
          id: string
        }[]
      }
      finish_my_stale_sessions: {
        Args: { p_idle_hours?: number }
        Returns: number
      }
      finish_workout: { Args: { p_session_id: string }; Returns: Json }
      get_activity_feed: {
        Args: { p_before?: string; p_days?: number; p_limit?: number }
        Returns: {
          author_id: string
          comment_count: number
          created_at: string
          display_name: string
          event_id: string
          friend_code: string
          is_live: boolean
          my_reactions: string[]
          payload: Json
          reactions: Json
          session_id: string
          type: string
        }[]
      }
      get_event_comments: {
        Args: { p_event_id: string }
        Returns: {
          body: string
          created_at: string
          display_name: string
          friend_code: string
          id: string
          user_id: string
        }[]
      }
      get_finished_session_dates: {
        Args: { p_user_id: string }
        Returns: {
          date: string
        }[]
      }
      get_finished_session_dates_bulk: {
        Args: { p_user_ids: string[] }
        Returns: {
          date: string
          user_id: string
        }[]
      }
      get_friends_with_stats: {
        Args: { p_days?: number }
        Returns: {
          best_weight_kg: number
          display_name: string
          friend_code: string
          friend_id: string
          is_in_gym: boolean
          last_workout_at: string
          total_sessions: number
          week_sessions: number
          week_tonnage_kg: number
        }[]
      }
      get_last_sets_for_exercises: {
        Args: { p_current_session: string; p_exercise_ids: string[] }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "set_entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_last_weights_for_exercises: {
        Args: { p_exercise_ids: string[] }
        Returns: {
          exercise_id: string
          weight_kg: number
        }[]
      }
      get_pending_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          friendship_id: string
          requester_code: string
          requester_id: string
          requester_name: string
        }[]
      }
      get_performed_exercise_ids: {
        Args: never
        Returns: {
          exercise_id: string
          last_performed_at: string
        }[]
      }
      get_recent_prs: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          achieved_at: string
          current_best: number
          exercise_id: string
          exercise_name: string
          exercise_name_ru: string
          improvement_pct: number
          previous_best: number
          reps: number
          weight_kg: number
        }[]
      }
      get_shared_workout: { Args: { p_token: string }; Returns: Json }
      get_thread: {
        Args: { p_before?: string; p_friend: string; p_limit?: number }
        Returns: {
          body: string
          created_at: string
          id: string
          is_mine: boolean
          read_at: string
          sender_id: string
        }[]
      }
      get_unread_counts: {
        Args: never
        Returns: {
          friend_id: string
          unread: number
        }[]
      }
      get_workout_lifetime_stats: {
        Args: never
        Returns: {
          total_sessions: number
          total_tonnage_kg: number
        }[]
      }
      is_valid_time_zone: { Args: { p_value: string }; Returns: boolean }
      mark_thread_read: { Args: { p_friend: string }; Returns: undefined }
      save_body_metrics: {
        Args: { p_height_cm: number; p_weight_kg: number }
        Returns: undefined
      }
      save_offline_set: {
        Args: {
          p_calculated_1rm: number
          p_client_mutation_id: string
          p_exercise_id: string
          p_reps: number
          p_rpe: number
          p_session_id: string
          p_set_number: number
          p_weight_kg: number
        }
        Returns: Json
      }
      save_workout_templates: { Args: { p_templates: Json }; Returns: number }
      search_exercises_fuzzy: {
        Args: { q: string }
        Returns: {
          aliases: string[]
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
        }[]
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_direct_message: {
        Args: { p_body: string; p_recipient: string }
        Returns: string
      }
      set_last_streak_milestone: {
        Args: { p_value: number }
        Returns: undefined
      }
      set_share_activity: { Args: { p_on: boolean }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_event_reaction: {
        Args: { p_emoji: string; p_event_id: string }
        Returns: {
          author_id: string
          reacted: boolean
        }[]
      }
      unblock_user: { Args: { p_target: string }; Returns: undefined }
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
        | "other"
        | "smith"
        | "ez_bar"
        | "kettlebell"
        | "band"
        | "plate"
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
      cardio_activity: [
        "running",
        "cycling",
        "walking",
        "swimming",
        "rowing",
        "elliptical",
        "hiit",
        "other",
      ],
      equipment_type: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
        "other",
        "smith",
        "ez_bar",
        "kettlebell",
        "band",
        "plate",
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

