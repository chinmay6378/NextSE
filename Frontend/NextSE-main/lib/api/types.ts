export type Role = 'admin' | 'engineer' | 'manager'

export interface Profile {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export type ClientStatus = 'draft' | 'published'
export type GeneratedStatus = 'generating' | 'ready' | 'edited' | 'failed'
export type ExtractionStatus = 'pending' | 'done' | 'failed'
export type GenerationSection = 'profile' | 'study_material' | 'sales_pitch'

export interface Client {
  id: string
  name: string
  industry: string
  status: ClientStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClientFile {
  id: string
  client_id: string
  file_name: string
  mime_type: string
  extraction_status: ExtractionStatus
  uploaded_at: string
}

export interface GeneratedContent {
  id: string
  version: number
  status: GeneratedStatus
  content_markdown: string | null
  content_json: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ClientDetail {
  client: Client
  files: ClientFile[]
  profile: GeneratedContent | null
  study_material: GeneratedContent | null
  sales_pitch: GeneratedContent | null
}

export interface GenerationStatus {
  overall_status: 'generating' | 'ready' | 'edited' | 'failed' | 'not_started'
  profile_status: GeneratedStatus | null
  study_material_status: GeneratedStatus | null
  sales_pitch_status: GeneratedStatus | null
  profile_error: string | null
  study_material_error: string | null
  sales_pitch_error: string | null
}

export interface GenerationKickoff {
  status: 'generating'
  profile_id: string | null
  study_material_id: string | null
  sales_pitch_id: string | null
}

export interface StudyModule {
  title: string
  content: string
}

export interface Flashcard {
  front: string
  back: string
}

export interface StudyMaterialContent {
  modules: StudyModule[]
  flashcards: Flashcard[]
  cheat_sheet: string
}

export interface EngineerProgress {
  client_id: string
  studied_percent: number
  studied_sections: Record<string, boolean>
  updated_at: string
}
