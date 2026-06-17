'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Rocket,
  Trash2,
  Upload,
  XCircle,
  ClipboardList,
  UserCheck,
} from 'lucide-react'
import { use, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import {
  deleteClientFile,
  getClient,
  patchProfile,
  publishClient,
  regenerate,
  uploadClientFiles,
} from '@/lib/api/clients'
import {
  approveTestRequest,
  createTestRequest,
  listAdminTestRequests,
  listEngineers,
} from '@/lib/api/tests'
import type { GeneratedContent, GenerationSection } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Tab = GenerationSection | 'test_requests'

const SECTION_LABELS: Record<Tab, string> = {
  profile: 'Client Profile',
  study_material: 'Study Material',
  sales_pitch: 'Sales Pitch',
  test_requests: 'Test Requests',
}

function StatusBadge({ status }: { status: GeneratedContent['status'] | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">Not generated</span>
  const styles: Record<string, string> = {
    generating: 'bg-amber-500/15 text-amber-400',
    ready: 'bg-emerald-500/15 text-emerald-400',
    edited: 'bg-sky-500/15 text-sky-400',
    failed: 'bg-destructive/15 text-destructive',
  }
  return (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', styles[status])}>
      {status}
    </span>
  )
}

const TR_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  approved: 'bg-primary/15 text-primary',
  in_progress: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
}

const TR_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [regenPrompt, setRegenPrompt] = useState('')
  const [selectedEngineerId, setSelectedEngineerId] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    refetchInterval: (query) => {
      const d = query.state.data
      const generating = [d?.profile, d?.study_material, d?.sales_pitch].some(
        (s) => s?.status === 'generating'
      )
      return generating ? 2000 : false
    },
  })

  const { data: testRequests, isLoading: trLoading } = useQuery({
    queryKey: ['admin-test-requests', clientId],
    queryFn: () => listAdminTestRequests({ client_id: clientId }),
    enabled: tab === 'test_requests',
  })

  const { data: engineers } = useQuery({
    queryKey: ['engineers'],
    queryFn: listEngineers,
    enabled: tab === 'test_requests',
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  const invalidateTR = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-test-requests', clientId] })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadClientFiles(clientId, files),
    onSuccess: () => {
      invalidate()
      toast.success('Files uploaded')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Upload failed'),
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => deleteClientFile(clientId, fileId),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Delete failed'),
  })

  const patchMutation = useMutation({
    mutationFn: (markdown: string) => patchProfile(clientId, { content_markdown: markdown }),
    onSuccess: () => {
      invalidate()
      setIsEditing(false)
      toast.success('Profile updated')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Update failed'),
  })

  const regenerateMutation = useMutation({
    mutationFn: (section?: GenerationSection) =>
      regenerate(clientId, { section, custom_prompt: regenPrompt.trim() || undefined }),
    onSuccess: () => {
      invalidate()
      toast.success('Regeneration started')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not regenerate'),
  })

  const publishMutation = useMutation({
    mutationFn: () => publishClient(clientId),
    onSuccess: () => {
      invalidate()
      toast.success('Client published — visible to engineers now')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not publish'),
  })

  const createTRMutation = useMutation({
    mutationFn: (engineerId: string) => createTestRequest(clientId, engineerId),
    onSuccess: () => {
      invalidateTR()
      setSelectedEngineerId('')
      toast.success('Test request created')
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create test request'),
  })

  const approveTRMutation = useMutation({
    mutationFn: (requestId: string) => approveTestRequest(requestId),
    onSuccess: () => {
      invalidateTR()
      toast.success('Test request approved')
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not approve'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-destructive text-sm">
        Could not load this client.
      </div>
    )
  }

  const sectionContent: Record<GenerationSection, GeneratedContent | null> = {
    profile: data.profile,
    study_material: data.study_material,
    sales_pitch: data.sales_pitch,
  }
  const currentSection = tab !== 'test_requests' ? sectionContent[tab as GenerationSection] : null
  const allReady = (['profile', 'study_material', 'sales_pitch'] as const).every((key) =>
    ['ready', 'edited'].includes(sectionContent[key]?.status ?? '')
  )

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadMutation.mutate(files)
    e.target.value = ''
  }

  const startEditing = () => {
    setDraftMarkdown(currentSection?.content_markdown ?? '')
    setIsEditing(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{data.client.name}</h1>
          <p className="text-muted-foreground mt-1">
            {data.client.industry} ·{' '}
            <span className="capitalize">{data.client.status}</span>
          </p>
        </div>
        {data.client.status === 'draft' && (
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!allReady || publishMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/20"
            title={allReady ? 'Publish to engineers' : 'All three sections must be ready first'}
          >
            <Rocket size={18} />
            {publishMutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
        )}
      </div>

      {/* Files */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Reference Documents</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Upload size={16} />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv,.md"
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>
        {data.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {data.files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                <FileText size={16} className="text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{file.file_name}</span>
                {file.extraction_status === 'pending' && (
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                )}
                {file.extraction_status === 'done' && <CheckCircle2 size={14} className="text-emerald-400" />}
                {file.extraction_status === 'failed' && <XCircle size={14} className="text-destructive" />}
                <button
                  onClick={() => deleteFileMutation.mutate(file.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Delete ${file.file_name}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Regenerate prompt — only show when on a generation tab */}
      {tab !== 'test_requests' && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <h2 className="font-semibold">Regenerate</h2>
          <textarea
            value={regenPrompt}
            onChange={(e) => setRegenPrompt(e.target.value)}
            placeholder="New custom prompt (optional — leave blank to reuse the last one)"
            rows={2}
            className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
          />
          <button
            onClick={() => regenerateMutation.mutate(undefined)}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Regenerate All
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {(['profile', 'study_material', 'sales_pitch', 'test_requests'] as const).map((key) => (
            <button
              key={key}
              onClick={() => {
                setTab(key)
                setIsEditing(false)
              }}
              className={cn(
                'flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                tab === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {SECTION_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Generation section content */}
        {tab !== 'test_requests' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={currentSection?.status} />
              <div className="flex items-center gap-2">
                {tab === 'profile' && currentSection?.content_markdown && !isEditing && (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => regenerateMutation.mutate(tab as GenerationSection)}
                  disabled={regenerateMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              </div>
            </div>

            {currentSection?.status === 'failed' && currentSection.error_message && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
                {currentSection.error_message}
              </div>
            )}

            {currentSection?.status === 'generating' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 size={18} className="animate-spin" />
                Generating…
              </div>
            )}

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={draftMarkdown}
                  onChange={(e) => setDraftMarkdown(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => patchMutation.mutate(draftMarkdown)}
                    disabled={patchMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {patchMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              currentSection?.content_markdown && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert prose-sm max-w-none"
                >
                  <ReactMarkdown>{currentSection.content_markdown}</ReactMarkdown>
                </motion.div>
              )
            )}

            {!currentSection && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Not generated yet. Use Regenerate above once files/prompt are ready.
              </p>
            )}
          </div>
        )}

        {/* Test Requests content */}
        {tab === 'test_requests' && (
          <div className="p-6 space-y-6">
            {/* Assign new test */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Assign a Test</h3>
              <div className="flex gap-3 flex-wrap">
                <select
                  value={selectedEngineerId}
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select engineer…</option>
                  {engineers?.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.full_name} ({eng.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => selectedEngineerId && createTRMutation.mutate(selectedEngineerId)}
                  disabled={!selectedEngineerId || createTRMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  <ClipboardList size={16} />
                  {createTRMutation.isPending ? 'Creating…' : 'Assign Test'}
                </button>
              </div>
              {engineers?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No engineers yet — create accounts via Signup and promote via Admin → Users.
                </p>
              )}
            </div>

            {/* Existing test requests */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Assigned Tests</h3>
              {trLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              )}
              {!trLoading && !testRequests?.length && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No test requests yet.
                </div>
              )}
              {testRequests?.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-4 bg-muted/40 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {req.engineer_name ?? 'Unknown Engineer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        TR_STATUS_STYLES[req.status] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {TR_STATUS_LABELS[req.status] ?? req.status}
                    </span>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => approveTRMutation.mutate(req.id)}
                        disabled={approveTRMutation.isPending}
                        className="text-xs px-3 py-1 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
