export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          difficulty_level: string
          equipment: string[]
          id: string
          is_benchmark: boolean
          measurement_type: string
          movement_type: string
          name: string
          scaling_options: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level: string
          equipment?: string[]
          id?: string
          is_benchmark?: boolean
          measurement_type: string
          movement_type: string
          name: string
          scaling_options?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string
          equipment?: string[]
          id?: string
          is_benchmark?: boolean
          measurement_type?: string
          movement_type?: string
          name?: string
          scaling_options?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      garmin_activities: {
        Row: {
          avg_heart_rate: number | null
          calories: number | null
          created_at: string
          elapsed_time_seconds: number | null
          file_path: string
          hr_zone_1_seconds: number
          hr_zone_2_seconds: number
          hr_zone_3_seconds: number
          hr_zone_4_seconds: number
          hr_zone_5_seconds: number
          id: string
          max_heart_rate: number | null
          recovery_time_hours: number | null
          training_load: number | null
          updated_at: string
          user_id: string
          vo2max: number | null
          workout_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string
          elapsed_time_seconds?: number | null
          file_path: string
          hr_zone_1_seconds?: number
          hr_zone_2_seconds?: number
          hr_zone_3_seconds?: number
          hr_zone_4_seconds?: number
          hr_zone_5_seconds?: number
          id?: string
          max_heart_rate?: number | null
          recovery_time_hours?: number | null
          training_load?: number | null
          updated_at?: string
          user_id: string
          vo2max?: number | null
          workout_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string
          elapsed_time_seconds?: number | null
          file_path?: string
          hr_zone_1_seconds?: number
          hr_zone_2_seconds?: number
          hr_zone_3_seconds?: number
          hr_zone_4_seconds?: number
          hr_zone_5_seconds?: number
          id?: string
          max_heart_rate?: number | null
          recovery_time_hours?: number | null
          training_load?: number | null
          updated_at?: string
          user_id?: string
          vo2max?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'garmin_activities_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      training_evaluations: {
        Row: {
          adaptation_warning: string | null
          created_at: string
          garmin_activity_id: string
          id: string
          next_session_suggestion: string
          readiness_level: string
          summary: string
          user_id: string
        }
        Insert: {
          adaptation_warning?: string | null
          created_at?: string
          garmin_activity_id: string
          id?: string
          next_session_suggestion: string
          readiness_level: string
          summary: string
          user_id: string
        }
        Update: {
          adaptation_warning?: string | null
          created_at?: string
          garmin_activity_id?: string
          id?: string
          next_session_suggestion?: string
          readiness_level?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_evaluations_garmin_activity_id_fkey'
            columns: ['garmin_activity_id']
            isOneToOne: true
            referencedRelation: 'garmin_activities'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          duration_minutes: number
          garmin_activity_id: string | null
          id: string
          notes: string | null
          payload: Json | null
          performed_at: string
          rpe: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
          wod_format: string | null
          wod_text: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          garmin_activity_id?: string | null
          id?: string
          notes?: string | null
          payload?: Json | null
          performed_at: string
          rpe?: number | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          wod_format?: string | null
          wod_text?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          garmin_activity_id?: string | null
          id?: string
          notes?: string | null
          payload?: Json | null
          performed_at?: string
          rpe?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          wod_format?: string | null
          wod_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workouts_garmin_activity_id_fkey'
            columns: ['garmin_activity_id']
            isOneToOne: false
            referencedRelation: 'garmin_activities'
            referencedColumns: ['id']
          },
        ]
      }
      belt_progression: {
        Row: {
          id: string
          user_id: string
          belt_level: string
          section_id: string
          item_id: string
          is_complete: boolean
          completed_at: string | null
          technique_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          belt_level?: string
          section_id: string
          item_id: string
          is_complete?: boolean
          completed_at?: string | null
          technique_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          belt_level?: string
          section_id?: string
          item_id?: string
          is_complete?: boolean
          completed_at?: string | null
          technique_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'belt_progression_technique_id_fkey'
            columns: ['technique_id']
            isOneToOne: false
            referencedRelation: 'bjj_techniques'
            referencedColumns: ['id']
          },
        ]
      }
      belt_progression_ui_state: {
        Row: {
          id: string
          user_id: string
          belt_level: string
          section_id: string
          is_expanded: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          belt_level?: string
          section_id: string
          is_expanded?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          belt_level?: string
          section_id?: string
          is_expanded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
