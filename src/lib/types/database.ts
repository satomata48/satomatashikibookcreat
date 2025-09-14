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
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          user_id: string
          title: string
          author: string | null
          description: string | null
          cover_image_url: string | null
          language: string
          isbn: string | null
          publisher: string | null
          status: 'draft' | 'published' | 'archived'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          author?: string | null
          description?: string | null
          cover_image_url?: string | null
          language?: string
          isbn?: string | null
          publisher?: string | null
          status?: 'draft' | 'published' | 'archived'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          author?: string | null
          description?: string | null
          cover_image_url?: string | null
          language?: string
          isbn?: string | null
          publisher?: string | null
          status?: 'draft' | 'published' | 'archived'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          book_id: string
          title: string
          content: string | null
          order_index: number
          word_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          title: string
          content?: string | null
          order_index: number
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          title?: string
          content?: string | null
          order_index?: number
          word_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      export_history: {
        Row: {
          id: string
          book_id: string
          user_id: string
          file_url: string
          file_size: number | null
          format: string
          settings: Json
          exported_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          file_url: string
          file_size?: number | null
          format?: string
          settings?: Json
          exported_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          file_url?: string
          file_size?: number | null
          format?: string
          settings?: Json
          exported_at?: string
        }
      }
      autosave_drafts: {
        Row: {
          id: string
          chapter_id: string
          content: string | null
          saved_at: string
        }
        Insert: {
          id?: string
          chapter_id: string
          content?: string | null
          saved_at?: string
        }
        Update: {
          id?: string
          chapter_id?: string
          content?: string | null
          saved_at?: string
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
      [_ in never]: never
    }
  }
}