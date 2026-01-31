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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string | null
          criteria: string | null
          description: string | null
          icon_url: string | null
          id: string
          mentor_id: string
          name: string
          points_required: number | null
        }
        Insert: {
          created_at?: string | null
          criteria?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          mentor_id: string
          name: string
          points_required?: number | null
        }
        Update: {
          created_at?: string | null
          criteria?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          mentor_id?: string
          name?: string
          points_required?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_questions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          mentor_id: string
          options: Json
          order_index: number | null
          question_text: string
          question_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mentor_id: string
          options: Json
          order_index?: number | null
          question_text: string
          question_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mentor_id?: string
          options?: Json
          order_index?: number | null
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_questions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_reports: {
        Row: {
          challenges: Json | null
          communication_style: string | null
          disc_profile: Json | null
          enneagram_type: number | null
          full_report: string | null
          generated_at: string | null
          id: string
          mentorado_id: string
          sales_recommendations: Json | null
          strengths: Json | null
          updated_at: string | null
        }
        Insert: {
          challenges?: Json | null
          communication_style?: string | null
          disc_profile?: Json | null
          enneagram_type?: number | null
          full_report?: string | null
          generated_at?: string | null
          id?: string
          mentorado_id: string
          sales_recommendations?: Json | null
          strengths?: Json | null
          updated_at?: string | null
        }
        Update: {
          challenges?: Json | null
          communication_style?: string | null
          disc_profile?: Json | null
          enneagram_type?: number | null
          full_report?: string | null
          generated_at?: string | null
          id?: string
          mentorado_id?: string
          sales_recommendations?: Json | null
          strengths?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_reports_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: true
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_responses: {
        Row: {
          created_at: string | null
          id: string
          mentorado_id: string
          question_id: string
          selected_option: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentorado_id: string
          question_id: string
          selected_option: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          mentorado_id?: string
          question_id?: string
          selected_option?: Json
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_responses_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioral_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "behavioral_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_analyses: {
        Row: {
          created_at: string | null
          id: string
          objections_handled: Json | null
          objections_missed: Json | null
          score: number | null
          strengths: Json | null
          suggestions: Json | null
          summary: string | null
          transcript_id: string
          weaknesses: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          objections_handled?: Json | null
          objections_missed?: Json | null
          score?: number | null
          strengths?: Json | null
          suggestions?: Json | null
          summary?: string | null
          transcript_id: string
          weaknesses?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          objections_handled?: Json | null
          objections_missed?: Json | null
          score?: number | null
          strengths?: Json | null
          suggestions?: Json | null
          summary?: string | null
          transcript_id?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_analyses_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: true
            referencedRelation: "call_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          call_date: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          mentorado_id: string
          status: string | null
          title: string | null
          transcript_text: string
          updated_at: string | null
        }
        Insert: {
          call_date?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentorado_id: string
          status?: string | null
          title?: string | null
          transcript_text: string
          updated_at?: string | null
        }
        Update: {
          call_date?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentorado_id?: string
          status?: string | null
          title?: string | null
          transcript_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          id: string
          issued_at: string | null
          mentorado_id: string
          trail_id: string
        }
        Insert: {
          certificate_url?: string | null
          id?: string
          issued_at?: string | null
          mentorado_id: string
          trail_id: string
        }
        Update: {
          certificate_url?: string | null
          id?: string
          issued_at?: string | null
          mentorado_id?: string
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          outcome: string | null
          prospection_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          outcome?: string | null
          prospection_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          outcome?: string | null
          prospection_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "crm_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          mentor_id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          stage: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          mentor_id: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          mentor_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospections: {
        Row: {
          ai_insights: Json | null
          company: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          id: string
          mentorado_id: string
          notes: string | null
          points: number | null
          screenshot_urls: string[] | null
          status: string | null
          temperature: string | null
          updated_at: string | null
        }
        Insert: {
          ai_insights?: Json | null
          company?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          mentorado_id: string
          notes?: string | null
          points?: number | null
          screenshot_urls?: string[] | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_insights?: Json | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          mentorado_id?: string
          notes?: string | null
          points?: number | null
          screenshot_urls?: string[] | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospections_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          mentor_id: string
          template_id: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mentor_id: string
          template_id: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mentor_id?: string
          template_id?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          automation_id: string | null
          clicked_at: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_id: string
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          automation_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_id: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          automation_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "email_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          id: string
          mentor_id: string
          merge_tags: Json | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          id?: string
          mentor_id: string
          merge_tags?: Json | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          id?: string
          mentor_id?: string
          merge_tags?: Json | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          attended: boolean | null
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          meeting_id: string
          mentorado_id: string
        }
        Insert: {
          attended?: boolean | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          meeting_id: string
          mentorado_id: string
        }
        Update: {
          attended?: boolean | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string
          mentorado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_recordings: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          lesson_id: string | null
          meeting_id: string
          recording_url: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          meeting_id: string
          recording_url: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          meeting_id?: string
          recording_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "trail_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_recordings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_type: string | null
          meeting_url: string | null
          mentor_id: string
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          meeting_url?: string | null
          mentor_id: string
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          meeting_url?: string | null
          mentor_id?: string
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorado_business_profiles: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string | null
          id: string
          ideal_client_profile: string | null
          main_offer: string | null
          mentorado_id: string
          pain_points_solved: string[] | null
          price_range: string | null
          target_audience: string | null
          unique_value_proposition: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          ideal_client_profile?: string | null
          main_offer?: string | null
          mentorado_id: string
          pain_points_solved?: string[] | null
          price_range?: string | null
          target_audience?: string | null
          unique_value_proposition?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          ideal_client_profile?: string | null
          main_offer?: string | null
          mentorado_id?: string
          pain_points_solved?: string[] | null
          price_range?: string | null
          target_audience?: string | null
          unique_value_proposition?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorado_business_profiles_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: true
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorados: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          mentor_id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          mentor_id: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          mentor_id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorados_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          bio: string | null
          business_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ranking_entries: {
        Row: {
          created_at: string | null
          id: string
          mentorado_id: string
          period_end: string | null
          period_start: string | null
          period_type: string | null
          points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentorado_id: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentorado_id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_entries_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_requests: {
        Row: {
          created_at: string | null
          description: string
          id: string
          meeting_id: string | null
          mentorado_id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          meeting_id?: string | null
          mentorado_id: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          meeting_id?: string | null
          mentorado_id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_requests_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_responses: {
        Row: {
          created_at: string | null
          id: string
          message: string
          request_id: string
          responder_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          request_id: string
          responder_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          request_id?: string
          responder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sos_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_lessons: {
        Row: {
          content_text: string | null
          content_type: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "trail_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_modules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_index: number | null
          title: string
          trail_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          title: string
          trail_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          title?: string
          trail_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_modules_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          mentorado_id: string
          progress_percent: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          mentorado_id: string
          progress_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          mentorado_id?: string
          progress_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "trail_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_progress_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          mentor_id: string
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          mentor_id: string
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          mentor_id?: string
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trails_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      training_analyses: {
        Row: {
          analysis_type: string
          como_melhorar: Json | null
          created_at: string
          errou_feio: Json | null
          id: string
          mentorado_id: string
          muda_urgente: Json | null
          nota_geral: number | null
          ouro_nao_mude: Json | null
          pontos_fortes: Json | null
          pontos_fracos: Json | null
          resumo: string | null
        }
        Insert: {
          analysis_type: string
          como_melhorar?: Json | null
          created_at?: string
          errou_feio?: Json | null
          id?: string
          mentorado_id: string
          muda_urgente?: Json | null
          nota_geral?: number | null
          ouro_nao_mude?: Json | null
          pontos_fortes?: Json | null
          pontos_fracos?: Json | null
          resumo?: string | null
        }
        Update: {
          analysis_type?: string
          como_melhorar?: Json | null
          created_at?: string
          errou_feio?: Json | null
          id?: string
          mentorado_id?: string
          muda_urgente?: Json | null
          nota_geral?: number | null
          ouro_nao_mude?: Json | null
          pontos_fortes?: Json | null
          pontos_fracos?: Json | null
          resumo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_analyses_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          mentorado_id: string
          unlocked_at: string | null
        }
        Insert: {
          badge_id: string
          id?: string
          mentorado_id: string
          unlocked_at?: string | null
        }
        Update: {
          badge_id?: string
          id?: string
          mentorado_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      approve_mentorado: {
        Args: { _mentor_id: string; _user_id: string }
        Returns: undefined
      }
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      get_pending_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_first_mentor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "mentor" | "mentorado"
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
      app_role: ["mentor", "mentorado"],
    },
  },
} as const
