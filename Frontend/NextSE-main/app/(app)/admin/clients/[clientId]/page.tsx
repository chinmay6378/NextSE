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
import type { GeneratedContent, GenerationSection } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const SECTION_LABELS: Record<GenerationSection, string> = {
  profile: 'Client Profile',
  study_material: 'Study Material',
  sales_pitch: 'Sales Pitch',
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

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<GenerationSection>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [regenPrompt, setRegenPrompt] = useState('')

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client', clientId] })

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
  const current = sectionContent[tab]
  const allReady = (['profile', 'study_material', 'sales_pitch'] as const).every((key) =>
    ['ready', 'edited'].includes(sectionContent[key]?.status ?? '')
  )

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadMutation.mutate(files)
    e.target.value = ''
  }

  const startEditing = () => {
    setDraftMarkdown(current?.content_markdown ?? '')
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

      {/* Regenerate prompt override */}
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

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          {(['profile', 'study_material', 'sales_pitch'] as const).map((key) => (
            <button
              key={key}
              onClick={() => {
                setTab(key)
                setIsEditing(false)
              }}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                tab === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {SECTION_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={current?.status} />
            <div className="flex items-center gap-2">
              {tab === 'profile' && current?.content_markdown && !isEditing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
              <button
                onClick={() => regenerateMutation.mutate(tab)}
                disabled={regenerateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            </div>
          </div>

          {current?.status === 'failed' && current.error_message && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
              {current.error_message}
            </div>
          )}

          {current?.status === 'generating' && (
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
            current?.content_markdown && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-invert prose-sm max-w-none"
              >
                <ReactMarkdown>{current.content_markdown}</ReactMarkdown>
              </motion.div>
            )
          )}

          {!current && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Not generated yet. Use Regenerate above once files/prompt are ready.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
