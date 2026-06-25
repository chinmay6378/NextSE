'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { use, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { ClientProfileView } from '@/components/client-profile-view'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import {
  deleteClientFile,
  getClient,
  getFileSignedUrl,
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
import type { GeneratedContent, GenerationSection, YoutubeVideo } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Tab = GenerationSection | 'test_requests'

const TAB_LABELS: Record<Tab, string> = {
  profile:        'Client Profile',
  study_material: 'Study Material',
  sales_pitch:    'Sales Pitch',
  test_requests:  'Test Requests',
}

const TR_STATUS: Record<string, { label: string }> = {
  pending:     { label: 'Pending' },
  approved:    { label: 'Approved' },
  in_progress: { label: 'In Progress' },
  completed:   { label: 'Completed' },
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
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [catalogueOpen, setCatalogueOpen] = useState(true)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    refetchInterval: (query) => {
      const d = query.state.data
      const generating = [d?.profile, d?.study_material, d?.sales_pitch].some(s => s?.status === 'generating')
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

  const invalidate   = () => queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  const invalidateTR = () => queryClient.invalidateQueries({ queryKey: ['admin-test-requests', clientId] })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadClientFiles(clientId, files),
    onSuccess: () => { invalidate(); toast.success('Files uploaded') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Upload failed'),
  })
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => deleteClientFile(clientId, fileId),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Delete failed'),
  })
  const patchMutation = useMutation({
    mutationFn: (md: string) => patchProfile(clientId, { content_markdown: md }),
    onSuccess: () => { invalidate(); setIsEditing(false); toast.success('Profile updated') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Update failed'),
  })
  const regenerateMutation = useMutation({
    mutationFn: (section?: GenerationSection) =>
      regenerate(clientId, { section, custom_prompt: regenPrompt.trim() || undefined }),
    onSuccess: () => { invalidate(); toast.success('Regeneration started') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not regenerate'),
  })
  const publishMutation = useMutation({
    mutationFn: () => publishClient(clientId),
    onSuccess: () => { invalidate(); toast.success('Client published') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not publish'),
  })
  const createTRMutation = useMutation({
    mutationFn: (engineerId: string) => createTestRequest(clientId, engineerId),
    onSuccess: () => { invalidateTR(); setSelectedEngineerId(''); toast.success('Test request created') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create test request'),
  })
  const approveTRMutation = useMutation({
    mutationFn: (requestId: string) => approveTestRequest(requestId),
    onSuccess: () => { invalidateTR(); toast.success('Test request approved') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not approve'),
  })

  const loadCataloguePreview = async (fileId: string) => {
    if (previewFileId === fileId) { setPreviewFileId(null); setPreviewUrl(null); return }
    setPreviewFileId(fileId)
    setPreviewUrl(null)
    setPreviewLoading(true)
    try {
      const { url } = await getFileSignedUrl(clientId, fileId)
      setPreviewUrl(url)
    } catch {
      toast.error('Could not load preview')
      setPreviewFileId(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="border border-destructive/20 rounded-xl p-10 text-center">
        <p className="text-destructive">Could not load this client.</p>
      </div>
    )
  }

  const sectionContent: Record<GenerationSection, GeneratedContent | null> = {
    profile:        data.profile,
    study_material: data.study_material,
    sales_pitch:    data.sales_pitch,
  }
  const currentSection = tab !== 'test_requests' ? sectionContent[tab as GenerationSection] : null
  const readySections = (['profile', 'study_material', 'sales_pitch'] as const).filter(
    k => ['ready', 'edited'].includes(sectionContent[k]?.status ?? '')
  ).length
  const allReady = readySections === 3

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadMutation.mutate(files)
    e.target.value = ''
  }

  return (
    <div className="space-y-5 pb-14">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{data.client.industry}</p>
          <h1 className="text-2xl font-bold text-foreground">{data.client.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.files.length} document{data.files.length !== 1 ? 's' : ''} · {readySections}/3 sections ready ·{' '}
            <span className={data.client.status === 'published' ? 'text-emerald-400' : ''}>
              {data.client.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </p>
        </div>
        {data.client.status === 'draft' && (
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!allReady || publishMutation.isPending}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            {publishMutation.isPending ? 'Publishing…' : 'Publish Client'}
          </button>
        )}
        {data.client.status === 'published' && (
          <span className="text-sm text-muted-foreground">✓ Live to Engineers</span>
        )}
      </div>

      {/* Files + Regenerate row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Files */}
        <div className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Reference Documents</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-border rounded-xl py-8 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              Click to upload files (PDF, DOCX, TXT, CSV, MD)
            </button>
          ) : (
            <ul className="space-y-1">
              {data.files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors group">
                  <FileText size={13} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 text-xs truncate">{file.file_name}</span>
                  <div className="flex items-center gap-2">
                    {file.extraction_status === 'pending' && <Loader2 size={12} className="animate-spin text-amber-400" />}
                    {file.extraction_status === 'done'    && <CheckCircle2 size={12} className="text-emerald-400" />}
                    {file.extraction_status === 'failed'  && <XCircle size={12} className="text-red-400" />}
                    <button
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Regenerate / Assign */}
        {tab !== 'test_requests' ? (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <span className="text-sm font-semibold">Regenerate Content</span>
            <textarea
              value={regenPrompt}
              onChange={(e) => setRegenPrompt(e.target.value)}
              placeholder="Custom instructions (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-input/60 border border-border text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={() => regenerateMutation.mutate(undefined)}
                disabled={regenerateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                Regenerate All
              </button>
              <button
                onClick={() => regenerateMutation.mutate(tab as GenerationSection)}
                disabled={regenerateMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                This Section
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <span className="text-sm font-semibold">Assign Test to Engineer</span>
            <select
              value={selectedEngineerId}
              onChange={(e) => setSelectedEngineerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="">Select engineer…</option>
              {engineers?.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.full_name} ({eng.email})</option>
              ))}
            </select>
            <button
              onClick={() => selectedEngineerId && createTRMutation.mutate(selectedEngineerId)}
              disabled={!selectedEngineerId || createTRMutation.isPending}
              className="w-full py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              {createTRMutation.isPending ? 'Assigning…' : 'Assign Test'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs + Content */}
      <div className="border border-border rounded-xl overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {(['profile', 'study_material', 'sales_pitch', 'test_requests'] as const).map((key) => (
            <button
              key={key}
              onClick={() => { setTab(key); setIsEditing(false) }}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px',
                tab === key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* Generation section panel */}
          {tab !== 'test_requests' && (
            <>
              {/* Section header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {currentSection?.status && <span className="capitalize">{currentSection.status}</span>}
                  {currentSection?.updated_at && (
                    <span>· {new Date(currentSection.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tab === 'profile' && currentSection?.content_markdown && !isEditing && (
                    <button
                      onClick={() => { setDraftMarkdown(currentSection.content_markdown ?? ''); setIsEditing(true) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => regenerateMutation.mutate(tab as GenerationSection)}
                    disabled={regenerateMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Catalogue preview */}
              {tab === 'profile' && (() => {
                const catalogueFiles = data.files.filter(f => f.file_category === 'catalogue')
                if (!catalogueFiles.length) return null
                return (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setCatalogueOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-sm font-medium">Product Catalogue ({catalogueFiles.length})</span>
                      {catalogueOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {catalogueOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border">
                        <div className="flex flex-wrap gap-2 pt-3">
                          {catalogueFiles.map(file => (
                            <button
                              key={file.id}
                              onClick={() => loadCataloguePreview(file.id)}
                              className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-colors',
                                previewFileId === file.id
                                  ? 'bg-muted border-primary text-foreground'
                                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                              )}
                            >
                              <FileText size={12} />
                              <span className="max-w-[180px] truncate">{file.file_name}</span>
                              <Eye size={11} />
                            </button>
                          ))}
                        </div>
                        {previewFileId && catalogueFiles.some(f => f.id === previewFileId) && (
                          <div className="rounded-xl overflow-hidden border border-border">
                            {previewLoading ? (
                              <div className="flex items-center justify-center h-40 gap-2">
                                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Loading preview…</p>
                              </div>
                            ) : previewUrl ? (
                              (() => {
                                const file = catalogueFiles.find(f => f.id === previewFileId)
                                const isPdf = file?.mime_type === 'application/pdf'
                                return isPdf ? (
                                  <iframe src={previewUrl} className="w-full" style={{ height: '680px' }} title={file?.file_name} />
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <p className="text-xs text-muted-foreground">Preview not supported for this file type.</p>
                                    <a
                                      href={previewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                                    >
                                      <ExternalLink size={12} /> Open / Download
                                    </a>
                                  </div>
                                )
                              })()
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Error */}
              {currentSection?.status === 'failed' && currentSection.error_message && (
                <div className="border border-destructive/20 rounded-xl p-4 text-xs text-destructive flex items-start gap-2">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  {currentSection.error_message}
                </div>
              )}

              {/* Generating */}
              {currentSection?.status === 'generating' && (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating content…</p>
                </div>
              )}

              {/* Edit textarea */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={draftMarkdown}
                    onChange={(e) => setDraftMarkdown(e.target.value)}
                    rows={18}
                    className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => patchMutation.mutate(draftMarkdown)}
                      disabled={patchMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {patchMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      {patchMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : currentSection?.content_markdown ? (
                <div className="space-y-6">
                  {tab === 'profile' ? (
                    <ClientProfileView
                      contentJson={currentSection.content_json as Record<string, unknown> | null}
                      contentMarkdown={currentSection.content_markdown}
                    />
                  ) : (
                    <MarkdownRenderer
                      className="prose prose-sm max-w-none
                        prose-headings:text-foreground prose-headings:font-semibold
                        prose-p:text-muted-foreground prose-p:leading-relaxed
                        prose-li:text-muted-foreground
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-ul:space-y-1 prose-ol:space-y-1
                        [&>*:first-child]:mt-0"
                    >
                      {tab === 'study_material'
                        ? currentSection.content_markdown.replace(/\n## Video Resources[\s\S]*$/, '')
                        : currentSection.content_markdown}
                    </MarkdownRenderer>
                  )}

                  {tab === 'study_material' && (() => {
                    const adminVideos = (currentSection.content_json as { youtube_videos?: YoutubeVideo[] } | null)?.youtube_videos
                    if (!adminVideos?.length) return null
                    return (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Video Resources</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {adminVideos.map((video, idx) => {
                            const thumbUrl = video.video_id
                              ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`
                              : null
                            return (
                              <a
                                key={idx}
                                href={
                                  video.video_id
                                    ? `https://www.youtube.com/watch?v=${video.video_id}`
                                    : `https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
                              >
                                <div className="relative h-32 bg-muted overflow-hidden">
                                  {thumbUrl ? (
                                    <img src={thumbUrl} alt={video.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Play size={24} className="text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-3">
                                  <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <ExternalLink size={10} /> {video.query}
                                  </p>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : currentSection?.status !== 'generating' && (
                <div className="text-center py-20">
                  <p className="text-sm text-muted-foreground">Not generated yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Upload documents and click Regenerate.</p>
                </div>
              )}
            </>
          )}

          {/* Test requests panel */}
          {tab === 'test_requests' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Assigned Tests</h3>
                {!!testRequests?.length && (
                  <span className="text-xs text-muted-foreground">{testRequests.length} total</span>
                )}
              </div>

              {trLoading && (
                <div className="flex items-center justify-center py-16 gap-2">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              )}

              {!trLoading && !testRequests?.length && (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">No test requests yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Assign a test using the panel above.</p>
                </div>
              )}

              <div className="space-y-2">
                {testRequests?.map((req) => {
                  const cfg = TR_STATUS[req.status] ?? { label: req.status }
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-4 border border-border rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck size={16} className="text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{req.engineer_name ?? 'Unknown Engineer'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{cfg.label}</span>
                        {req.status === 'pending' && (
                          <button
                            onClick={() => approveTRMutation.mutate(req.id)}
                            disabled={approveTRMutation.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
