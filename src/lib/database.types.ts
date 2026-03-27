export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          username: string | null;
          initials: string;
          color: string;
          bio: string;
          avatar_url: string | null;
          games_played: number;
          weeks_played: number;
          attendance_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at" | "games_played" | "weeks_played" | "attendance_rate"> & {
          games_played?: number;
          weeks_played?: number;
          attendance_rate?: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          sport: string;
          sport_emoji: string;
          color: string;
          member_count: number;
          next_game: string | null;
          initials: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["groups"]["Row"], "created_at" | "member_count"> & {
          member_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["group_members"]["Row"], "id" | "joined_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_members"]["Insert"]>;
      };
      games: {
        Row: {
          id: string;
          title: string;
          sport: string;
          sport_emoji: string;
          sport_color: string;
          status: "proposal" | "confirmed" | "completed" | "cancelled";
          game_type: "Casual" | "Competitive";
          max_players: number;
          current_players: number;
          created_by: string;
          group_id: string;
          voting_deadline: string;
          total_cost: number;
          per_person_cost: number;
          confirmed_option_id: string | null;
          description: string | null;
          visibility: "Public" | "Group Only" | "Private";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["games"]["Row"], "created_at" | "updated_at" | "current_players"> & {
          current_players?: number;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
      };
      game_options: {
        Row: {
          id: string;
          game_id: string;
          date: string;
          display_date: string;
          start_time: string;
          end_time: string;
          location: string;
          in_votes: number;
          maybe_votes: number;
          out_votes: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["game_options"]["Row"], "created_at" | "in_votes" | "maybe_votes" | "out_votes"> & {
          in_votes?: number;
          maybe_votes?: number;
          out_votes?: number;
        };
        Update: Partial<Database["public"]["Tables"]["game_options"]["Insert"]>;
      };
      votes: {
        Row: {
          id: string;
          option_id: string;
          user_id: string;
          value: "in" | "maybe" | "out";
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["votes"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
      };
      game_players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          status: "joined" | "invited" | "declined";
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["game_players"]["Row"], "id" | "joined_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_players"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at" | "is_system"> & {
          id?: string;
          is_system?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          type: "direct" | "group";
          group_id: string | null;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversations"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          unread_count: number;
          last_read_at: string;
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversation_members"]["Row"], "id" | "joined_at" | "unread_count" | "last_read_at"> & {
          id?: string;
          unread_count?: number;
          last_read_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_members"]["Insert"]>;
      };
    };
  };
}
