/**
 * src/types/database.ts
 *
 * PRD-02 :: Database Types — TypeScript definitions for Supabase PostgreSQL tables.
 * Single source of truth for database schema types.
 * All comments use Roman English or Roman Urdu.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ----------------------------------------------------------------------------
// Core Enums & Allowed Values (PRD-02)
// ----------------------------------------------------------------------------
export type UserRole = "citizen" | "officer" | "admin";

export type ComplaintCategory =
  | "road_damage"
  | "footpath_damage"
  | "garbage"
  | "waste_collection"
  | "water_leakage"
  | "blocked_drain"
  | "streetlight"
  | "electrical_hazard"
  | "other"
  | "unknown";

export type ComplaintStatus =
  | "submitted"
  | "analyzing"
  | "needs_review"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "rejected";

export type ComplaintPriority = "low" | "medium" | "high" | "critical";

export type SubmissionMethod = "ai" | "manual";

export type DepartmentMembershipRole = "officer" | "lead" | "supervisor";

export type ComplaintRelationshipType = "duplicate" | "related" | "child" | "parent";

export type ComplaintReviewStatus = "pending" | "confirmed" | "rejected";

export type NotificationType =
  | "status_update"
  | "assignment"
  | "ai_complete"
  | "review_required"
  | "system";

export type AuditEventType =
  | "complaint_submitted"
  | "ai_analysis_started"
  | "ai_analysis_completed"
  | "human_review_requested"
  | "department_assigned"
  | "officer_assigned"
  | "status_changed"
  | "duplicate_linked"
  | "duplicate_reviewed"
  | "resolution_recorded"
  | "complaint_closed"
  | "role_changed"
  | "department_membership_changed"
  | "security_alert";

// ----------------------------------------------------------------------------
// Database Schema Interface
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: UserRole;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      department_members: {
        Row: {
          id: string;
          department_id: string;
          user_id: string;
          membership_role: DepartmentMembershipRole;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          department_id: string;
          user_id: string;
          membership_role?: DepartmentMembershipRole;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          department_id?: string;
          user_id?: string;
          membership_role?: DepartmentMembershipRole;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "department_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      complaints: {
        Row: {
          id: string;
          tracking_id: string;
          citizen_id: string | null;
          title: string;
          description: string;
          category: ComplaintCategory;
          status: ComplaintStatus;
          priority: ComplaintPriority;
          submission_method: SubmissionMethod;
          department_id: string | null;
          assigned_to: string | null;
          latitude: number | null;
          longitude: number | null;
          location_label: string | null;
          photo_path: string | null;
          is_public: boolean;
          submitted_at: string;
          updated_at: string;
          resolved_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          tracking_id: string;
          citizen_id?: string | null;
          title: string;
          description: string;
          category?: ComplaintCategory;
          status?: ComplaintStatus;
          priority?: ComplaintPriority;
          submission_method: SubmissionMethod;
          department_id?: string | null;
          assigned_to?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_label?: string | null;
          photo_path?: string | null;
          is_public?: boolean;
          submitted_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          tracking_id?: string;
          citizen_id?: string | null;
          title?: string;
          description?: string;
          category?: ComplaintCategory;
          status?: ComplaintStatus;
          priority?: ComplaintPriority;
          submission_method?: SubmissionMethod;
          department_id?: string | null;
          assigned_to?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_label?: string | null;
          photo_path?: string | null;
          is_public?: boolean;
          submitted_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_analyses: {
        Row: {
          id: string;
          complaint_id: string;
          model_name: string | null;
          category: ComplaintCategory;
          summary: string;
          severity: ComplaintPriority;
          confidence: number;
          suggested_department_category: string | null;
          safety_concern: boolean;
          needs_human_review: boolean;
          reasoning_summary: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          model_name?: string | null;
          category: ComplaintCategory;
          summary: string;
          severity: ComplaintPriority;
          confidence: number;
          suggested_department_category?: string | null;
          safety_concern?: boolean;
          needs_human_review?: boolean;
          reasoning_summary?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          model_name?: string | null;
          category?: ComplaintCategory;
          summary?: string;
          severity?: ComplaintPriority;
          confidence?: number;
          suggested_department_category?: string | null;
          safety_concern?: boolean;
          needs_human_review?: boolean;
          reasoning_summary?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analyses_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          }
        ];
      };
      duplicate_groups: {
        Row: {
          id: string;
          label: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          label?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          label?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      complaint_links: {
        Row: {
          id: string;
          complaint_id: string;
          related_complaint_id: string | null;
          duplicate_group_id: string | null;
          relationship_type: ComplaintRelationshipType;
          similarity_score: number | null;
          review_status: ComplaintReviewStatus;
          created_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          related_complaint_id?: string | null;
          duplicate_group_id?: string | null;
          relationship_type: ComplaintRelationshipType;
          similarity_score?: number | null;
          review_status?: ComplaintReviewStatus;
          created_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          related_complaint_id?: string | null;
          duplicate_group_id?: string | null;
          relationship_type?: ComplaintRelationshipType;
          similarity_score?: number | null;
          review_status?: ComplaintReviewStatus;
          created_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_links_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaint_links_related_complaint_id_fkey";
            columns: ["related_complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaint_links_duplicate_group_id_fkey";
            columns: ["duplicate_group_id"];
            isOneToOne: false;
            referencedRelation: "duplicate_groups";
            referencedColumns: ["id"];
          }
        ];
      };
      complaint_events: {
        Row: {
          id: string;
          complaint_id: string;
          actor_id: string | null;
          event_type: AuditEventType | string;
          previous_value: Json | null;
          new_value: Json | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          actor_id?: string | null;
          event_type: AuditEventType | string;
          previous_value?: Json | null;
          new_value?: Json | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          actor_id?: string | null;
          event_type?: AuditEventType | string;
          previous_value?: Json | null;
          new_value?: Json | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_events_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          complaint_id: string | null;
          type: NotificationType;
          title: string;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          complaint_id?: string | null;
          type: NotificationType;
          title: string;
          message: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          complaint_id?: string | null;
          type?: NotificationType;
          title?: string;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_department_member: {
        Args: { dept_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
