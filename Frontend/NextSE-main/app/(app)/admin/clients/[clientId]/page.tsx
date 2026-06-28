'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Cpu,
  ExternalLink,
  Eye,
  Factory,
  FileText,
  Heart,
  Loader2,
  Megaphone,
  Package,
  Pencil,
  Play,
  RefreshCw,
  Rocket,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  XCircle,
  Zap,
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

// ── Industry visual config ──────────────────────────────────────────────────
interface IndustryVisual {
  gradient: string
  icon: React.ElementType
  patternClass: string
}

const INDUSTRY_VISUALS: Record<string, IndustryVisual> = {
  manufacturing: {
    gradient: 'from-orange-600 via-amber-500 to-yellow-500',
    icon: Factory,
    patternClass: '[background-image:repeating-linear-gradient(45deg,white_0,white_1px,transparent_0,transparent_50%)] [background-size:12px_12px]',
  },
  technology: {
    gradient: 'from-violet-600 via-purple-500 to-blue-500',
    icon: Cpu,
    patternClass: '[background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]',
  },
  healthcare: {
    gradient: 'from-emerald-600 via-teal-500 to-cyan-500',
    icon: Heart,
    patternClass: '[background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:12px_12px]',
  },
  finance: {
    gradient: 'from-blue-700 via-indigo-600 to-blue-500',
    icon: TrendingUp,
    patternClass: '[background-image:repeating-linear-gradient(90deg,white_0,white_1px,transparent_0,transparent_50%)] [background-size:20px_20px]',
  },
  retail: {
    gradient: 'from-pink-600 via-rose-500 to-pink-400',
    icon: ShoppingBag,
    patternClass: '[background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:14px_14px]',
  },
  energy: {
    gradient: 'from-yellow-500 via-orange-500 to-amber-600',
    icon: Zap,
    patternClass: '[background-image:repeating-linear-gradient(-45deg,white_0,white_1px,transparent_0,transparent_50%)] [background-size:10px_10px]',
  },
}

function getVisual(industry: string): IndustryVisual {
  const key = industry.toLowerCase()
  const match = Object.entries(INDUSTRY_VISUALS).find(([k]) => key.includes(k))
  return match?.[1] ?? {
    gradient: 'from-primary via-secondary to-accent',
    icon: Building2,
    patternClass: '[background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]',
  }
}

// ── Tab config ──────────────────────────────────────────────────────────────
const TAB_CONFIG: Record<Tab, { label: string; icon: React.ElementType }> = {
  profile:        { label: 'Client Profile',  icon: User },
  study_material: { label: 'Study Material',  icon: BookOpen },
  sales_pitch:    { label: 'Sales Pitch',     icon: Megaphone },
  test_requests:  { label: 'Test Requests',   icon: ClipboardList },
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: GeneratedContent['status'] | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        Not generated
      </span>
    )
  }
  const config = {
    generating: { dot: 'bg-amber-400 animate-pulse',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  label: 'Generating…' },
    ready:      { dot: 'bg-emerald-400',               bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Ready' },
    edited:     { dot: 'bg-sky-400',                   bg: 'bg-sky-500/10',    text: 'text-sky-400',    label: 'Edited' },
    failed:     { dot: 'bg-red-400',                   bg: 'bg-red-500/10',    text: 'text-red-400',    label: 'Failed' },
  }[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', config.bg, config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

const TR_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   label: 'Pending' },
  approved:    { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  label: 'Approved' },
  in_progress: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     label: 'In Progress' },
  completed:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const strategyFileInputRef = useRef<HTMLInputElement>(null)

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

  const invalidate    = () => queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  const invalidateTR  = () => queryClient.invalidateQueries({ queryKey: ['admin-test-requests', clientId] })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadClientFiles(clientId, files),
    onSuccess: () => { invalidate(); toast.success('Files uploaded') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Upload failed'),
  })
  const strategyUploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadClientFiles(clientId, files, 'strategy'),
    onSuccess: () => { invalidate(); toast.success('Strategy documents uploaded') },
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
    onSuccess: () => { invalidate(); toast.success('Client published — visible to engineers now') },
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

  // ── Loading / error states ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading client…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-10 text-center">
        <XCircle size={36} className="text-destructive mx-auto mb-3" />
        <p className="text-destructive font-medium">Could not load this client.</p>
      </div>
    )
  }

  const visual = getVisual(data.client.industry)
  const IndustryIcon = visual.icon

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
  const handleStrategyFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) strategyUploadMutation.mutate(files)
    e.target.value = ''
  }

  const sectionDot = (key: GenerationSection) => {
    const s = sectionContent[key]?.status
    if (!s) return null
    const dot: Record<string, string> = {
      ready: 'bg-emerald-400', edited: 'bg-sky-400',
      generating: 'bg-amber-400 animate-pulse', failed: 'bg-red-400',
    }
    return <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot[s])} />
  }

  return (
    <div className="space-y-5 pb-14">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl min-h-[180px]"
      >
        {/* Gradient base */}
        <div className={cn('absolute inset-0 bg-gradient-to-br', visual.gradient)} />
        {/* Dot/line pattern */}
        <div className={cn('absolute inset-0 opacity-[0.08]', visual.patternClass)} />
        {/* Ambient glows */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        {/* Large faded icon watermark */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <IndustryIcon size={140} className="text-white" />
        </div>

        <div className="relative px-8 py-8 flex items-center justify-between gap-6 flex-wrap">
          {/* Left: icon + name */}
          <div className="flex items-center gap-5">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-[72px] h-[72px] rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl flex-shrink-0"
            >
              <IndustryIcon size={34} className="text-white drop-shadow" />
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/20 text-white/90 backdrop-blur-sm capitalize tracking-wide">
                  {data.client.industry}
                </span>
                <span className={cn(
                  'text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm',
                  data.client.status === 'published'
                    ? 'bg-emerald-400/25 text-emerald-100'
                    : 'bg-white/20 text-white/80'
                )}>
                  {data.client.status === 'published' ? '✓ Published' : 'Draft'}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                {data.client.name}
              </h1>
              <p className="text-white/60 text-sm mt-1.5">
                {data.files.length} document{data.files.length !== 1 ? 's' : ''} ·{' '}
                <span className={readySections === 3 ? 'text-emerald-300' : 'text-white/60'}>
                  {readySections}/3 sections ready
                </span>
              </p>
            </div>
          </div>

          {/* Right: action */}
          {data.client.status === 'draft' ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => publishMutation.mutate()}
              disabled={!allReady || publishMutation.isPending}
              title={allReady ? 'Publish to engineers' : 'All 3 sections must be ready first'}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-shadow"
            >
              {publishMutation.isPending
                ? <Loader2 size={17} className="animate-spin" />
                : <Rocket size={17} />}
              {publishMutation.isPending ? 'Publishing…' : 'Publish Client'}
            </motion.button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-medium text-sm">
              <CheckCircle2 size={17} />
              Live to Engineers
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ INFO ROW (files + contextual side card) ═══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Files card */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText size={15} className="text-primary" />
              </div>
              <span className="font-semibold text-sm">Reference Documents</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
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
              className="w-full border-2 border-dashed border-border/50 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
            >
              <Upload size={22} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground/50">PDF, DOCX, TXT, CSV, MD</p>
            </button>
          ) : (
            <ul className="space-y-1.5">
              {data.files.map((file, i) => (
                <motion.li
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-muted/40 hover:bg-muted/70 rounded-xl px-3 py-2.5 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={13} className="text-primary" />
                  </div>
                  <span className="flex-1 text-xs font-medium truncate">{file.file_name}</span>
                  <div className="flex items-center gap-2">
                    {file.extraction_status === 'pending' && <Loader2 size={12} className="animate-spin text-amber-400" />}
                    {file.extraction_status === 'done'    && <CheckCircle2 size={12} className="text-emerald-400" />}
                    {file.extraction_status === 'failed'  && <XCircle size={12} className="text-red-400" />}
                    <button
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      aria-label={`Delete ${file.file_name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Contextual side card: Regenerate | Assign Test */}
        <AnimatePresence mode="wait">
          {tab !== 'test_requests' ? (
            <motion.div
              key="regen"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ delay: 0.12 }}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Sparkles size={15} className="text-secondary" />
                </div>
                <span className="font-semibold text-sm">Regenerate Content</span>
              </div>
              <textarea
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="Custom instructions (optional — leave blank to reuse last prompt)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border/50 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => regenerateMutation.mutate(undefined)}
                  disabled={regenerateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border/60 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                  Regenerate All
                </button>
                <button
                  onClick={() => regenerateMutation.mutate(tab as GenerationSection)}
                  disabled={regenerateMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                  This Section
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="assign"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ delay: 0.12 }}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <UserCheck size={15} className="text-accent" />
                </div>
                <span className="font-semibold text-sm">Assign Test to Engineer</span>
              </div>
              <select
                value={selectedEngineerId}
                onChange={(e) => setSelectedEngineerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <ClipboardList size={14} />
                {createTRMutation.isPending ? 'Assigning…' : 'Assign Test'}
              </button>
              {engineers?.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center">
                  No engineers yet — create accounts via Signup and promote via Admin → Users.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ STRATEGY DOCUMENTS ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={15} className="text-emerald-500" />
            </div>
            <div>
              <span className="font-semibold text-sm">Strategy Documents</span>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                GTM plans, territory plans, pricing docs — used to generate the Strategy Building module
              </p>
            </div>
          </div>
          <button
            onClick={() => strategyFileInputRef.current?.click()}
            disabled={strategyUploadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {strategyUploadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {strategyUploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={strategyFileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv,.md"
            className="hidden"
            onChange={handleStrategyFilesSelected}
          />
        </div>

        {(() => {
          const strategyFiles = data.files.filter(f => f.file_category === 'strategy')
          if (strategyFiles.length === 0) {
            return (
              <button
                onClick={() => strategyFileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border/50 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group cursor-pointer"
              >
                <TrendingUp size={20} className="text-muted-foreground/50 group-hover:text-emerald-500 transition-colors" />
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Upload strategy documents (optional)
                </p>
                <p className="text-xs text-muted-foreground/50">PDF, DOCX, TXT, CSV, MD</p>
              </button>
            )
          }
          return (
            <ul className="space-y-1.5">
              {strategyFiles.map((file, i) => (
                <motion.li
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl px-3 py-2.5 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={13} className="text-emerald-500" />
                  </div>
                  <span className="flex-1 text-xs font-medium truncate">{file.file_name}</span>
                  <div className="flex items-center gap-2">
                    {file.extraction_status === 'pending' && <Loader2 size={12} className="animate-spin text-amber-400" />}
                    {file.extraction_status === 'done'    && <CheckCircle2 size={12} className="text-emerald-400" />}
                    {file.extraction_status === 'failed'  && <XCircle size={12} className="text-red-400" />}
                    <button
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      aria-label={`Delete ${file.file_name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )
        })()}
      </motion.div>

      {/* ══ TABS + CONTENT ════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="bg-card border border-border/60 rounded-2xl overflow-hidden"
      >
        {/* Tab bar */}
        <div className="flex border-b border-border/60 overflow-x-auto">
          {(['profile', 'study_material', 'sales_pitch', 'test_requests'] as const).map((key) => {
            const { label, icon: Icon } = TAB_CONFIG[key]
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setIsEditing(false) }}
                className={cn(
                  'relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                <Icon size={15} />
                {label}
                {key !== 'test_requests' && sectionDot(key as GenerationSection)}
                {active && (
                  <motion.div
                    layoutId="active-tab-line"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Content panels */}
        <AnimatePresence mode="wait">

          {/* Generation section panel */}
          {tab !== 'test_requests' && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-6 space-y-5"
            >
              {/* Section header row */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={currentSection?.status} />
                  {currentSection?.updated_at && (
                    <span className="text-xs text-muted-foreground/50">
                      {new Date(currentSection.updated_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tab === 'profile' && currentSection?.content_markdown && !isEditing && (
                    <button
                      onClick={() => { setDraftMarkdown(currentSection.content_markdown ?? ''); setIsEditing(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium transition-colors"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => regenerateMutation.mutate(tab as GenerationSection)}
                    disabled={regenerateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Catalogue preview — only shown in profile tab */}
              {tab === 'profile' && (() => {
                const catalogueFiles = data.files.filter(f => f.file_category === 'catalogue')
                if (!catalogueFiles.length) return null
                return (
                  <div className="border border-orange-500/30 rounded-2xl overflow-hidden bg-orange-500/5">
                    <button
                      onClick={() => setCatalogueOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <Package size={14} className="text-orange-400" />
                        </div>
                        <span className="text-sm font-semibold text-orange-300">
                          Product Catalogue
                        </span>
                        <span className="text-xs text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full">
                          {catalogueFiles.length} file{catalogueFiles.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {catalogueOpen
                        ? <ChevronUp size={15} className="text-orange-400/60" />
                        : <ChevronDown size={15} className="text-orange-400/60" />}
                    </button>

                    {catalogueOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* File selector buttons */}
                        <div className="flex flex-wrap gap-2">
                          {catalogueFiles.map(file => (
                            <button
                              key={file.id}
                              onClick={() => loadCataloguePreview(file.id)}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border',
                                previewFileId === file.id
                                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                                  : 'bg-muted/40 border-border/50 text-muted-foreground hover:border-orange-500/30 hover:text-orange-300'
                              )}
                            >
                              <FileText size={12} />
                              <span className="max-w-[180px] truncate">{file.file_name}</span>
                              <Eye size={11} className="shrink-0 opacity-60" />
                            </button>
                          ))}
                        </div>

                        {/* Preview pane */}
                        {previewFileId && catalogueFiles.some(f => f.id === previewFileId) && (
                          <div className="rounded-xl overflow-hidden border border-orange-500/20 bg-black/30">
                            {previewLoading ? (
                              <div className="flex flex-col items-center justify-center h-40 gap-2">
                                <Loader2 size={20} className="animate-spin text-orange-400/60" />
                                <p className="text-xs text-muted-foreground">Loading preview…</p>
                              </div>
                            ) : previewUrl ? (
                              (() => {
                                const file = catalogueFiles.find(f => f.id === previewFileId)
                                const isPdf = file?.mime_type === 'application/pdf'
                                return isPdf ? (
                                  <iframe
                                    src={previewUrl}
                                    className="w-full"
                                    style={{ height: '680px' }}
                                    title={file?.file_name}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <FileText size={28} className="text-orange-400/50" />
                                    <p className="text-xs text-muted-foreground text-center">
                                      In-browser preview not supported for this file type.
                                    </p>
                                    <a
                                      href={previewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-medium hover:bg-orange-500/30 transition-colors"
                                    >
                                      <ExternalLink size={12} />
                                      Open / Download
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
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-xs text-destructive">
                  <XCircle size={15} className="shrink-0 mt-0.5" />
                  {currentSection.error_message}
                </div>
              )}

              {/* Generating */}
              {currentSection?.status === 'generating' && (
                <div className="flex flex-col items-center gap-3 py-20">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles size={16} className="absolute inset-0 m-auto text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">Generating content with AI…</p>
                </div>
              )}

              {/* Edit textarea */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={draftMarkdown}
                    onChange={(e) => setDraftMarkdown(e.target.value)}
                    rows={18}
                    className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border/50 text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => patchMutation.mutate(draftMarkdown)}
                      disabled={patchMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {patchMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      {patchMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl border border-border/60 text-xs hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : currentSection?.content_markdown ? (
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {/* Rich visual layout for profile; plain markdown for other tabs */}
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
                  </motion.div>

                  {tab === 'study_material' && (() => {
                    const adminVideos = (currentSection.content_json as { youtube_videos?: YoutubeVideo[] } | null)?.youtube_videos
                    if (!adminVideos?.length) return null
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center">
                            <Play size={12} className="text-white" fill="white" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Video Resources</h3>
                        </div>
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
                                className="group flex flex-col rounded-xl overflow-hidden border border-red-200 hover:border-red-500 hover:shadow-lg transition-all"
                              >
                                <div className="relative h-32 bg-gradient-to-br from-red-600 to-rose-700 overflow-hidden">
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={video.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                        <Play size={24} className="text-white ml-1" fill="white" />
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-200">
                                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 shadow-xl">
                                      <Play size={20} className="text-white ml-1" fill="white" />
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-red-500">
                                      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z" />
                                    </svg>
                                    <span className="text-white text-[10px] font-bold">
                                      {video.video_id ? 'Watch' : 'Search'}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-white p-3 flex flex-col gap-1 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{video.title}</p>
                                  <p className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                                    <ExternalLink size={10} className="shrink-0" />
                                    {video.query}
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
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Not generated yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    Upload reference documents and click Regenerate to get started.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Test requests panel */}
          {tab === 'test_requests' && (
            <motion.div
              key="test_requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Assigned Tests</h3>
                {!!testRequests?.length && (
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                    {testRequests.length} total
                  </span>
                )}
              </div>

              {trLoading && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2 size={24} className="animate-spin text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Loading…</p>
                </div>
              )}

              {!trLoading && !testRequests?.length && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <ClipboardList size={24} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No test requests yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    Assign a test using the panel on the left.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {testRequests?.map((req, i) => {
                  const cfg = TR_STATUS[req.status] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground', label: req.status }
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between gap-4 bg-muted/30 hover:bg-muted/50 rounded-xl px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserCheck size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.engineer_name ?? 'Unknown Engineer'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.requested_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                        {req.status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => approveTRMutation.mutate(req.id)}
                            disabled={approveTRMutation.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
