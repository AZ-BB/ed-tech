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
      acitivity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          created_by_type: Database["public"]["Enums"]["activity_log_entity_type"]
          entitiy_type: string
          entity_id: string
          id: number
          message: string
          school_admin_id: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          created_by_type: Database["public"]["Enums"]["activity_log_entity_type"]
          entitiy_type: string
          entity_id: string
          id?: number
          message: string
          school_admin_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          created_by_type?: Database["public"]["Enums"]["activity_log_entity_type"]
          entitiy_type?: string
          entity_id?: string
          id?: number
          message?: string
          school_admin_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acitivity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acitivity_logs_school_admin_id_fkey"
            columns: ["school_admin_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acitivity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["admin_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      advisor_payouts: {
        Row: {
          advisor_id: string
          amount: number
          application_id: number
          created_at: string
          id: number
          paid_at: string | null
          payment_id: number
          percentage: number
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          advisor_id: string
          amount: number
          application_id: number
          created_at?: string
          id?: number
          paid_at?: string | null
          payment_id: number
          percentage: number
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          amount?: number
          application_id?: number
          created_at?: string
          id?: number
          paid_at?: string | null
          payment_id?: number
          percentage?: number
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_payouts_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_payouts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_sessions: {
        Row: {
          advisor_id: string
          booked_at: string | null
          created_at: string | null
          current_stage: string
          destination_country_code: string
          help_with: string | null
          id: number
          specific_uni: string | null
          status: Database["public"]["Enums"]["advisor_session_status"] | null
          student_email: string | null
          student_id: string
          student_name: string | null
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          booked_at?: string | null
          created_at?: string | null
          current_stage: string
          destination_country_code: string
          help_with?: string | null
          id?: number
          specific_uni?: string | null
          status?: Database["public"]["Enums"]["advisor_session_status"] | null
          student_email?: string | null
          student_id: string
          student_name?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          booked_at?: string | null
          created_at?: string | null
          current_stage?: string
          destination_country_code?: string
          help_with?: string | null
          id?: number
          specific_uni?: string | null
          status?: Database["public"]["Enums"]["advisor_session_status"] | null
          student_email?: string | null
          student_id?: string
          student_name?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_sessions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_sessions_destination_country_code_fkey"
            columns: ["destination_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_specializations_countries: {
        Row: {
          advisor_id: string
          country_code: string
          created_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          country_code: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          country_code?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_specializations_countries_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_specializations_countries_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_tags: {
        Row: {
          created_at: string | null
          id: number
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      advisor_tags_joint: {
        Row: {
          advisor_id: string
          created_at: string | null
          id: number
          tag_id: number
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          id?: number
          tag_id: number
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          id?: number
          tag_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_tags_joint_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_tags_joint_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "advisor_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_notification_reads: {
        Row: {
          advisor_id: string
          notification_id: string
          read_at: string
        }
        Insert: {
          advisor_id: string
          notification_id: string
          read_at?: string
        }
        Update: {
          advisor_id?: string
          notification_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_notification_reads_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "advisor_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_notifications: {
        Row: {
          advisor_id: string
          application_id: number | null
          body: string | null
          created_at: string
          event_type: string
          id: string
          link_path: string | null
          source_id: string
          source_table: string
          student_id: string
          title: string
        }
        Insert: {
          advisor_id: string
          application_id?: number | null
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          link_path?: string | null
          source_id: string
          source_table: string
          student_id: string
          title: string
        }
        Update: {
          advisor_id?: string
          application_id?: number | null
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link_path?: string | null
          source_id?: string
          source_table?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_notifications_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisors: {
        Row: {
          about: string | null
          avatar_url: string | null
          best_for: string | null
          created_at: string | null
          description: string | null
          email: string
          experience_years: number | null
          first_name: string
          id: string
          is_active: boolean
          languages: string | null
          last_name: string
          nationality_country_code: string
          payout_percentage: number
          phone: string | null
          questions: Json | null
          session_coverage: Json | null
          session_for: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          best_for?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          experience_years?: number | null
          first_name: string
          id?: string
          is_active?: boolean
          languages?: string | null
          last_name: string
          nationality_country_code: string
          payout_percentage?: number
          phone?: string | null
          questions?: Json | null
          session_coverage?: Json | null
          session_for?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          best_for?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          experience_years?: number | null
          first_name?: string
          id?: string
          is_active?: boolean
          languages?: string | null
          last_name?: string
          nationality_country_code?: string
          payout_percentage?: number
          phone?: string | null
          questions?: Json | null
          session_coverage?: Json | null
          session_for?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_nationality_country_code_fkey"
            columns: ["nationality_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          cost: number
          created_at: string | null
          id: number
          inputs: Json
          model: string
          outputs: Json
          student_id: string
          tokens: number
          type: Database["public"]["Enums"]["ai_usage_type"] | null
          updated_at: string | null
        }
        Insert: {
          cost: number
          created_at?: string | null
          id?: number
          inputs: Json
          model: string
          outputs: Json
          student_id: string
          tokens: number
          type?: Database["public"]["Enums"]["ai_usage_type"] | null
          updated_at?: string | null
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: number
          inputs?: Json
          model?: string
          outputs?: Json
          student_id?: string
          tokens?: number
          type?: Database["public"]["Enums"]["ai_usage_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_session_requests: {
        Row: {
          ambassador_id: string
          created_at: string | null
          discussion_topics: string | null
          id: number
          pref_time_1: string
          pref_time_2: string | null
          pref_time_3: string | null
          status:
            | Database["public"]["Enums"]["ambassador_session_request_status"]
            | null
          student_email: string | null
          student_id: string
          student_name: string | null
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          ambassador_id: string
          created_at?: string | null
          discussion_topics?: string | null
          id?: number
          pref_time_1: string
          pref_time_2?: string | null
          pref_time_3?: string | null
          status?:
            | Database["public"]["Enums"]["ambassador_session_request_status"]
            | null
          student_email?: string | null
          student_id: string
          student_name?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          ambassador_id?: string
          created_at?: string | null
          discussion_topics?: string | null
          id?: number
          pref_time_1?: string
          pref_time_2?: string | null
          pref_time_3?: string | null
          status?:
            | Database["public"]["Enums"]["ambassador_session_request_status"]
            | null
          student_email?: string | null
          student_id?: string
          student_name?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_session_requests_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_session_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_specific_requests: {
        Row: {
          additional_notes: string | null
          assigned_ambassador_id: string | null
          created_at: string | null
          external_ambassador_email: string | null
          external_ambassador_full_name: string | null
          external_ambassador_linkedin: string | null
          external_ambassador_overview: string | null
          id: number
          preferred_major: string | null
          status: string
          student_email: string
          student_id: string
          student_name: string
          student_phone: string
          target_university: string
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          assigned_ambassador_id?: string | null
          created_at?: string | null
          external_ambassador_email?: string | null
          external_ambassador_full_name?: string | null
          external_ambassador_linkedin?: string | null
          external_ambassador_overview?: string | null
          id?: number
          preferred_major?: string | null
          status?: string
          student_email: string
          student_id: string
          student_name: string
          student_phone: string
          target_university: string
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          assigned_ambassador_id?: string | null
          created_at?: string | null
          external_ambassador_email?: string | null
          external_ambassador_full_name?: string | null
          external_ambassador_linkedin?: string | null
          external_ambassador_overview?: string | null
          id?: number
          preferred_major?: string | null
          status?: string
          student_email?: string
          student_id?: string
          student_name?: string
          student_phone?: string
          target_university?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_specific_requests_assigned_ambassador_id_fkey"
            columns: ["assigned_ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_specific_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_tags: {
        Row: {
          created_at: string | null
          id: number
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ambassador_tags_joint: {
        Row: {
          ambassador_id: string
          created_at: string | null
          id: number
          tag_id: number
          updated_at: string | null
        }
        Insert: {
          ambassador_id: string
          created_at?: string | null
          id?: number
          tag_id: number
          updated_at?: string | null
        }
        Update: {
          ambassador_id?: string
          created_at?: string | null
          id?: number
          tag_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_tags_joint_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_tags_joint_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ambassador_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          about: string | null
          avatar_url: string | null
          created_at: string | null
          destination_country_code: string
          email: string
          first_name: string
          graduation_year: number | null
          has_msc: boolean
          has_phd: boolean
          help_in: Json | null
          id: string
          is_active: boolean
          is_current_student: boolean
          last_name: string
          major: string | null
          nationality_country_code: string
          start_year: number | null
          university_id: string | null
          university_name: string | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string | null
          destination_country_code: string
          email: string
          first_name: string
          graduation_year?: number | null
          has_msc?: boolean
          has_phd?: boolean
          help_in?: Json | null
          id?: string
          is_active?: boolean
          is_current_student?: boolean
          last_name: string
          major?: string | null
          nationality_country_code: string
          start_year?: number | null
          university_id?: string | null
          university_name?: string | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string | null
          destination_country_code?: string
          email?: string
          first_name?: string
          graduation_year?: number | null
          has_msc?: boolean
          has_phd?: boolean
          help_in?: Json | null
          id?: string
          is_active?: boolean
          is_current_student?: boolean
          last_name?: string
          major?: string | null
          nationality_country_code?: string
          start_year?: number | null
          university_id?: string | null
          university_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassadors_destination_country_code_fkey"
            columns: ["destination_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassadors_nationality_country_code_fkey"
            columns: ["nationality_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassadors_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      application_calls: {
        Row: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id: string | null
          call_date: string
          call_type: string
          created_at: string
          duration_minutes: number
          id: string
          outcome: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id?: string | null
          call_date: string
          call_type: string
          created_at?: string
          duration_minutes: number
          id?: string
          outcome?: string | null
          status: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: number
          author_name?: string
          author_role?: string
          author_user_id?: string | null
          call_date?: string
          call_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          outcome?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_calls_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_checklist_documents: {
        Row: {
          application_id: number
          created_at: string
          display_name: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          requested_at: string | null
          reviewed_at: string | null
          slot_key: string
          sort_order: number
          status: string
          updated_at: string
          uploaded_at: string | null
          url: string | null
        }
        Insert: {
          application_id: number
          created_at?: string
          display_name: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          slot_key: string
          sort_order?: number
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Update: {
          application_id?: number
          created_at?: string
          display_name?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          slot_key?: string
          sort_order?: number
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_checklist_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_internal_notes: {
        Row: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id: string | null
          content: string
          created_at: string
          id: string
          student_id: string
          visibility: string
        }
        Insert: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id?: string | null
          content: string
          created_at?: string
          id?: string
          student_id: string
          visibility?: string
        }
        Update: {
          application_id?: number
          author_name?: string
          author_role?: string
          author_user_id?: string | null
          content?: string
          created_at?: string
          id?: string
          student_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_internal_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_internal_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_tasks: {
        Row: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id: string | null
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          priority: string
          source_call_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_id: number
          author_name: string
          author_role: string
          author_user_id?: string | null
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          priority?: string
          source_call_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: number
          author_name?: string
          author_role?: string
          author_user_id?: string | null
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          priority?: string
          source_call_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_tasks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_tasks_source_call_id_fkey"
            columns: ["source_call_id"]
            isOneToOne: false
            referencedRelation: "application_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      application_university_document_files: {
        Row: {
          checklist_document_id: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          requirement_id: string
          source_type: string
          updated_at: string
          uploaded_at: string | null
          url: string | null
        }
        Insert: {
          checklist_document_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          requirement_id: string
          source_type: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Update: {
          checklist_document_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          requirement_id?: string
          source_type?: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_university_document_file_checklist_document_id_fkey"
            columns: ["checklist_document_id"]
            isOneToOne: false
            referencedRelation: "application_checklist_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_university_document_files_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: true
            referencedRelation: "application_university_document_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      application_university_document_requirements: {
        Row: {
          created_at: string
          display_name: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["university_doc_requirement_status"]
          university_target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["university_doc_requirement_status"]
          university_target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["university_doc_requirement_status"]
          university_target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_university_document_requi_university_target_id_fkey"
            columns: ["university_target_id"]
            isOneToOne: false
            referencedRelation: "application_university_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      application_university_targets: {
        Row: {
          application_id: number
          country_code: string | null
          created_at: string
          deadline: string | null
          decision: Database["public"]["Enums"]["university_target_decision"]
          id: string
          notes: string | null
          portal_url: string | null
          program: string | null
          sort_order: number
          status: Database["public"]["Enums"]["university_target_status"]
          university_id: string | null
          university_name: string
          updated_at: string
        }
        Insert: {
          application_id: number
          country_code?: string | null
          created_at?: string
          deadline?: string | null
          decision?: Database["public"]["Enums"]["university_target_decision"]
          id?: string
          notes?: string | null
          portal_url?: string | null
          program?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["university_target_status"]
          university_id?: string | null
          university_name: string
          updated_at?: string
        }
        Update: {
          application_id?: number
          country_code?: string | null
          created_at?: string
          deadline?: string | null
          decision?: Database["public"]["Enums"]["university_target_decision"]
          id?: string
          notes?: string | null
          portal_url?: string | null
          program?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["university_target_status"]
          university_id?: string | null
          university_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_university_targets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_university_targets_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_university_targets_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          act: number | null
          additional_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          awards: string | null
          blocked_at: string | null
          created_at: string | null
          curriculum:
            | Database["public"]["Enums"]["application_curriculum_type"]
            | null
          expected_graduation_year: number | null
          extracurricular_activities: string
          final_grade: string
          gpa: number | null
          id: number
          ielts: number | null
          in_progress_at: string | null
          inteended_fields: string
          open_to_realted_fields: boolean
          package_data: Json
          payment_completed_at: string | null
          payment_in_progress_at: string | null
          plan_id: number
          preferences_universities: Json | null
          preferences_universities_notes: string | null
          preferred_uni_or_countries: string
          sat: number | null
          scheduled_at: string | null
          school_id: string | null
          school_name: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_email: string | null
          student_id: string
          student_name: string | null
          student_phone: string | null
          submitted_at: string | null
          toefl: number | null
          updated_at: string | null
        }
        Insert: {
          act?: number | null
          additional_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          awards?: string | null
          blocked_at?: string | null
          created_at?: string | null
          curriculum?:
            | Database["public"]["Enums"]["application_curriculum_type"]
            | null
          expected_graduation_year?: number | null
          extracurricular_activities: string
          final_grade: string
          gpa?: number | null
          id?: number
          ielts?: number | null
          in_progress_at?: string | null
          inteended_fields: string
          open_to_realted_fields?: boolean
          package_data?: Json
          payment_completed_at?: string | null
          payment_in_progress_at?: string | null
          plan_id: number
          preferences_universities?: Json | null
          preferences_universities_notes?: string | null
          preferred_uni_or_countries: string
          sat?: number | null
          scheduled_at?: string | null
          school_id?: string | null
          school_name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_email?: string | null
          student_id: string
          student_name?: string | null
          student_phone?: string | null
          submitted_at?: string | null
          toefl?: number | null
          updated_at?: string | null
        }
        Update: {
          act?: number | null
          additional_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          awards?: string | null
          blocked_at?: string | null
          created_at?: string | null
          curriculum?:
            | Database["public"]["Enums"]["application_curriculum_type"]
            | null
          expected_graduation_year?: number | null
          extracurricular_activities?: string
          final_grade?: string
          gpa?: number | null
          id?: number
          ielts?: number | null
          in_progress_at?: string | null
          inteended_fields?: string
          open_to_realted_fields?: boolean
          package_data?: Json
          payment_completed_at?: string | null
          payment_in_progress_at?: string | null
          plan_id?: number
          preferences_universities?: Json | null
          preferences_universities_notes?: string | null
          preferred_uni_or_countries?: string
          sat?: number | null
          scheduled_at?: string | null
          school_id?: string | null
          school_name?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_email?: string | null
          student_id?: string
          student_name?: string | null
          student_phone?: string | null
          submitted_at?: string | null
          toefl?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "applications_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean
          is_most_popular: boolean
          name: string
          price: number
          universities_count: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          is_most_popular?: boolean
          name: string
          price: number
          universities_count: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          is_most_popular?: boolean
          name?: string
          price?: number
          universities_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: Database["public"]["Enums"]["contact_submission_status"]
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: Database["public"]["Enums"]["contact_submission_status"]
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: Database["public"]["Enums"]["contact_submission_status"]
          subject?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      majors: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_items: {
        Row: {
          created_at: string | null
          id: number
          tag: Database["public"]["Enums"]["news_tag"]
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          tag: Database["public"]["Enums"]["news_tag"]
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          tag?: Database["public"]["Enums"]["news_tag"]
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          application_id: number
          created_at: string | null
          custom_universities_count: number | null
          due_date: string | null
          id: number
          paid_at: string | null
          payment_request_sent_at: string | null
          payment_request_token: string | null
          requested_by_advisor_id: string | null
          requested_by_type: string | null
          requested_plan_id: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_checkout_session_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          application_id: number
          created_at?: string | null
          custom_universities_count?: number | null
          due_date?: string | null
          id?: number
          paid_at?: string | null
          payment_request_sent_at?: string | null
          payment_request_token?: string | null
          requested_by_advisor_id?: string | null
          requested_by_type?: string | null
          requested_plan_id?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_checkout_session_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          application_id?: number
          created_at?: string | null
          custom_universities_count?: number | null
          due_date?: string | null
          id?: number
          paid_at?: string | null
          payment_request_sent_at?: string | null
          payment_request_token?: string | null
          requested_by_advisor_id?: string | null
          requested_by_type?: string | null
          requested_plan_id?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_checkout_session_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_requested_by_advisor_id_fkey"
            columns: ["requested_by_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "applications_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          id: number
          major_id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          major_id: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          major_id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_destinations: {
        Row: {
          country_code: string
          created_at: string | null
          id: number
          scholarship_id: string
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: number
          scholarship_id: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: number
          scholarship_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_destinations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_destinations_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          academic_eligibility: string | null
          application_fee: number | null
          city: string | null
          competition:
            | Database["public"]["Enums"]["scholarship_competition_type"]
            | null
          coverage: string | null
          created_at: string | null
          deadline: string | null
          deadline_date: string | null
          description: string | null
          discovery_payload: Json | null
          discovery_slug: string | null
          docuemnts: Json | null
          documents: Json | null
          fields: Json | null
          id: string
          ielts_min_score: number | null
          intakes: string | null
          is_active: boolean
          is_priority: boolean
          is_renewable: boolean
          level: string | null
          living_stipend: string | null
          method: string | null
          name: string
          nationality_country_code: string
          other: string | null
          other_benefits: string | null
          sat_policy: string | null
          target_students: string | null
          toefl_min_score: number | null
          tooltip: string | null
          travel: string | null
          tuition: string | null
          tuition_type: Database["public"]["Enums"]["tuition_type"] | null
          type: Database["public"]["Enums"]["scholarship_type"] | null
          updated_at: string | null
        }
        Insert: {
          academic_eligibility?: string | null
          application_fee?: number | null
          city?: string | null
          competition?:
            | Database["public"]["Enums"]["scholarship_competition_type"]
            | null
          coverage?: string | null
          created_at?: string | null
          deadline?: string | null
          deadline_date?: string | null
          description?: string | null
          discovery_payload?: Json | null
          discovery_slug?: string | null
          docuemnts?: Json | null
          documents?: Json | null
          fields?: Json | null
          id?: string
          ielts_min_score?: number | null
          intakes?: string | null
          is_active?: boolean
          is_priority?: boolean
          is_renewable?: boolean
          level?: string | null
          living_stipend?: string | null
          method?: string | null
          name: string
          nationality_country_code: string
          other?: string | null
          other_benefits?: string | null
          sat_policy?: string | null
          target_students?: string | null
          toefl_min_score?: number | null
          tooltip?: string | null
          travel?: string | null
          tuition?: string | null
          tuition_type?: Database["public"]["Enums"]["tuition_type"] | null
          type?: Database["public"]["Enums"]["scholarship_type"] | null
          updated_at?: string | null
        }
        Update: {
          academic_eligibility?: string | null
          application_fee?: number | null
          city?: string | null
          competition?:
            | Database["public"]["Enums"]["scholarship_competition_type"]
            | null
          coverage?: string | null
          created_at?: string | null
          deadline?: string | null
          deadline_date?: string | null
          description?: string | null
          discovery_payload?: Json | null
          discovery_slug?: string | null
          docuemnts?: Json | null
          documents?: Json | null
          fields?: Json | null
          id?: string
          ielts_min_score?: number | null
          intakes?: string | null
          is_active?: boolean
          is_priority?: boolean
          is_renewable?: boolean
          level?: string | null
          living_stipend?: string | null
          method?: string | null
          name?: string
          nationality_country_code?: string
          other?: string | null
          other_benefits?: string | null
          sat_policy?: string | null
          target_students?: string | null
          toefl_min_score?: number | null
          tooltip?: string | null
          travel?: string | null
          tuition?: string | null
          tuition_type?: Database["public"]["Enums"]["tuition_type"] | null
          type?: Database["public"]["Enums"]["scholarship_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_nationality_country_code_fkey"
            columns: ["nationality_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admin_notification_reads: {
        Row: {
          admin_id: string
          notification_id: string
          read_at: string
        }
        Insert: {
          admin_id: string
          notification_id: string
          read_at?: string
        }
        Update: {
          admin_id?: string
          notification_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_admin_notification_reads_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admin_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "school_admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          link_path: string | null
          school_id: string
          source_id: string
          source_table: string
          student_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          link_path?: string | null
          school_id: string
          source_id: string
          source_table: string
          student_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link_path?: string | null
          school_id?: string
          source_id?: string
          source_table?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_admin_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_admin_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_admin_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_recharge_history: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          kind: Database["public"]["Enums"]["school_recharge_kind"]
          school_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: number
          kind?: Database["public"]["Enums"]["school_recharge_kind"]
          school_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: number
          kind?: Database["public"]["Enums"]["school_recharge_kind"]
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_recharge_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          created_at: string | null
          email: string
          grade: string | null
          id: string
          school_id: string
          signed_up: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          grade?: string | null
          id?: string
          school_id: string
          signed_up?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          grade?: string | null
          id?: string
          school_id?: string
          signed_up?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          code: string
          contact_email: string
          country_code: string
          created_at: string | null
          credit_pool: number | null
          default_advisor_credit_limit: number | null
          default_ambasador_credit_limit: number | null
          id: string
          is_active: boolean
          name: string
          renewal_date: string | null
          students_limit: number | null
          subscription_status: Database["public"]["Enums"]["school_subscription_status"]
          updated_at: string | null
          yearly_credit_plan: number | null
        }
        Insert: {
          city?: string | null
          code: string
          contact_email: string
          country_code: string
          created_at?: string | null
          credit_pool?: number | null
          default_advisor_credit_limit?: number | null
          default_ambasador_credit_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          renewal_date?: string | null
          students_limit?: number | null
          subscription_status?: Database["public"]["Enums"]["school_subscription_status"]
          updated_at?: string | null
          yearly_credit_plan?: number | null
        }
        Update: {
          city?: string | null
          code?: string
          contact_email?: string
          country_code?: string
          created_at?: string | null
          credit_pool?: number | null
          default_advisor_credit_limit?: number | null
          default_ambasador_credit_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          renewal_date?: string | null
          students_limit?: number | null
          subscription_status?: Database["public"]["Enums"]["school_subscription_status"]
          updated_at?: string | null
          yearly_credit_plan?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activities: {
        Row: {
          advisor_id: string | null
          ambassador_id: string | null
          created_at: string | null
          entity_type: Database["public"]["Enums"]["student_activity_entity_type"]
          id: number
          scholarship_id: string | null
          student_id: string
          type: Database["public"]["Enums"]["student_activity_type"] | null
          uni_id: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          ambassador_id?: string | null
          created_at?: string | null
          entity_type: Database["public"]["Enums"]["student_activity_entity_type"]
          id?: number
          scholarship_id?: string | null
          student_id: string
          type?: Database["public"]["Enums"]["student_activity_type"] | null
          uni_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          ambassador_id?: string | null
          created_at?: string | null
          entity_type?: Database["public"]["Enums"]["student_activity_entity_type"]
          id?: number
          scholarship_id?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["student_activity_type"] | null
          uni_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activities_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_uni_id_fkey"
            columns: ["uni_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_application_profile: {
        Row: {
          act_score: string | null
          budget_range: string | null
          created_at: string
          curriculum: string | null
          english_test_scores: string | null
          grade: string | null
          ielts_score: string | null
          interested_programs: string[]
          need_based_aid: string | null
          other_tests: string | null
          predicted_grades: string | null
          predicted_grades_set_by_school: boolean
          preferred_destinations: string[]
          sat_act_scores: string | null
          sat_score: string | null
          student_id: string
          target_intake: string | null
          toefl_score: string | null
          updated_at: string
        }
        Insert: {
          act_score?: string | null
          budget_range?: string | null
          created_at?: string
          curriculum?: string | null
          english_test_scores?: string | null
          grade?: string | null
          ielts_score?: string | null
          interested_programs?: string[]
          need_based_aid?: string | null
          other_tests?: string | null
          predicted_grades?: string | null
          predicted_grades_set_by_school?: boolean
          preferred_destinations?: string[]
          sat_act_scores?: string | null
          sat_score?: string | null
          student_id: string
          target_intake?: string | null
          toefl_score?: string | null
          updated_at?: string
        }
        Update: {
          act_score?: string | null
          budget_range?: string | null
          created_at?: string
          curriculum?: string | null
          english_test_scores?: string | null
          grade?: string | null
          ielts_score?: string | null
          interested_programs?: string[]
          need_based_aid?: string | null
          other_tests?: string | null
          predicted_grades?: string | null
          predicted_grades_set_by_school?: boolean
          preferred_destinations?: string[]
          sat_act_scores?: string | null
          sat_score?: string | null
          student_id?: string
          target_intake?: string | null
          toefl_score?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_application_profile_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_counselor_interactions: {
        Row: {
          author_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interaction_kind: string
          notes: string
          occurred_on: string
          outcome: string
          platform_admin_id: string | null
          student_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interaction_kind: string
          notes: string
          occurred_on: string
          outcome: string
          platform_admin_id?: string | null
          student_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interaction_kind?: string
          notes?: string
          occurred_on?: string
          outcome?: string
          platform_admin_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_counselor_interactions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_counselor_interactions_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_counselor_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_credits_history: {
        Row: {
          advisor_session_id: number | null
          ambassador_session_request_id: number | null
          amount: number
          assigned_by_admin_id: string | null
          assigned_by_school_admin_id: string | null
          created_at: string | null
          id: number
          school_id: string
          status: Database["public"]["Enums"]["student_credits_status"] | null
          student_id: string
          type: Database["public"]["Enums"]["student_credits_type"]
          updated_at: string | null
        }
        Insert: {
          advisor_session_id?: number | null
          ambassador_session_request_id?: number | null
          amount: number
          assigned_by_admin_id?: string | null
          assigned_by_school_admin_id?: string | null
          created_at?: string | null
          id?: number
          school_id: string
          status?: Database["public"]["Enums"]["student_credits_status"] | null
          student_id: string
          type: Database["public"]["Enums"]["student_credits_type"]
          updated_at?: string | null
        }
        Update: {
          advisor_session_id?: number | null
          ambassador_session_request_id?: number | null
          amount?: number
          assigned_by_admin_id?: string | null
          assigned_by_school_admin_id?: string | null
          created_at?: string | null
          id?: number
          school_id?: string
          status?: Database["public"]["Enums"]["student_credits_status"] | null
          student_id?: string
          type?: Database["public"]["Enums"]["student_credits_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_credits_history_advisor_session_id_fkey"
            columns: ["advisor_session_id"]
            isOneToOne: false
            referencedRelation: "advisor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_history_ambassador_session_request_id_fkey"
            columns: ["ambassador_session_request_id"]
            isOneToOne: false
            referencedRelation: "ambassador_session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_history_assigned_by_admin_id_fkey"
            columns: ["assigned_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_history_assigned_by_school_admin_id_fkey"
            columns: ["assigned_by_school_admin_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credits_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_my_application_documents: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          file_name: string | null
          id: string
          school_text_value: string | null
          slot_key: string
          status: string
          storage_path: string | null
          student_id: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          file_name?: string | null
          id?: string
          school_text_value?: string | null
          slot_key: string
          status?: string
          storage_path?: string | null
          student_id: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          file_name?: string | null
          id?: string
          school_text_value?: string | null
          slot_key?: string
          status?: string
          storage_path?: string | null
          student_id?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_my_application_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_my_application_essay_comments: {
        Row: {
          author_display_name: string
          author_id: string
          body: string
          created_at: string
          essay_id: string
          id: string
        }
        Insert: {
          author_display_name?: string
          author_id: string
          body: string
          created_at?: string
          essay_id: string
          id?: string
        }
        Update: {
          author_display_name?: string
          author_id?: string
          body?: string
          created_at?: string
          essay_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_my_application_essay_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_my_application_essay_comments_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "student_my_application_essays"
            referencedColumns: ["id"]
          },
        ]
      }
      student_my_application_essays: {
        Row: {
          body: string
          created_at: string
          deadline: string | null
          essay_prompt: string | null
          essay_type: string | null
          file_name: string | null
          file_storage_path: string | null
          file_uploaded_at: string | null
          for_application: string | null
          id: string
          instructions_note: string | null
          last_edited_at: string | null
          limit_note: string | null
          requirement_note: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body?: string
          created_at?: string
          deadline?: string | null
          essay_prompt?: string | null
          essay_type?: string | null
          file_name?: string | null
          file_storage_path?: string | null
          file_uploaded_at?: string | null
          for_application?: string | null
          id?: string
          instructions_note?: string | null
          last_edited_at?: string | null
          limit_note?: string | null
          requirement_note?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          deadline?: string | null
          essay_prompt?: string | null
          essay_type?: string | null
          file_name?: string | null
          file_storage_path?: string | null
          file_uploaded_at?: string | null
          for_application?: string | null
          id?: string
          instructions_note?: string | null
          last_edited_at?: string | null
          limit_note?: string | null
          requirement_note?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_my_application_essays_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_my_application_recommendations: {
        Row: {
          created_at: string
          for_application: string
          id: string
          letter_file_name: string | null
          letter_storage_path: string | null
          needed_by: string
          personal_note: string | null
          requested_at: string
          status: string
          student_id: string
          submit_token: string
          submitted_at: string | null
          submitter_notes: string | null
          teacher_email: string
          teacher_name: string
          teacher_subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          for_application: string
          id?: string
          letter_file_name?: string | null
          letter_storage_path?: string | null
          needed_by: string
          personal_note?: string | null
          requested_at?: string
          status?: string
          student_id: string
          submit_token?: string
          submitted_at?: string | null
          submitter_notes?: string | null
          teacher_email: string
          teacher_name: string
          teacher_subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          for_application?: string
          id?: string
          letter_file_name?: string | null
          letter_storage_path?: string | null
          needed_by?: string
          personal_note?: string | null
          requested_at?: string
          status?: string
          student_id?: string
          submit_token?: string
          submitted_at?: string | null
          submitter_notes?: string | null
          teacher_email?: string
          teacher_name?: string
          teacher_subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_my_application_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_my_application_tasks: {
        Row: {
          assigned_by_name: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by_name?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by_name?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_my_application_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          note_type: string
          notes: string | null
          priority: string | null
          student_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          note_type: string
          notes?: string | null
          priority?: string | null
          student_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          notes?: string | null
          priority?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          advisor_credit_limit: number | null
          ambassador_credit_limit: number | null
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          flagged: boolean
          flagged_by: string | null
          grade: string
          id: string
          is_active: boolean
          last_name: string
          nationality_country_code: string
          notification_app_updates: boolean
          notification_news_platform: boolean
          phone: string | null
          platform_completion: Json | null
          school_id: string
          signup_advisor_credit_limit: number | null
          signup_ambassador_credit_limit: number | null
          status: Database["public"]["Enums"]["student_status"] | null
          teacher_id: string | null
          total_logins: number | null
          updated_at: string | null
        }
        Insert: {
          advisor_credit_limit?: number | null
          ambassador_credit_limit?: number | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          flagged?: boolean
          flagged_by?: string | null
          grade: string
          id: string
          is_active?: boolean
          last_name: string
          nationality_country_code: string
          notification_app_updates?: boolean
          notification_news_platform?: boolean
          phone?: string | null
          platform_completion?: Json | null
          school_id: string
          signup_advisor_credit_limit?: number | null
          signup_ambassador_credit_limit?: number | null
          status?: Database["public"]["Enums"]["student_status"] | null
          teacher_id?: string | null
          total_logins?: number | null
          updated_at?: string | null
        }
        Update: {
          advisor_credit_limit?: number | null
          ambassador_credit_limit?: number | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          flagged?: boolean
          flagged_by?: string | null
          grade?: string
          id?: string
          is_active?: boolean
          last_name?: string
          nationality_country_code?: string
          notification_app_updates?: boolean
          notification_news_platform?: boolean
          phone?: string | null
          platform_completion?: Json | null
          school_id?: string
          signup_advisor_credit_limit?: number | null
          signup_ambassador_credit_limit?: number | null
          status?: Database["public"]["Enums"]["student_status"] | null
          teacher_id?: string | null
          total_logins?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_nationality_country_code_fkey"
            columns: ["nationality_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_shortlist_universities: {
        Row: {
          application_deadline: string | null
          application_method: string | null
          catalog_university_id: string | null
          country: string | null
          created_at: string
          decision: string | null
          docs_status: string
          essay_status: string
          id: string
          major_program: string | null
          sort_order: number
          status: string
          student_id: string
          university_name: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          application_method?: string | null
          catalog_university_id?: string | null
          country?: string | null
          created_at?: string
          decision?: string | null
          docs_status?: string
          essay_status?: string
          id?: string
          major_program?: string | null
          sort_order?: number
          status?: string
          student_id: string
          university_name: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          application_method?: string | null
          catalog_university_id?: string | null
          country?: string | null
          created_at?: string
          decision?: string | null
          docs_status?: string
          essay_status?: string
          id?: string
          major_program?: string | null
          sort_order?: number
          status?: string
          student_id?: string
          university_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_shortlist_universities_catalog_university_id_fkey"
            columns: ["catalog_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_shortlist_universities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system: {
        Row: {
          created_at: string | null
          id: number
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: number
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          acceptance_rate: number | null
          address: string | null
          admission_page_url: string | null
          application_fee: number | null
          city: string
          country_code: string
          cover_image_url: string | null
          created_at: string | null
          deadline_date: string | null
          description: string | null
          difficulty:
            | Database["public"]["Enums"]["university_difficulty"]
            | null
          documents: Json | null
          email: string | null
          estimated_living_cost_per_year: number | null
          id: string
          ielts_min_score: number | null
          intakes: string | null
          intl_students: number | null
          is_active: boolean
          is_priority: boolean
          is_public: boolean
          is_scholarship_available: boolean
          living_display: string | null
          logo_url: string | null
          method: string | null
          name: string
          phone: string | null
          ranking: number | null
          sat_policy: string | null
          search_region_rank: number | null
          state: string | null
          temp_meta_data: Json | null
          toefl_min_score: number | null
          tuition_display: string | null
          tuition_per_year: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          address?: string | null
          admission_page_url?: string | null
          application_fee?: number | null
          city: string
          country_code: string
          cover_image_url?: string | null
          created_at?: string | null
          deadline_date?: string | null
          description?: string | null
          difficulty?:
            | Database["public"]["Enums"]["university_difficulty"]
            | null
          documents?: Json | null
          email?: string | null
          estimated_living_cost_per_year?: number | null
          id?: string
          ielts_min_score?: number | null
          intakes?: string | null
          intl_students?: number | null
          is_active?: boolean
          is_priority?: boolean
          is_public?: boolean
          is_scholarship_available?: boolean
          living_display?: string | null
          logo_url?: string | null
          method?: string | null
          name: string
          phone?: string | null
          ranking?: number | null
          sat_policy?: string | null
          search_region_rank?: number | null
          state?: string | null
          temp_meta_data?: Json | null
          toefl_min_score?: number | null
          tuition_display?: string | null
          tuition_per_year?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          address?: string | null
          admission_page_url?: string | null
          application_fee?: number | null
          city?: string
          country_code?: string
          cover_image_url?: string | null
          created_at?: string | null
          deadline_date?: string | null
          description?: string | null
          difficulty?:
            | Database["public"]["Enums"]["university_difficulty"]
            | null
          documents?: Json | null
          email?: string | null
          estimated_living_cost_per_year?: number | null
          id?: string
          ielts_min_score?: number | null
          intakes?: string | null
          intl_students?: number | null
          is_active?: boolean
          is_priority?: boolean
          is_public?: boolean
          is_scholarship_available?: boolean
          living_display?: string | null
          logo_url?: string | null
          method?: string | null
          name?: string
          phone?: string | null
          ranking?: number | null
          sat_policy?: string | null
          search_region_rank?: number | null
          state?: string | null
          temp_meta_data?: Json | null
          toefl_min_score?: number | null
          tuition_display?: string | null
          tuition_per_year?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "universities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      university_major_programs: {
        Row: {
          created_at: string | null
          id: number
          program_id: number
          university_major_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          program_id: number
          university_major_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          program_id?: number
          university_major_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_major_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_major_programs_university_major_id_fkey"
            columns: ["university_major_id"]
            isOneToOne: false
            referencedRelation: "university_majors"
            referencedColumns: ["id"]
          },
        ]
      }
      university_majors: {
        Row: {
          created_at: string | null
          id: number
          major_id: number
          university_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          major_id: number
          university_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          major_id?: number
          university_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_majors_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_majors_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_shortlist_top_stats: {
        Args: { p_top_n?: number }
        Returns: Json
      }
      admin_report_shortlist_top_stats: {
        Args: {
          p_end?: string
          p_school_id?: string
          p_start?: string
          p_top_n?: number
        }
        Returns: Json
      }
      admin_students_at_risk: {
        Args: { p_limit?: number; p_school_id?: string }
        Returns: Json
      }
      advisor_can_read_application: {
        Args: { p_application_id: number }
        Returns: boolean
      }
      advisor_can_read_school: {
        Args: { p_school_id: string }
        Returns: boolean
      }
      advisor_can_read_student_profile: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      advisor_dashboard: {
        Args: never
        Returns: Json
      }
      advisor_students_table_rows: {
        Args: never
        Returns: {
          deadline_risk_label: string
          deadline_risk_level: string
          destinations: Json
          initial_meeting_date: string
          latest_updated_at: string
          management_status: string
          package_purchased: string
          school_name: string
          student_email: string
          student_id: string
          student_name: string
        }[]
      }
      create_school_admin_notification: {
        Args: {
          p_body?: string
          p_event_type: string
          p_source_id?: string
          p_source_table?: string
          p_student_id: string
        }
        Returns: undefined
      }
      current_advisor_id: { Args: never; Returns: string }
      current_school_admin_school_id: { Args: never; Returns: string }
      process_university_import_meta_batch: {
        Args: { p_limit?: number }
        Returns: number
      }
      renew_school_subscription: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      rpc_scholarships_discovery_page: {
        Args: {
          p_bucket?: string
          p_cov?: string
          p_dest?: string
          p_home_alpha2?: string
          p_limit?: number
          p_nat?: string
          p_offset?: number
          p_q?: string
          p_saved_ids?: string[]
        }
        Returns: Json
      }
      run_school_subscription_expiry: { Args: never; Returns: number }
      scholarship_discovery_dest_match: {
        Args: { p_dest: Json; p_user: string }
        Returns: boolean
      }
      scholarship_discovery_nat_match: {
        Args: { p_elig: Json; p_user: string }
        Returns: boolean
      }
      school_dashboard_shortlist_top_stats: {
        Args: { p_teacher_id?: string; p_top_n?: number }
        Returns: Json
      }
      school_student_follow_up_issue: {
        Args: {
          p_no_activity_30_days: boolean
          p_no_shortlist: boolean
          p_profile_percent: number
        }
        Returns: string
      }
      school_student_follow_up_status: {
        Args: { p_student_id: string }
        Returns: Json
      }
      school_student_grade_priority: {
        Args: { p_grade: string }
        Returns: number
      }
      school_students_needing_follow_up: {
        Args: { p_limit?: number; p_school_id?: string; p_teacher_id?: string }
        Returns: Json
      }
      student_application_profile_completion_pct: {
        Args: {
          p_act_score: string
          p_curriculum: string
          p_english_test_scores: string
          p_grade: string
          p_ielts_score: string
          p_interested_programs: string[]
          p_preferred_destinations: string[]
          p_sat_act_scores: string
          p_sat_score: string
          p_toefl_score: string
        }
        Returns: number
      }
      sync_university_programs_from_meta: {
        Args: { p_meta: Json; p_university_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_log_entity_type: "student" | "school_admin" | "admin"
      admin_role: "super_admin" | "admin" | "moderator"
      advisor_session_status:
        | "pending"
        | "completed"
        | "cancelled"
        | "confirmed"
      ai_usage_type: "matching" | "essay_review"
      ambassador_session_request_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "rescheduled"
      application_curriculum_type:
        | "ib"
        | "a_level"
        | "american"
        | "french"
        | "indian"
        | "national"
        | "other"
      application_document_type:
        | "passport"
        | "transcript"
        | "english_test_result"
        | "personal_statement"
        | "recommendation_letter"
        | "cv"
        | "certificate"
        | "award"
        | "portfolio"
      application_status:
        | "new"
        | "scheduled"
        | "payment_in_progress"
        | "payment_completed"
        | "in_progress"
        | "blocked"
        | "submitted"
      contact_submission_status: "new" | "read" | "archived"
      gender: "male" | "female"
      news_tag: "visa" | "deadline" | "update"
      payment_status: "pending" | "paid" | "failed"
      payout_status: "pending" | "paid" | "canceled"
      scholarship_competition_type: "low" | "medium" | "high" | "very_high"
      scholarship_type:
        | "government"
        | "university"
        | "corporate"
        | "foundation"
        | "other"
      school_recharge_kind: "YEARLY_SUB" | "EXTRA"
      school_subscription_status: "ACTIVE" | "INACTIVE"
      student_activity_entity_type:
        | "university"
        | "scholarship"
        | "advisor"
        | "ambassador"
      student_activity_type: "save" | "shortlist" | "block" | "viewed"
      student_credits_status: "used" | "refunded" | "added"
      student_credits_type:
        | "advisor"
        | "ambassador"
        | "base_credit"
        | "extra_credits"
      student_status: "high_priority" | "at_risk" | "missing_docs"
      tuition_type: "full" | "partial"
      university_difficulty: "easy" | "medium" | "hard"
      university_doc_requirement_status:
        | "not_started"
        | "in_progress"
        | "complete"
        | "not_required"
      university_target_decision:
        | "not_submitted"
        | "awaiting_decision"
        | "offer_received"
        | "rejected"
        | "waitlist"
      university_target_status:
        | "shortlisted"
        | "considering"
        | "advisor_recommended"
        | "documents_needed"
        | "in_progress"
        | "ready_to_submit"
        | "submitted"
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
      activity_log_entity_type: ["student", "school_admin", "admin"],
      admin_role: ["super_admin", "admin", "moderator"],
      advisor_session_status: [
        "pending",
        "completed",
        "cancelled",
        "confirmed",
      ],
      ai_usage_type: ["matching", "essay_review"],
      ambassador_session_request_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "rescheduled",
      ],
      application_curriculum_type: [
        "ib",
        "a_level",
        "american",
        "french",
        "indian",
        "national",
        "other",
      ],
      application_document_type: [
        "passport",
        "transcript",
        "english_test_result",
        "personal_statement",
        "recommendation_letter",
        "cv",
        "certificate",
        "award",
        "portfolio",
      ],
      application_status: [
        "new",
        "scheduled",
        "payment_in_progress",
        "payment_completed",
        "in_progress",
        "blocked",
        "submitted",
      ],
      contact_submission_status: ["new", "read", "archived"],
      gender: ["male", "female"],
      news_tag: ["visa", "deadline", "update"],
      payment_status: ["pending", "paid", "failed"],
      payout_status: ["pending", "paid", "canceled"],
      scholarship_competition_type: ["low", "medium", "high", "very_high"],
      scholarship_type: [
        "government",
        "university",
        "corporate",
        "foundation",
        "other",
      ],
      school_recharge_kind: ["YEARLY_SUB", "EXTRA"],
      school_subscription_status: ["ACTIVE", "INACTIVE"],
      student_activity_entity_type: [
        "university",
        "scholarship",
        "advisor",
        "ambassador",
      ],
      student_activity_type: ["save", "shortlist", "block", "viewed"],
      student_credits_status: ["used", "refunded", "added"],
      student_credits_type: [
        "advisor",
        "ambassador",
        "base_credit",
        "extra_credits",
      ],
      student_status: ["high_priority", "at_risk", "missing_docs"],
      tuition_type: ["full", "partial"],
      university_difficulty: ["easy", "medium", "hard"],
      university_doc_requirement_status: [
        "not_started",
        "in_progress",
        "complete",
        "not_required",
      ],
      university_target_decision: [
        "not_submitted",
        "awaiting_decision",
        "offer_received",
        "rejected",
        "waitlist",
      ],
      university_target_status: [
        "shortlisted",
        "considering",
        "advisor_recommended",
        "documents_needed",
        "in_progress",
        "ready_to_submit",
        "submitted",
      ],
    },
  },
} as const
