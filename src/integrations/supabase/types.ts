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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accountability_partners: {
        Row: {
          created_at: string
          id: string
          partner_email: string
          partner_name: string | null
          relationship: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_email: string
          partner_name?: string | null
          relationship?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_email?: string
          partner_name?: string | null
          relationship?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          cards: Json
          created_at: string
          id: string
          last_reviewed_at: string | null
          mastered_count: number | null
          next_review_at: string | null
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          cards?: Json
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          mastered_count?: number | null
          next_review_at?: string | null
          subject: string
          title: string
          user_id: string
        }
        Update: {
          cards?: Json
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          mastered_count?: number | null
          next_review_at?: string | null
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean | null
          lumina_response: string | null
          mood: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          lumina_response?: string | null
          mood?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          lumina_response?: string | null
          mood?: string | null
          user_id?: string
        }
        Relationships: []
      }
      library_content: {
        Row: {
          citation: string | null
          content_text: string | null
          content_type: string
          court: string | null
          created_at: string
          created_by: string | null
          description: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          subject: string
          tags: string[] | null
          title: string
          updated_at: string
          year: string | null
        }
        Insert: {
          citation?: string | null
          content_text?: string | null
          content_type?: string
          court?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          subject: string
          tags?: string[] | null
          title: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          citation?: string | null
          content_text?: string | null
          content_type?: string
          court?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          subject?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          phone_number: string | null
          product_id: string | null
          product_type: string
          provider: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          phone_number?: string | null
          product_id?: string | null
          product_type: string
          provider?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          phone_number?: string | null
          product_id?: string | null
          product_type?: string
          provider?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cases_read: number | null
          created_at: string
          full_name: string | null
          id: string
          streak_days: number | null
          tasks_completed: number | null
          total_study_hours: number | null
          university: string | null
          updated_at: string
          user_id: string
          year_of_study: number | null
        }
        Insert: {
          avatar_url?: string | null
          cases_read?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          streak_days?: number | null
          tasks_completed?: number | null
          total_study_hours?: number | null
          university?: string | null
          updated_at?: string
          user_id: string
          year_of_study?: number | null
        }
        Update: {
          avatar_url?: string | null
          cases_read?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          streak_days?: number | null
          tasks_completed?: number | null
          total_study_hours?: number | null
          university?: string | null
          updated_at?: string
          user_id?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          questions: Json
          score: number | null
          subject: string
          title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          questions?: Json
          score?: number | null
          subject: string
          title: string
          total_questions?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          questions?: Json
          score?: number | null
          subject?: string
          title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          completed: boolean | null
          duration_minutes: number
          ended_at: string | null
          id: string
          mode: string | null
          started_at: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          mode?: string | null
          started_at?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          mode?: string | null
          started_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      study_tasks: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          scheduled_date: string | null
          scheduled_time: string | null
          task_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          task_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          task_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
