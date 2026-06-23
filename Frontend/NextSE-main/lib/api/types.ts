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
  target_industries: string[]
  target_locations: string[]
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
  file_category: string | null
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

export interface YoutubeVideo {
  title: string
  query: string
  video_id?: string | null
}

export interface StudyMaterialContent {
  modules: StudyModule[]
  flashcards: Flashcard[]
  cheat_sheet: string
  youtube_videos?: YoutubeVideo[]
}

export interface EngineerProgress {
  client_id: string
  studied_percent: number
  studied_sections: Record<string, boolean>
  updated_at: string
}

export type TestRequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed'

export interface TestRequest {
  id: string
  client_id: string
  engineer_id: string
  requested_by: string
  status: TestRequestStatus
  requested_at: string
  responded_at: string | null
  client_name: string | null
  engineer_name: string | null
  score_percent: number | null
  passed: boolean | null
}

export interface ResultOut {
  id: string
  test_request_id: string
  engineer_id: string
  engineer_name: string | null
  client_id: string
  client_name: string | null
  knowledge_score: number | null
  communication_score: number | null
  overall_score: number | null
  status: string
  created_at: string
}

export interface MCQQuestion {
  id: string
  question_text: string
  options: string[]
  difficulty: string | null
}

export interface MCQStartData {
  mcq_set_id: string
  questions: MCQQuestion[]
}

export interface MCQQuestionResult {
  question_id: string
  selected_option_index: number
  correct_option_index: number
  is_correct: boolean
  explanation: string | null
}

export interface MCQResult {
  score_percent: number
  passed: boolean
  total: number
  correct: number
  question_results: MCQQuestionResult[]
}

// --- Voice assessment ---

export interface VoiceSessionOut {
  id: string
  test_request_id: string
  status: 'pending' | 'in_progress' | 'completed'
  started_at: string | null
  opening_message: string
  opening_audio_b64?: string
}

export interface VoiceTranscriptEntry {
  id: string
  speaker: 'ai' | 'engineer'
  message: string
  timestamp_ms: number
  sequence_index: number
}

export interface VoiceTurnOut {
  transcription: string
  ai_response: string
  ai_audio_b64?: string
  turn_count: number
  session_transcript: VoiceTranscriptEntry[]
}

export interface VoiceScoreOut {
  communication_score: number
  ai_feedback: string
  overall_score: number
  strengths: string[]
  improvements: string[]
}
