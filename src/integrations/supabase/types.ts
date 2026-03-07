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
      activity_logs: {
        Row: {
          action_description: string | null
          action_type: string
          created_at: string
          id: string
          membership_id: string | null
          metadata: Json | null
          points_earned: number | null
          tenant_id: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          created_at?: string
          id?: string
          membership_id?: string | null
          metadata?: Json | null
          points_earned?: number | null
          tenant_id?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          created_at?: string
          id?: string
          membership_id?: string | null
          metadata?: Json | null
          points_earned?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_history: {
        Row: {
          created_at: string
          id: string
          input_data: Json | null
          membership_id: string
          output_data: Json | null
          output_text: string | null
          tenant_id: string
          title: string | null
          tool_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_data?: Json | null
          membership_id: string
          output_data?: Json | null
          output_text?: string | null
          tenant_id: string
          title?: string | null
          tool_type: string
        }
        Update: {
          created_at?: string
          id?: string
          input_data?: Json | null
          membership_id?: string
          output_data?: Json | null
          output_text?: string | null
          tenant_id?: string
          title?: string | null
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_history_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_usage: {
        Row: {
          created_at: string | null
          id: string
          membership_id: string | null
          tenant_id: string | null
          tool_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          tenant_id?: string | null
          tool_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          tenant_id?: string | null
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          criteria: string | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          owner_membership_id: string | null
          points_required: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          criteria?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          owner_membership_id?: string | null
          points_required?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          criteria?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          owner_membership_id?: string | null
          points_required?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_questions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json
          order_index: number | null
          owner_membership_id: string | null
          question_text: string
          question_type: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options: Json
          order_index?: number | null
          owner_membership_id?: string | null
          question_text: string
          question_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json
          order_index?: number | null
          owner_membership_id?: string | null
          question_text?: string
          question_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          membership_id: string | null
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
          membership_id?: string | null
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
          membership_id?: string | null
          sales_recommendations?: Json | null
          strengths?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      behavioral_responses: {
        Row: {
          created_at: string | null
          id: string
          membership_id: string | null
          question_id: string
          selected_option: Json
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          question_id: string
          selected_option: Json
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          question_id?: string
          selected_option?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "behavioral_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioral_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          audience_membership_ids: string[] | null
          audience_type: string
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          facilitator_name: string | null
          id: string
          is_recurring: boolean | null
          meeting_url: string | null
          owner_membership_id: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience_membership_ids?: string[] | null
          audience_type?: string
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          facilitator_name?: string | null
          id?: string
          is_recurring?: boolean | null
          meeting_url?: string | null
          owner_membership_id?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience_membership_ids?: string[] | null
          audience_type?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          facilitator_name?: string | null
          id?: string
          is_recurring?: boolean | null
          meeting_url?: string | null
          owner_membership_id?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          membership_id: string | null
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
          membership_id?: string | null
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
          membership_id?: string | null
          status?: string | null
          title?: string | null
          transcript_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campan_tasks: {
        Row: {
          created_at: string
          created_by_membership_id: string
          description: string | null
          due_date: string | null
          id: string
          mentorado_membership_id: string
          priority: string
          source_transcript_id: string | null
          status_column: string
          tags: string[] | null
          task_hash: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          mentorado_membership_id: string
          priority?: string
          source_transcript_id?: string | null
          status_column?: string
          tags?: string[] | null
          task_hash?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          mentorado_membership_id?: string
          priority?: string
          source_transcript_id?: string | null
          status_column?: string
          tags?: string[] | null
          task_hash?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campan_tasks_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campan_tasks_mentorado_membership_id_fkey"
            columns: ["mentorado_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campan_tasks_source_transcript_id_fkey"
            columns: ["source_transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campan_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          id: string
          issued_at: string | null
          membership_id: string | null
          trail_id: string
        }
        Insert: {
          certificate_url?: string | null
          id?: string
          issued_at?: string | null
          membership_id?: string | null
          trail_id: string
        }
        Update: {
          certificate_url?: string | null
          id?: string
          issued_at?: string | null
          membership_id?: string | null
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          membership_id: string | null
          post_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          membership_id?: string | null
          post_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          membership_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string | null
          id: string
          membership_id: string | null
          post_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          post_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          author_membership_id: string | null
          content: string
          created_at: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          author_membership_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          author_membership_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_membership_id: string | null
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_membership_id?: string | null
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_membership_id?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          name: string
          notes: string | null
          owner_membership_id: string | null
          phone: string | null
          source: string | null
          stage: string | null
          tenant_id: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_membership_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_membership_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          membership_id: string | null
          name: string
          position: number
          status_key: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          membership_id?: string | null
          name: string
          position?: number
          status_key: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          membership_id?: string | null
          name?: string
          position?: number
          status_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          instagram_url: string | null
          linkedin_url: string | null
          membership_id: string | null
          notes: string | null
          points: number | null
          position: string | null
          profile_url: string | null
          screenshot_urls: string[] | null
          status: string | null
          temperature: string | null
          tenant_id: string | null
          updated_at: string | null
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          ai_insights?: Json | null
          company?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          membership_id?: string | null
          notes?: string | null
          points?: number | null
          position?: string | null
          profile_url?: string | null
          screenshot_urls?: string[] | null
          status?: string | null
          temperature?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          ai_insights?: Json | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          membership_id?: string | null
          notes?: string | null
          points?: number | null
          position?: string | null
          profile_url?: string | null
          screenshot_urls?: string[] | null
          status?: string | null
          temperature?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stage_automations: {
        Row: {
          created_at: string
          delay_days: number
          from_stage_key: string
          id: string
          is_active: boolean
          membership_id: string
          tenant_id: string
          to_stage_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          from_stage_key: string
          id?: string
          is_active?: boolean
          membership_id: string
          tenant_id: string
          to_stage_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          from_stage_key?: string
          id?: string
          is_active?: boolean
          membership_id?: string
          tenant_id?: string
          to_stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stage_automations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stage_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_journey_stages: {
        Row: {
          color: string
          created_at: string
          day_end: number
          day_start: number
          id: string
          journey_id: string | null
          name: string
          position: number
          stage_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          day_end?: number
          day_start?: number
          id?: string
          journey_id?: string | null
          name: string
          position?: number
          stage_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          day_end?: number
          day_start?: number
          id?: string
          journey_id?: string | null
          name?: string
          position?: number
          stage_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_journey_stages_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "cs_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_journey_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_journeys: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          total_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          tenant_id: string
          total_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          owner_membership_id: string | null
          template_id: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_membership_id?: string | null
          template_id: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_membership_id?: string | null
          template_id?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_executions: {
        Row: {
          completed_at: string | null
          current_node_id: string | null
          error_message: string | null
          flow_id: string
          id: string
          membership_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          membership_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          membership_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_triggers: {
        Row: {
          config: Json | null
          created_at: string | null
          flow_id: string
          id: string
          trigger_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          flow_id: string
          id?: string
          trigger_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          flow_id?: string
          id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_triggers_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flows: {
        Row: {
          audience_membership_ids: string[] | null
          audience_type: string | null
          created_at: string | null
          description: string | null
          edges: Json | null
          id: string
          is_active: boolean | null
          name: string
          nodes: Json | null
          owner_membership_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          audience_membership_ids?: string[] | null
          audience_type?: string | null
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json | null
          owner_membership_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audience_membership_ids?: string[] | null
          audience_type?: string | null
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json | null
          owner_membership_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          recipient_membership_id: string | null
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
          recipient_membership_id?: string | null
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
          recipient_membership_id?: string | null
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
          merge_tags: Json | null
          name: string
          owner_membership_id: string | null
          subject: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          id?: string
          merge_tags?: Json | null
          name: string
          owner_membership_id?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          id?: string
          merge_tags?: Json | null
          name?: string
          owner_membership_id?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_mentee_reminders: {
        Row: {
          created_at: string | null
          event_id: string
          hours_before: number
          id: string
          interval_key: string
          mentee_membership_id: string
          reminder_type: string | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          tenant_id: string
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          hours_before?: number
          id?: string
          interval_key?: string
          mentee_membership_id: string
          reminder_type?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          tenant_id: string
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          hours_before?: number
          id?: string
          interval_key?: string
          mentee_membership_id?: string
          reminder_type?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_mentee_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_mentee_reminders_mentee_membership_id_fkey"
            columns: ["mentee_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_mentee_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          remind_before: string
          scheduled_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          remind_before: string
          scheduled_at: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          remind_before?: string
          scheduled_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_task_drafts: {
        Row: {
          created_at: string
          id: string
          mentor_membership_id: string
          mentorado_membership_id: string
          status: string
          tasks_json: Json
          tenant_id: string
          transcript_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_membership_id: string
          mentorado_membership_id: string
          status?: string
          tasks_json?: Json
          tenant_id: string
          transcript_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_membership_id?: string
          mentorado_membership_id?: string
          status?: string
          tasks_json?: Json
          tenant_id?: string
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_task_drafts_mentor_membership_id_fkey"
            columns: ["mentor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_task_drafts_mentorado_membership_id_fkey"
            columns: ["mentorado_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_task_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_task_drafts_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          section: string | null
          system_field_key: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
          section?: string | null
          system_field_key?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          section?: string | null
          system_field_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "tenant_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          created_at: string
          form_id: string
          id: string
          membership_id: string | null
          metadata: Json | null
          respondent_email: string | null
          respondent_name: string | null
          tenant_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          form_id: string
          id?: string
          membership_id?: string | null
          metadata?: Json | null
          respondent_email?: string | null
          respondent_name?: string | null
          tenant_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          membership_id?: string | null
          metadata?: Json | null
          respondent_email?: string | null
          respondent_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "tenant_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_email: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          membership_id: string
          refresh_token: string | null
          scope: string | null
          tenant_id: string
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          calendar_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          membership_id: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id: string
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          calendar_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          membership_id?: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id?: string
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          drive_email: string | null
          expires_at: string | null
          id: string
          membership_id: string
          refresh_token: string | null
          scope: string | null
          tenant_id: string
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          drive_email?: string | null
          expires_at?: string | null
          id?: string
          membership_id: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id: string
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          drive_email?: string | null
          expires_at?: string | null
          id?: string
          membership_id?: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id?: string
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_tokens_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          admin_membership_id: string
          ended_at: string | null
          id: string
          ip_address: string | null
          started_at: string | null
          target_membership_id: string
        }
        Insert: {
          admin_membership_id: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          started_at?: string | null
          target_membership_id: string
        }
        Update: {
          admin_membership_id?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          started_at?: string | null
          target_membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_admin_membership_id_fkey"
            columns: ["admin_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_logs_target_membership_id_fkey"
            columns: ["target_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by_membership_id: string | null
          email: string
          expires_at: string | null
          id: string
          metadata: Json | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by_membership_id?: string | null
          email: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status?: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by_membership_id?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          membership_id: string | null
        }
        Insert: {
          attended?: boolean | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          meeting_id: string
          membership_id?: string | null
        }
        Update: {
          attended?: boolean | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string
          membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
      meeting_transcripts: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          input_type: string
          meeting_date: string | null
          meeting_title: string | null
          mentor_membership_id: string
          mentorado_membership_id: string
          raw_text: string | null
          tenant_id: string
          tldv_meeting_id: string | null
          video_source: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          input_type?: string
          meeting_date?: string | null
          meeting_title?: string | null
          mentor_membership_id: string
          mentorado_membership_id: string
          raw_text?: string | null
          tenant_id: string
          tldv_meeting_id?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          input_type?: string
          meeting_date?: string | null
          meeting_title?: string | null
          mentor_membership_id?: string
          mentorado_membership_id?: string
          raw_text?: string | null
          tenant_id?: string
          tldv_meeting_id?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_mentor_membership_id_fkey"
            columns: ["mentor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_mentorado_membership_id_fkey"
            columns: ["mentorado_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          owner_membership_id: string | null
          scheduled_at: string
          status: string | null
          tenant_id: string | null
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
          owner_membership_id?: string | null
          scheduled_at: string
          status?: string | null
          tenant_id?: string | null
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
          owner_membership_id?: string | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          can_impersonate: boolean | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_impersonate?: boolean | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["membership_role"]
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_impersonate?: boolean | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_activities: {
        Row: {
          activity_date: string
          count: number
          created_at: string
          id: string
          membership_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          activity_date: string
          count?: number
          created_at?: string
          id?: string
          membership_id: string
          tenant_id: string
          type: string
        }
        Update: {
          activity_date?: string
          count?: number
          created_at?: string
          id?: string
          membership_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_activities_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_behavioral_analyses: {
        Row: {
          alert_signals: Json | null
          behavioral_profile: Json | null
          created_at: string
          emotional_patterns: Json | null
          execution_blockers: Json | null
          full_report: string | null
          generated_by: string
          hidden_fears: Json | null
          how_to_succeed: Json | null
          id: string
          ideal_language: Json | null
          membership_id: string
          mentor_mistakes: Json | null
          motivation_triggers: Json | null
          potentiation_strategy: Json | null
          social_data_source: string | null
          tenant_id: string
        }
        Insert: {
          alert_signals?: Json | null
          behavioral_profile?: Json | null
          created_at?: string
          emotional_patterns?: Json | null
          execution_blockers?: Json | null
          full_report?: string | null
          generated_by: string
          hidden_fears?: Json | null
          how_to_succeed?: Json | null
          id?: string
          ideal_language?: Json | null
          membership_id: string
          mentor_mistakes?: Json | null
          motivation_triggers?: Json | null
          potentiation_strategy?: Json | null
          social_data_source?: string | null
          tenant_id: string
        }
        Update: {
          alert_signals?: Json | null
          behavioral_profile?: Json | null
          created_at?: string
          emotional_patterns?: Json | null
          execution_blockers?: Json | null
          full_report?: string | null
          generated_by?: string
          hidden_fears?: Json | null
          how_to_succeed?: Json | null
          id?: string
          ideal_language?: Json | null
          membership_id?: string
          mentor_mistakes?: Json | null
          motivation_triggers?: Json | null
          potentiation_strategy?: Json | null
          social_data_source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_behavioral_analyses_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_behavioral_analyses_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_behavioral_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_deals: {
        Row: {
          closed_at: string | null
          created_at: string
          deal_name: string | null
          id: string
          installments: number | null
          lost_reason: string | null
          membership_id: string
          monthly_value_cents: number | null
          negotiation_notes: string | null
          source: string | null
          stage: string
          tenant_id: string
          value_cents: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          deal_name?: string | null
          id?: string
          installments?: number | null
          lost_reason?: string | null
          membership_id: string
          monthly_value_cents?: number | null
          negotiation_notes?: string | null
          source?: string | null
          stage?: string
          tenant_id: string
          value_cents?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          deal_name?: string | null
          id?: string
          installments?: number | null
          lost_reason?: string | null
          membership_id?: string
          monthly_value_cents?: number | null
          negotiation_notes?: string | null
          source?: string | null
          stage?: string
          tenant_id?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentee_deals_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_journey_assignments: {
        Row: {
          created_at: string
          id: string
          journey_id: string
          membership_id: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id: string
          membership_id: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string
          membership_id?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_journey_assignments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "cs_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_journey_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_journey_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_payments: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          membership_id: string
          paid_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          membership_id: string
          paid_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          membership_id?: string
          paid_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_profiles: {
        Row: {
          business_name: string | null
          business_profile: Json | null
          created_at: string | null
          id: string
          joined_at: string | null
          membership_id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          showcase_bio: string | null
          showcase_photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_profile?: Json | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          membership_id: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          showcase_bio?: string | null
          showcase_photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_profile?: Json | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          membership_id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          showcase_bio?: string | null
          showcase_photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentee_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          mentor_membership_id: string
          slot_duration_minutes: number | null
          start_time: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          mentor_membership_id: string
          slot_duration_minutes?: number | null
          start_time: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          mentor_membership_id?: string
          slot_duration_minutes?: number | null
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_mentor_membership_id_fkey"
            columns: ["mentor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_library: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string
          id: string
          link_title: string | null
          link_url: string | null
          mime_type: string | null
          note_content: string | null
          note_title: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type: string
          id?: string
          link_title?: string | null
          link_url?: string | null
          mime_type?: string | null
          note_content?: string | null
          note_title?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
          link_title?: string | null
          link_url?: string | null
          mime_type?: string | null
          note_content?: string | null
          note_title?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      mentor_mentee_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          created_by_membership_id: string | null
          id: string
          mentee_membership_id: string
          mentor_membership_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          created_by_membership_id?: string | null
          id?: string
          mentee_membership_id: string
          mentor_membership_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          created_by_membership_id?: string | null
          id?: string
          mentee_membership_id?: string
          mentor_membership_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_mentee_assignments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_mentee_assignments_mentee_membership_id_fkey"
            columns: ["mentee_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_mentee_assignments_mentor_membership_id_fkey"
            columns: ["mentor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_mentee_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          bio: string | null
          business_name: string | null
          created_at: string | null
          id: string
          membership_id: string
          settings: Json | null
          specialties: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          membership_id: string
          settings?: Json | null
          specialties?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          membership_id?: string
          settings?: Json | null
          specialties?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorado_business_profiles: {
        Row: {
          average_ticket: string | null
          business_name: string | null
          business_type: string | null
          conversion_rate: string | null
          created_at: string | null
          current_sales_channels: string[] | null
          daily_prospection_goal: number | null
          has_commercial_process: boolean | null
          id: string
          ideal_client_profile: string | null
          main_bottleneck: string | null
          main_chaos_points: string[] | null
          main_offer: string | null
          maturity_level: string | null
          membership_id: string | null
          monthly_leads_volume: string | null
          monthly_revenue: string | null
          owner_dependency_level: string | null
          pain_points_solved: string[] | null
          pitch_context: string | null
          price_range: string | null
          sales_cycle_days: number | null
          sales_predictability: string | null
          target_audience: string | null
          team_size: string | null
          time_in_market: string | null
          unique_value_proposition: string | null
          updated_at: string | null
        }
        Insert: {
          average_ticket?: string | null
          business_name?: string | null
          business_type?: string | null
          conversion_rate?: string | null
          created_at?: string | null
          current_sales_channels?: string[] | null
          daily_prospection_goal?: number | null
          has_commercial_process?: boolean | null
          id?: string
          ideal_client_profile?: string | null
          main_bottleneck?: string | null
          main_chaos_points?: string[] | null
          main_offer?: string | null
          maturity_level?: string | null
          membership_id?: string | null
          monthly_leads_volume?: string | null
          monthly_revenue?: string | null
          owner_dependency_level?: string | null
          pain_points_solved?: string[] | null
          pitch_context?: string | null
          price_range?: string | null
          sales_cycle_days?: number | null
          sales_predictability?: string | null
          target_audience?: string | null
          team_size?: string | null
          time_in_market?: string | null
          unique_value_proposition?: string | null
          updated_at?: string | null
        }
        Update: {
          average_ticket?: string | null
          business_name?: string | null
          business_type?: string | null
          conversion_rate?: string | null
          created_at?: string | null
          current_sales_channels?: string[] | null
          daily_prospection_goal?: number | null
          has_commercial_process?: boolean | null
          id?: string
          ideal_client_profile?: string | null
          main_bottleneck?: string | null
          main_chaos_points?: string[] | null
          main_offer?: string | null
          maturity_level?: string | null
          membership_id?: string | null
          monthly_leads_volume?: string | null
          monthly_revenue?: string | null
          owner_dependency_level?: string | null
          pain_points_solved?: string[] | null
          pitch_context?: string | null
          price_range?: string | null
          sales_cycle_days?: number | null
          sales_predictability?: string | null
          target_audience?: string | null
          team_size?: string | null
          time_in_market?: string | null
          unique_value_proposition?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mentorado_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string
          id: string
          link_title: string | null
          link_url: string | null
          mime_type: string | null
          note_content: string | null
          note_title: string | null
          owner_membership_id: string | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string
          uploaded_by_membership_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type: string
          id?: string
          link_title?: string | null
          link_url?: string | null
          mime_type?: string | null
          note_content?: string | null
          note_title?: string | null
          owner_membership_id?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_by_membership_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
          link_title?: string | null
          link_url?: string | null
          mime_type?: string | null
          note_content?: string | null
          note_title?: string | null
          owner_membership_id?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_by_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorado_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorado_files_uploaded_by_membership_id_fkey"
            columns: ["uploaded_by_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorado_invites: {
        Row: {
          accepted_at: string | null
          business_name: string | null
          created_at: string
          email: string | null
          expires_at: string
          full_name: string
          id: string
          invite_token: string
          phone: string | null
          status: string
          welcome_message: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          full_name: string
          id?: string
          invite_token: string
          phone?: string | null
          status?: string
          welcome_message?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          full_name?: string
          id?: string
          invite_token?: string
          phone?: string | null
          status?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      metrics_snapshots: {
        Row: {
          created_at: string
          deals_won_count: number | null
          id: string
          meetings_held_count: number | null
          membership_id: string
          payback_months: number | null
          period_end: string | null
          period_start: string | null
          revenue_closed_cents: number | null
          revenue_received_cents: number | null
          roi_ratio: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deals_won_count?: number | null
          id?: string
          meetings_held_count?: number | null
          membership_id: string
          payback_months?: number | null
          period_end?: string | null
          period_start?: string | null
          revenue_closed_cents?: number | null
          revenue_received_cents?: number | null
          roi_ratio?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          deals_won_count?: number | null
          id?: string
          meetings_held_count?: number | null
          membership_id?: string
          payback_months?: number | null
          period_end?: string | null
          period_start?: string | null
          revenue_closed_cents?: number | null
          revenue_received_cents?: number | null
          roi_ratio?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshots_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      playbook_access_rules: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          membership_id: string
          playbook_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          membership_id: string
          playbook_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          membership_id?: string
          playbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_access_rules_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_access_rules_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_folders: {
        Row: {
          cover_image_url: string | null
          cover_position: string
          created_at: string
          created_by_membership_id: string
          description: string | null
          icon: string | null
          id: string
          is_pinned: boolean | null
          name: string
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          cover_position?: string
          created_at?: string
          created_by_membership_id: string
          description?: string | null
          icon?: string | null
          id?: string
          is_pinned?: boolean | null
          name: string
          position?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          cover_position?: string
          created_at?: string
          created_by_membership_id?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_pinned?: boolean | null
          name?: string
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_folders_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_pages: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          playbook_id: string
          position: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          playbook_id: string
          position?: number
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          playbook_id?: string
          position?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_pages_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_views: {
        Row: {
          id: string
          membership_id: string
          playbook_id: string
          tenant_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          membership_id: string
          playbook_id: string
          tenant_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          membership_id?: string
          playbook_id?: string
          tenant_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_views_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          cover_position: string
          created_at: string
          created_by_membership_id: string
          description: string | null
          folder_id: string | null
          id: string
          is_pinned: boolean | null
          position: number
          public_slug: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          content?: Json | null
          cover_image_url?: string | null
          cover_position?: string
          created_at?: string
          created_by_membership_id: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          position?: number
          public_slug?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          content?: Json | null
          cover_image_url?: string | null
          cover_position?: string
          created_at?: string
          created_by_membership_id?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          position?: number
          public_slug?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "playbook_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_dismissals: {
        Row: {
          dismissed_at: string | null
          id: string
          membership_id: string
          popup_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          membership_id: string
          popup_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          membership_id?: string
          popup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_dismissals_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_dismissals_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "tenant_popups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          phone: string | null
          tldv_api_key: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          phone?: string | null
          tldv_api_key?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          phone?: string | null
          tldv_api_key?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      program_investments: {
        Row: {
          annual_program_value_cents: number
          created_at: string
          id: string
          installments: number | null
          investment_amount_cents: number
          membership_id: string
          monthly_ads_cost_cents: number
          monthly_amount_cents: number | null
          monthly_other_cost_cents: number
          monthly_team_cost_cents: number
          negotiation_notes: string | null
          notes: string | null
          onboarding_date: string | null
          start_date: string | null
          tenant_id: string
        }
        Insert: {
          annual_program_value_cents?: number
          created_at?: string
          id?: string
          installments?: number | null
          investment_amount_cents: number
          membership_id: string
          monthly_ads_cost_cents?: number
          monthly_amount_cents?: number | null
          monthly_other_cost_cents?: number
          monthly_team_cost_cents?: number
          negotiation_notes?: string | null
          notes?: string | null
          onboarding_date?: string | null
          start_date?: string | null
          tenant_id: string
        }
        Update: {
          annual_program_value_cents?: number
          created_at?: string
          id?: string
          installments?: number | null
          investment_amount_cents?: number
          membership_id?: string
          monthly_ads_cost_cents?: number
          monthly_amount_cents?: number | null
          monthly_other_cost_cents?: number
          monthly_team_cost_cents?: number
          negotiation_notes?: string | null
          notes?: string | null
          onboarding_date?: string | null
          start_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_investments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_investments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_entries: {
        Row: {
          created_at: string | null
          id: string
          membership_id: string | null
          period_end: string | null
          period_start: string | null
          period_type: string | null
          points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          membership_id?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reward_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_cost: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_cost: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_cost?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          fulfilled_at: string | null
          id: string
          membership_id: string | null
          notes: string | null
          points_spent: number
          redeemed_at: string | null
          reward_id: string
          shipping_address: string | null
          status: string | null
        }
        Insert: {
          fulfilled_at?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          points_spent: number
          redeemed_at?: string | null
          reward_id: string
          shipping_address?: string | null
          status?: string | null
        }
        Update: {
          fulfilled_at?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          points_spent?: number
          redeemed_at?: string | null
          reward_id?: string
          shipping_address?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "reward_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_simulations: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          lead_id: string | null
          lead_name: string | null
          messages: Json
          negotiation_phase: string
          score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          messages?: Json
          negotiation_phase?: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          messages?: Json
          negotiation_phase?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      session_bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_url: string | null
          mentee_membership_id: string
          mentor_membership_id: string
          notes: string | null
          scheduled_at: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          mentee_membership_id: string
          mentor_membership_id: string
          notes?: string | null
          scheduled_at: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          mentee_membership_id?: string
          mentor_membership_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_bookings_mentee_membership_id_fkey"
            columns: ["mentee_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_mentor_membership_id_fkey"
            columns: ["mentor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          mentee_membership_id: string | null
          mentor_membership_id: string
          metadata: Json | null
          severity: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          mentee_membership_id?: string | null
          mentor_membership_id: string
          metadata?: Json | null
          severity?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          mentee_membership_id?: string | null
          mentor_membership_id?: string
          metadata?: Json | null
          severity?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_requests: {
        Row: {
          ai_analysis: Json | null
          ai_chat_history: Json | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          initial_guidance: string | null
          meeting_id: string | null
          membership_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_chat_history?: Json | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          initial_guidance?: string | null
          meeting_id?: string | null
          membership_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_chat_history?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          initial_guidance?: string | null
          meeting_id?: string | null
          membership_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          tenant_id?: string | null
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
            foreignKeyName: "sos_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      system_fingerprints: {
        Row: {
          author: string | null
          content_summary: string | null
          created_at: string | null
          full_content: string | null
          id: string
          metadata: Json | null
          sha256_hash: string
          system_name: string | null
          version: string | null
        }
        Insert: {
          author?: string | null
          content_summary?: string | null
          created_at?: string | null
          full_content?: string | null
          id?: string
          metadata?: Json | null
          sha256_hash: string
          system_name?: string | null
          version?: string | null
        }
        Update: {
          author?: string | null
          content_summary?: string | null
          created_at?: string | null
          full_content?: string | null
          id?: string
          metadata?: Json | null
          sha256_hash?: string
          system_name?: string | null
          version?: string | null
        }
        Relationships: []
      }
      tenant_automations: {
        Row: {
          automation_key: string
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          last_run_status: string | null
          schedule: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          automation_key: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          schedule?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          automation_key?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          schedule?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          ai_analysis: string | null
          approved_at: string | null
          approved_by: string | null
          brand_attributes: Json | null
          brand_concept: string | null
          color_palette: Json | null
          created_at: string
          generated_by: string | null
          id: string
          status: string
          suggested_logo_url: string | null
          suggested_name: string | null
          system_colors: Json | null
          tenant_id: string
          theme_mode: string | null
          typography: Json | null
          updated_at: string
          uploaded_assets: string[] | null
        }
        Insert: {
          ai_analysis?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_attributes?: Json | null
          brand_concept?: string | null
          color_palette?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          status?: string
          suggested_logo_url?: string | null
          suggested_name?: string | null
          system_colors?: Json | null
          tenant_id: string
          theme_mode?: string | null
          typography?: Json | null
          updated_at?: string
          uploaded_assets?: string[] | null
        }
        Update: {
          ai_analysis?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_attributes?: Json | null
          brand_concept?: string | null
          color_palette?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          status?: string
          suggested_logo_url?: string | null
          suggested_name?: string | null
          system_colors?: Json | null
          tenant_id?: string
          theme_mode?: string | null
          typography?: Json | null
          updated_at?: string
          uploaded_assets?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          dns_verified: boolean
          domain: string
          error_message: string | null
          id: string
          is_primary: boolean
          last_check_at: string | null
          ssl_active: boolean
          status: string
          tenant_id: string
          updated_at: string
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          dns_verified?: boolean
          domain: string
          error_message?: string | null
          id?: string
          is_primary?: boolean
          last_check_at?: string | null
          ssl_active?: boolean
          status?: string
          tenant_id: string
          updated_at?: string
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          dns_verified?: boolean
          domain?: string
          error_message?: string | null
          id?: string
          is_primary?: boolean
          last_check_at?: string | null
          ssl_active?: boolean
          status?: string
          tenant_id?: string
          updated_at?: string
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_forms: {
        Row: {
          created_at: string
          description: string | null
          form_type: string
          id: string
          is_active: boolean
          journey_stage_id: string | null
          owner_membership_id: string
          settings: Json | null
          slug: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean
          journey_stage_id?: string | null
          owner_membership_id: string
          settings?: Json | null
          slug?: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean
          journey_stage_id?: string | null
          owner_membership_id?: string
          settings?: Json | null
          slug?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_forms_journey_stage_id_fkey"
            columns: ["journey_stage_id"]
            isOneToOne: false
            referencedRelation: "cs_journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_forms_owner_membership_id_fkey"
            columns: ["owner_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_popups: {
        Row: {
          body_html: string
          created_at: string | null
          created_by: string
          cta_label: string | null
          cta_url: string | null
          display_mode: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          starts_at: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          created_by: string
          cta_label?: string | null
          cta_url?: string | null
          display_mode?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          created_by?: string
          cta_label?: string | null
          cta_url?: string | null
          display_mode?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_popups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_popups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_whatsapp_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sender_name: string | null
          tenant_id: string
          ultramsg_instance_id: string | null
          ultramsg_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sender_name?: string | null
          tenant_id: string
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sender_name?: string | null
          tenant_id?: string
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_whatsapp_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          brand_attributes: Json | null
          created_at: string | null
          custom_domain: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          monthly_value: number | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          status: string | null
          theme_mode: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          brand_attributes?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          monthly_value?: number | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          theme_mode?: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          brand_attributes?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          monthly_value?: number | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          theme_mode?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trail_lessons: {
        Row: {
          content_text: string | null
          content_type: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          file_name: string | null
          file_url: string | null
          id: string
          module_id: string
          order_index: number | null
          text_content: string | null
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
          file_name?: string | null
          file_url?: string | null
          id?: string
          module_id: string
          order_index?: number | null
          text_content?: string | null
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
          file_name?: string | null
          file_url?: string | null
          id?: string
          module_id?: string
          order_index?: number | null
          text_content?: string | null
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
          membership_id: string | null
          progress_percent: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          membership_id?: string | null
          progress_percent?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          membership_id?: string | null
          progress_percent?: number | null
          tenant_id?: string | null
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
            foreignKeyName: "trail_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          created_at: string | null
          creator_membership_id: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          order_index: number | null
          tenant_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_membership_id?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_membership_id?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          membership_id: string | null
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
          membership_id?: string | null
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
          membership_id?: string | null
          muda_urgente?: Json | null
          nota_geral?: number | null
          ouro_nao_mude?: Json | null
          pontos_fortes?: Json | null
          pontos_fracos?: Json | null
          resumo?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          membership_id: string | null
          unlocked_at: string | null
        }
        Insert: {
          badge_id: string
          id?: string
          membership_id?: string | null
          unlocked_at?: string | null
        }
        Update: {
          badge_id?: string
          id?: string
          membership_id?: string | null
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
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_access_date: string | null
          longest_streak: number | null
          membership_id: string | null
          updated_at: string | null
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_access_date?: string | null
          longest_streak?: number | null
          membership_id?: string | null
          updated_at?: string | null
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_access_date?: string | null
          longest_streak?: number | null
          membership_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_automation_flows: {
        Row: {
          audience_membership_ids: string[] | null
          audience_type: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          owner_membership_id: string | null
          steps: Json | null
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          audience_membership_ids?: string[] | null
          audience_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          owner_membership_id?: string | null
          steps?: Json | null
          tenant_id: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          audience_membership_ids?: string[] | null
          audience_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          owner_membership_id?: string | null
          steps?: Json | null
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_flows_owner_membership_id_fkey"
            columns: ["owner_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          audience_membership_ids: string[] | null
          audience_type: string
          created_at: string
          error_count: number | null
          id: string
          message_template: string
          name: string
          owner_membership_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          tenant_id: string
          updated_at: string
          use_ai_personalization: boolean
        }
        Insert: {
          audience_membership_ids?: string[] | null
          audience_type?: string
          created_at?: string
          error_count?: number | null
          id?: string
          message_template: string
          name: string
          owner_membership_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
          use_ai_personalization?: boolean
        }
        Update: {
          audience_membership_ids?: string[] | null
          audience_type?: string
          created_at?: string
          error_count?: number | null
          id?: string
          message_template?: string
          name?: string
          owner_membership_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
          use_ai_personalization?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_owner_membership_id_fkey"
            columns: ["owner_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message_body: string
          recipient_membership_id: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_body: string
          recipient_membership_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_body?: string
          recipient_membership_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_logs_recipient_membership_id_fkey"
            columns: ["recipient_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      whatsapp_config_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          sender_name: string | null
          tenant_id: string | null
          ultramsg_instance_id: string | null
          ultramsg_token_masked: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          sender_name?: string | null
          tenant_id?: string | null
          ultramsg_instance_id?: string | null
          ultramsg_token_masked?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          sender_name?: string | null
          tenant_id?: string | null
          ultramsg_instance_id?: string | null
          ultramsg_token_masked?: never
        }
        Relationships: [
          {
            foreignKeyName: "tenant_whatsapp_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_receive_otp: {
        Args: { _email: string; _tenant_hint?: string }
        Returns: {
          allowed: boolean
          full_name: string
          multiple_tenants: boolean
          phone: string
          reason: string
          role: Database["public"]["Enums"]["membership_role"]
          tenant_id: string
          tenants: Json
        }[]
      }
      can_view_mentee: {
        Args: { _mentee_membership_id: string; _viewer_membership_id: string }
        Returns: boolean
      }
      can_view_playbook: {
        Args: { _playbook_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      end_impersonation: { Args: { _log_id: string }; Returns: undefined }
      generate_invite_token: { Args: never; Returns: string }
      get_effective_membership: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: {
          can_impersonate: boolean
          membership_id: string
          role: Database["public"]["Enums"]["membership_role"]
        }[]
      }
      get_user_memberships: {
        Args: { _tenant_id?: string; _user_id: string }
        Returns: {
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      get_user_tenant_ids: { Args: { _user_id?: string }; Returns: string[] }
      has_membership_role: {
        Args: {
          _role: Database["public"]["Enums"]["membership_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_playbook_staff: {
        Args: { _playbook_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id?: string }
        Returns: boolean
      }
      is_tenant_staff: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      start_impersonation: {
        Args: {
          _admin_membership_id: string
          _ip_address?: string
          _target_membership_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "mentor" | "mentorado" | "admin_master"
      membership_role: "admin" | "ops" | "mentor" | "mentee" | "master_admin"
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
      app_role: ["mentor", "mentorado", "admin_master"],
      membership_role: ["admin", "ops", "mentor", "mentee", "master_admin"],
    },
  },
} as const
