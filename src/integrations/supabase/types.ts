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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime_type: string | null
          name: string
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          generation_id: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          generation_id?: string | null
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          generation_id?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_ledger_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_segments: number
          created_at: string
          error_message: string | null
          generation_id: string
          id: string
          merged: boolean
          progress: number
          project_id: string | null
          provider: string
          provider_job_id: string | null
          stage_message: string
          status: Database["public"]["Enums"]["job_status"]
          total_segments: number
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          completed_segments?: number
          created_at?: string
          error_message?: string | null
          generation_id: string
          id?: string
          merged?: boolean
          progress?: number
          project_id?: string | null
          provider?: string
          provider_job_id?: string | null
          stage_message?: string
          status?: Database["public"]["Enums"]["job_status"]
          total_segments?: number
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          completed_segments?: number
          created_at?: string
          error_message?: string | null
          generation_id?: string
          id?: string
          merged?: boolean
          progress?: number
          project_id?: string | null
          provider?: string
          provider_job_id?: string | null
          stage_message?: string
          status?: Database["public"]["Enums"]["job_status"]
          total_segments?: number
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_segments: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          generation_id: string
          id: string
          idx: number
          job_id: string
          provider_job_id: string | null
          scene_prompt: string
          seconds: number
          status: string
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          generation_id: string
          id?: string
          idx: number
          job_id: string
          provider_job_id?: string | null
          scene_prompt: string
          seconds?: number
          status?: string
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          generation_id?: string
          id?: string
          idx?: number
          job_id?: string
          provider_job_id?: string | null
          scene_prompt?: string
          seconds?: number
          status?: string
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_segments_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_segments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          created_at: string
          credits_cost: number
          enhanced_prompt: string | null
          id: string
          mode: string
          model_tier: string
          negative_prompt: string | null
          project_id: string | null
          prompt: string
          provider: string
          scene_id: string | null
          settings: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_cost?: number
          enhanced_prompt?: string | null
          id?: string
          mode?: string
          model_tier?: string
          negative_prompt?: string | null
          project_id?: string | null
          prompt: string
          provider?: string
          scene_id?: string | null
          settings?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          credits_cost?: number
          enhanced_prompt?: string | null
          id?: string
          mode?: string
          model_tier?: string
          negative_prompt?: string | null
          project_id?: string | null
          prompt?: string
          provider?: string
          scene_id?: string | null
          settings?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          last_credit_grant: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id: string
          last_credit_grant?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          last_credit_grant?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          aspect_ratio: string
          created_at: string
          duration_seconds: number
          fps: number
          id: string
          mode: string
          resolution: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          duration_seconds?: number
          fps?: number
          id?: string
          mode?: string
          resolution?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          duration_seconds?: number
          fps?: number
          id?: string
          mode?: string
          resolution?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: []
      }
      scenes: {
        Row: {
          camera: string | null
          created_at: string
          duration_seconds: number
          id: string
          position: number
          project_id: string
          prompt: string
          style: string | null
          thumbnail_url: string | null
          transition: string | null
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          camera?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          position?: number
          project_id: string
          prompt?: string
          style?: string | null
          thumbnail_url?: string | null
          transition?: string | null
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          camera?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          position?: number
          project_id?: string
          prompt?: string
          style?: string | null
          thumbnail_url?: string | null
          transition?: string | null
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      claim_daily_credits: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_credits: {
        Args: {
          _amount: number
          _description: string
          _generation_id: string
          _user_id: string
        }
        Returns: number
      }
      spend_credits: {
        Args: {
          _amount: number
          _description: string
          _generation_id: string
          _user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
      job_status:
        | "queued"
        | "processing"
        | "generating"
        | "rendering"
        | "completed"
        | "failed"
        | "cancelled"
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
      app_role: ["admin", "user"],
      job_status: [
        "queued",
        "processing",
        "generating",
        "rendering",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
