// Generated from the live schema of project iokxjsvlpqlekptexjxy via the
// Supabase MCP `generate_typescript_types` tool on 2026-07-28 (after
// migration 019, then again after migration 022). Do not hand-edit —
// regenerate instead, the same way, so this never drifts from the real
// schema again (docs/BACKLOG.md item #31) — EXCEPT `game_options.Insert.
// starts_at`, deliberately widened to optional below. The generator only
// detects column-level DEFAULT, not the BEFORE INSERT trigger
// (fn_sync_game_option_times, migration 022) that actually populates it —
// regenerating verbatim would mark it required and break every insert that
// correctly omits it.
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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      conversation_members: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          unread_count: number | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_requester_id_fkey"
            columns: ["requester_id"]
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
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_options: {
        Row: {
          created_at: string | null
          date: string
          display_date: string
          end_time: string | null
          game_id: string
          id: string
          in_votes: number | null
          location: string
          maybe_votes: number | null
          out_votes: number | null
          proposed_by: string | null
          start_time: string
          starts_at: string
          ends_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          date: string
          display_date: string
          end_time?: string | null
          game_id: string
          id?: string
          in_votes?: number | null
          location: string
          maybe_votes?: number | null
          out_votes?: number | null
          proposed_by?: string | null
          start_time: string
          starts_at?: string
          ends_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          date?: string
          display_date?: string
          end_time?: string | null
          game_id?: string
          id?: string
          in_votes?: number | null
          location?: string
          maybe_votes?: number | null
          out_votes?: number | null
          proposed_by?: string | null
          start_time?: string
          starts_at?: string
          ends_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_options_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_options_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          game_id: string | null
          id: string
          joined_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          game_id?: string | null
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          game_id?: string | null
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          cancellation_reason: string | null
          confirmed_option_id: string | null
          cost_type: string
          created_at: string | null
          created_by: string
          current_players: number
          description: string | null
          game_type: string | null
          group_id: string | null
          id: string
          max_players: number | null
          min_players: number | null
          per_person_cost: number
          activity: string
          activity_color: string
          activity_emoji: string
          status: string
          title: string
          total_cost: number
          updated_at: string | null
          visibility: string | null
          voting_deadline: string
        }
        Insert: {
          cancellation_reason?: string | null
          confirmed_option_id?: string | null
          cost_type?: string
          created_at?: string | null
          created_by: string
          current_players?: number
          description?: string | null
          game_type?: string | null
          group_id?: string | null
          id?: string
          max_players?: number | null
          min_players?: number | null
          per_person_cost?: number
          activity: string
          activity_color: string
          activity_emoji: string
          status?: string
          title: string
          total_cost?: number
          updated_at?: string | null
          visibility?: string | null
          voting_deadline: string
        }
        Update: {
          cancellation_reason?: string | null
          confirmed_option_id?: string | null
          cost_type?: string
          created_at?: string | null
          created_by?: string
          current_players?: number
          description?: string | null
          game_type?: string | null
          group_id?: string | null
          id?: string
          max_players?: number | null
          min_players?: number | null
          per_person_cost?: number
          activity?: string
          activity_color?: string
          activity_emoji?: string
          status?: string
          title?: string
          total_cost?: number
          updated_at?: string | null
          visibility?: string | null
          voting_deadline?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_confirmed_option_id_fkey"
            columns: ["confirmed_option_id"]
            isOneToOne: false
            referencedRelation: "game_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          initials: string
          member_count: number
          name: string
          next_game: string | null
          activity: string | null
          activity_emoji: string
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          initials: string
          member_count?: number
          name: string
          next_game?: string | null
          activity?: string | null
          activity_emoji?: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          initials?: string
          member_count?: number
          name?: string
          next_game?: string | null
          activity?: string | null
          activity_emoji?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_system: boolean | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          attendance_rate: number
          avatar_url: string | null
          bio: string
          color: string
          created_at: string | null
          email: string
          games_played: number
          id: string
          initials: string
          name: string
          updated_at: string | null
          username: string | null
          weeks_played: number
        }
        Insert: {
          attendance_rate?: number
          avatar_url?: string | null
          bio?: string
          color: string
          created_at?: string | null
          email: string
          games_played?: number
          id: string
          initials: string
          name: string
          updated_at?: string | null
          username?: string | null
          weeks_played?: number
        }
        Update: {
          attendance_rate?: number
          avatar_url?: string | null
          bio?: string
          color?: string
          created_at?: string | null
          email?: string
          games_played?: number
          id?: string
          initials?: string
          name?: string
          updated_at?: string | null
          username?: string | null
          weeks_played?: number
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string | null
          reason: string | null
          updated_at: string | null
          user_id: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id?: string | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "game_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_timezone: { Args: never; Returns: string }
      auto_transition_all_games: { Args: never; Returns: number }
      auto_transition_game: { Args: { p_game_id: string }; Returns: undefined }
      create_game_with_options: {
        Args: {
          p_cost_type?: string
          p_description?: string
          p_game_type?: string
          p_group_id?: string
          p_invited_ids?: string[]
          p_max_players?: number
          p_min_players?: number
          p_options?: Json
          p_per_person_cost?: number
          p_activity: string
          p_activity_color?: string
          p_activity_emoji?: string
          p_title: string
          p_total_cost?: number
          p_visibility?: string
          p_voting_deadline?: string
        }
        Returns: string
      }
      user_in_conversation: { Args: { conv_id: string }; Returns: boolean }
      user_in_game: { Args: { p_game_id: string }; Returns: boolean }
      user_in_group: { Args: { p_group_id: string }; Returns: boolean }
      user_is_game_host: { Args: { p_game_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
