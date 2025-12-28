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
      academy_courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution: string | null
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      academy_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          expires_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_ai_summaries: {
        Row: {
          class_id: string
          created_at: string
          id: string
          key_points: Json | null
          summary: string
          topics_covered: Json | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          key_points?: Json | null
          summary: string
          topics_covered?: Json | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          key_points?: Json | null
          summary?: string
          topics_covered?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "class_ai_summaries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_participants: {
        Row: {
          class_id: string
          duration_seconds: number | null
          id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_participants_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_purchases: {
        Row: {
          amount: number
          class_id: string
          id: string
          payment_id: string | null
          purchase_type: string
          purchased_at: string
          purchaser_email: string | null
          user_id: string
        }
        Insert: {
          amount: number
          class_id: string
          id?: string
          payment_id?: string | null
          purchase_type?: string
          purchased_at?: string
          purchaser_email?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          class_id?: string
          id?: string
          payment_id?: string | null
          purchase_type?: string
          purchased_at?: string
          purchaser_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_purchases_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      class_transcripts: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          speaker_id: string | null
          speaker_name: string | null
          timestamp_ms: number | null
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp_ms?: number | null
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "class_transcripts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          uploaded_by: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
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
      focus_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          settings: Json | null
          start_time: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          settings?: Json | null
          start_time: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          settings?: Json | null
          start_time?: string
          status?: string
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
      legal_alerts: {
        Row: {
          alert_type: string
          citation: string | null
          court: string | null
          created_at: string
          description: string | null
          id: string
          is_read: boolean | null
          published_date: string | null
          source_url: string | null
          title: string
        }
        Insert: {
          alert_type?: string
          citation?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean | null
          published_date?: string | null
          source_url?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          citation?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean | null
          published_date?: string | null
          source_url?: string | null
          title?: string
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
      live_classes: {
        Row: {
          course_id: string | null
          created_at: string
          daily_room_name: string | null
          daily_room_url: string | null
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_archived: boolean
          is_purchasable: boolean | null
          is_recurring: boolean | null
          live_class_price: number | null
          recording_duration_seconds: number | null
          recording_price: number | null
          recording_url: string | null
          recurrence_day: string | null
          recurrence_description: string | null
          recurrence_time: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_archived?: boolean
          is_purchasable?: boolean | null
          is_recurring?: boolean | null
          live_class_price?: number | null
          recording_duration_seconds?: number | null
          recording_price?: number | null
          recording_url?: string | null
          recurrence_day?: string | null
          recurrence_description?: string | null
          recurrence_time?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_archived?: boolean
          is_purchasable?: boolean | null
          is_recurring?: boolean | null
          live_class_price?: number | null
          recording_duration_seconds?: number | null
          recording_price?: number | null
          recording_url?: string | null
          recurrence_day?: string | null
          recurrence_description?: string | null
          recurrence_time?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
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
          bio: string | null
          cases_read: number | null
          created_at: string
          experience: string | null
          full_name: string | null
          id: string
          qualifications: string | null
          streak_days: number | null
          subjects: string[] | null
          tasks_completed: number | null
          total_study_hours: number | null
          university: string | null
          updated_at: string
          user_id: string
          year_of_study: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cases_read?: number | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          id?: string
          qualifications?: string | null
          streak_days?: number | null
          subjects?: string[] | null
          tasks_completed?: number | null
          total_study_hours?: number | null
          university?: string | null
          updated_at?: string
          user_id: string
          year_of_study?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cases_read?: number | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          id?: string
          qualifications?: string | null
          streak_days?: number | null
          subjects?: string[] | null
          tasks_completed?: number | null
          total_study_hours?: number | null
          university?: string | null
          updated_at?: string
          user_id?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
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
      recording_watch_history: {
        Row: {
          class_id: string
          completed: boolean
          created_at: string
          duration_seconds: number | null
          id: string
          last_watched_at: string
          progress_seconds: number
          user_id: string
        }
        Insert: {
          class_id: string
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          user_id: string
        }
        Update: {
          class_id?: string
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_watch_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      research_bookmarks: {
        Row: {
          created_at: string
          id: string
          query: string
          response: string
          sources: Json | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          response: string
          sources?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          response?: string
          sources?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_cache: {
        Row: {
          access_count: number
          cache_key: string
          created_at: string
          id: string
          jurisdiction: string
          last_verified_date: string
          research_output: string
          sources: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          cache_key: string
          created_at?: string
          id?: string
          jurisdiction: string
          last_verified_date?: string
          research_output: string
          sources?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          cache_key?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          last_verified_date?: string
          research_output?: string
          sources?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      stats_history: {
        Row: {
          cleared_at: string
          cleared_by: string | null
          dashboard_type: string
          id: string
          notes: string | null
          snapshot_date: string
          stats_data: Json
          user_id: string | null
        }
        Insert: {
          cleared_at?: string
          cleared_by?: string | null
          dashboard_type: string
          id?: string
          notes?: string | null
          snapshot_date?: string
          stats_data: Json
          user_id?: string | null
        }
        Update: {
          cleared_at?: string
          cleared_by?: string | null
          dashboard_type?: string
          id?: string
          notes?: string | null
          snapshot_date?: string
          stats_data?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          max_members: number | null
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_members?: number | null
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_members?: number | null
          name?: string
          subject?: string | null
          updated_at?: string
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
      tutor_applications: {
        Row: {
          called_to_bar: boolean | null
          created_at: string
          date_of_birth: string | null
          documents: Json | null
          email: string
          experience: string | null
          full_name: string
          id: string
          is_employed: boolean | null
          motivation: string | null
          preferred_teaching_times: string | null
          qualifications: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selected_courses: string[] | null
          sex: string | null
          status: string
          subjects: string[] | null
          target_students: string[] | null
          time_flexibility: string | null
          updated_at: string
          user_id: string
          years_at_bar: number | null
        }
        Insert: {
          called_to_bar?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json | null
          email: string
          experience?: string | null
          full_name: string
          id?: string
          is_employed?: boolean | null
          motivation?: string | null
          preferred_teaching_times?: string | null
          qualifications?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_courses?: string[] | null
          sex?: string | null
          status?: string
          subjects?: string[] | null
          target_students?: string[] | null
          time_flexibility?: string | null
          updated_at?: string
          user_id: string
          years_at_bar?: number | null
        }
        Update: {
          called_to_bar?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json | null
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          is_employed?: boolean | null
          motivation?: string | null
          preferred_teaching_times?: string | null
          qualifications?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_courses?: string[] | null
          sex?: string | null
          status?: string
          subjects?: string[] | null
          target_students?: string[] | null
          time_flexibility?: string | null
          updated_at?: string
          user_id?: string
          years_at_bar?: number | null
        }
        Relationships: []
      }
      tutor_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invitation_token: string
          invited_by: string | null
          selected_courses: string[] | null
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invitation_token: string
          invited_by?: string | null
          selected_courses?: string[] | null
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          selected_courses?: string[] | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tutor_updates: {
        Row: {
          class_link: string | null
          class_time: string | null
          content: string
          course_id: string
          created_at: string
          id: string
          is_published: boolean | null
          title: string
          tutor_id: string
          update_type: string | null
        }
        Insert: {
          class_link?: string | null
          class_time?: string | null
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          title: string
          tutor_id: string
          update_type?: string | null
        }
        Update: {
          class_link?: string | null
          class_time?: string | null
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          title?: string
          tutor_id?: string
          update_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_updates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
      user_legal_alert_reads: {
        Row: {
          alert_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_alert_reads_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "legal_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_research_limits: {
        Row: {
          created_at: string
          id: string
          query_count: number
          query_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query_count?: number
          query_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query_count?: number
          query_date?: string
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
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
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
