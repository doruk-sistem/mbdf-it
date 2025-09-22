export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      access_package: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          package_data: Json | null
          room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          package_data?: Json | null
          room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          package_data?: Json | null
          room_id?: string
          updated_at?: string
        }
      }
      access_request: {
        Row: {
          access_token: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          justification: string | null
          package_id: string
          rejected_reason: string | null
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          package_id: string
          rejected_reason?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          package_id?: string
          rejected_reason?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
      }
      agreement: {
        Row: {
          agreement_type: string
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          room_id: string
          title: string
          updated_at: string
        }
        Insert: {
          agreement_type?: string
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          room_id: string
          title: string
          updated_at?: string
        }
        Update: {
          agreement_type?: string
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          room_id?: string
          title?: string
          updated_at?: string
        }
      }
      agreement_party: {
        Row: {
          agreement_id: string
          created_at: string
          id: string
          signature_data: Json | null
          signature_status: Database["public"]["Enums"]["signature_status"]
          signed_at: string | null
          user_id: string
        }
        Insert: {
          agreement_id: string
          created_at?: string
          id?: string
          signature_data?: Json | null
          signature_status?: Database["public"]["Enums"]["signature_status"]
          signed_at?: string | null
          user_id: string
        }
        Update: {
          agreement_id?: string
          created_at?: string
          id?: string
          signature_data?: Json | null
          signature_status?: Database["public"]["Enums"]["signature_status"]
          signed_at?: string | null
          user_id?: string
        }
      }
      agreement_signature: {
        Row: {
          agreement_id: string
          created_at: string
          id: string
          party_id: string
          provider_response: Json | null
          signature_hash: string | null
          signature_method: string | null
          signed_pdf_path: string | null
        }
        Insert: {
          agreement_id: string
          created_at?: string
          id?: string
          party_id: string
          provider_response?: Json | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_pdf_path?: string | null
        }
        Update: {
          agreement_id?: string
          created_at?: string
          id?: string
          party_id?: string
          provider_response?: Json | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_pdf_path?: string | null
        }
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          room_id?: string | null
          user_id?: string | null
        }
      }
      company: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          vat_number?: string | null
        }
      }
      document: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          room_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          room_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          room_id?: string
          updated_at?: string
          uploaded_by?: string
        }
      }
      kep_notification: {
        Row: {
          agreement_id: string
          content: string
          created_at: string
          id: string
          kep_address: string
          provider_response: Json | null
          recipient_id: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          agreement_id: string
          content: string
          created_at?: string
          id?: string
          kep_address: string
          provider_response?: Json | null
          recipient_id: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          agreement_id?: string
          content?: string
          created_at?: string
          id?: string
          kep_address?: string
          provider_response?: Json | null
          recipient_id?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
      }
      kks_evidence: {
        Row: {
          file_hash: string | null
          file_path: string
          file_type: string
          generated_at: string
          id: string
          submission_id: string
        }
        Insert: {
          file_hash?: string | null
          file_path: string
          file_type: string
          generated_at?: string
          id?: string
          submission_id: string
        }
        Update: {
          file_hash?: string | null
          file_path?: string
          file_type?: string
          generated_at?: string
          id?: string
          submission_id?: string
        }
      }
      kks_submission: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          room_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["kks_status"]
          submission_data: Json
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          room_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["kks_status"]
          submission_data: Json
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          room_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["kks_status"]
          submission_data?: Json
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
      }
      lr_candidate: {
        Row: {
          created_at: string
          id: string
          is_selected: boolean
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_selected?: boolean
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_selected?: boolean
          room_id?: string
          user_id?: string
        }
      }
      lr_vote: {
        Row: {
          availability_score: number | null
          candidate_id: string
          communication_score: number | null
          created_at: string
          experience_score: number | null
          id: string
          leadership_score: number | null
          room_id: string
          technical_score: number | null
          updated_at: string
          voter_id: string
        }
        Insert: {
          availability_score?: number | null
          candidate_id: string
          communication_score?: number | null
          created_at?: string
          experience_score?: number | null
          id?: string
          leadership_score?: number | null
          room_id: string
          technical_score?: number | null
          updated_at?: string
          voter_id: string
        }
        Update: {
          availability_score?: number | null
          candidate_id?: string
          communication_score?: number | null
          created_at?: string
          experience_score?: number | null
          id?: string
          leadership_score?: number | null
          room_id?: string
          technical_score?: number | null
          updated_at?: string
          voter_id?: string
        }
      }
      mbdf_member: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["user_role"]
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          room_id?: string
          user_id?: string
        }
      }
      mbdf_room: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["room_status"]
          substance_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["room_status"]
          substance_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["room_status"]
          substance_id?: string
          updated_at?: string
        }
      }
      message: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          message_type: string
          room_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          room_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          room_id?: string
          sender_id?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
      }
      substance: {
        Row: {
          cas_number: string | null
          created_at: string
          description: string | null
          ec_number: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          cas_number?: string | null
          created_at?: string
          description?: string | null
          ec_number?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          cas_number?: string | null
          created_at?: string
          description?: string | null
          ec_number?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      kks_status: "draft" | "submitted" | "sent"
      request_status: "pending" | "approved" | "rejected"
      room_status: "active" | "closed" | "archived"
      signature_status: "pending" | "signed" | "rejected"
      user_role: "admin" | "lr" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}