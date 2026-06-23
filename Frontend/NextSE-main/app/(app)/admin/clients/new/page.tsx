'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Factory,
  FileText,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Megaphone,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Upload,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import {
  createClient as createClientApi,
  generateProfile,
  getClient,
  getGenerationStatus,
  uploadClientFiles,
} from '@/lib/api/clients'
import { cn } from '@/lib/utils'

// ── Industry chips ────────────────────────────────────────────────────────
const INDUSTRIES = [
  { label: 'Technology',    icon: Cpu,          color: 'violet' },
  { label: 'Finance',       icon: TrendingUp,   color: 'blue' },
  { label: 'Healthcare',    icon: Heart,        color: 'emerald' },
  { label: 'Retail',        icon: ShoppingBag,  color: 'pink' },
  { label: 'Manufacturing', icon: Factory,      color: 'orange' },
  { label: 'Logistics',     icon: Building2,    color: 'cyan' },
  { label: 'Energy',        icon: Zap,          color: 'yellow' },
  { label: 'Education',     icon: BookOpen,     color: 'purple' },
] as const

const CHIP_COLORS: Record<string, { active: string; hover: string }> = {
  violet:  { active: 'bg-violet-500/15 border-violet-400/60 text-violet-300',    hover: 'hover:border-violet-400/40 hover:text-violet-300' },
  blue:    { active: 'bg-blue-500/15 border-blue-400/60 text-blue-300',          hover: 'hover:border-blue-400/40 hover:text-blue-300' },
  emerald: { active: 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300', hover: 'hover:border-emerald-400/40 hover:text-emerald-300' },
  pink:    { active: 'bg-pink-500/15 border-pink-400/60 text-pink-300',          hover: 'hover:border-pink-400/40 hover:text-pink-300' },
  orange:  { active: 'bg-orange-500/15 border-orange-400/60 text-orange-300',    hover: 'hover:border-orange-400/40 hover:text-orange-300' },
  cyan:    { active: 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300',          hover: 'hover:border-cyan-400/40 hover:text-cyan-300' },
  yellow:  { active: 'bg-yellow-500/15 border-yellow-400/60 text-yellow-300',    hover: 'hover:border-yellow-400/40 hover:text-yellow-300' },
  purple:  { active: 'bg-purple-500/15 border-purple-400/60 text-purple-300',    hover: 'hover:border-purple-400/40 hover:text-purple-300' },
}

// ── Step config ───────────────────────────────────────────────────────────
type Step = 'details' | 'markets' | 'files' | 'generating'

const STEPS: { key: Step; label: string; sub: string }[] = [
  { key: 'details',    label: 'Client Info',    sub: 'Name & industry'     },
  { key: 'markets',   label: 'Target Markets', sub: 'Industries & regions' },
  { key: 'files',     label: 'Documents',      sub: 'Upload references'   },
  { key: 'generating', label: 'AI Generate',   sub: 'Build content'       },
]

// ── Stepper ───────────────────────────────────────────────────────────────
function Stepper({ current }: { current: Step }) {
  const ci = STEPS.findIndex(s => s.key === current)
  return (
    <div className="flex items-start">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 min-w-[52px]">
            <motion.div
              animate={i === ci ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300',
                i < ci  ? 'bg-primary border-primary text-primary-foreground' :
                i === ci ? 'bg-primary/10 border-primary text-primary ring-4 ring-primary/15' :
                           'bg-muted/40 border-border text-muted-foreground'
              )}
            >
              {i < ci ? <CheckCircle2 size={15} /> : <span>{i + 1}</span>}
            </motion.div>
            <div className="text-center">
              <p className={cn('text-[11px] font-semibold leading-tight', i === ci ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </p>
              <p className="text-[9px] text-muted-foreground/60 leading-tight">{s.sub}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 mt-4 mx-1">
              <div className="relative h-0.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: i < ci ? '100%' : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Priority list ─────────────────────────────────────────────────────────
type LucideIcon = React.ComponentType<{ size?: number; className?: string }>

function PriorityList({
  items,
  onChange,
  placeholder,
  icon: Icon,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  icon: LucideIcon
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = input.trim()
    if (!val) return
    onChange([...items, val])
    setInput('')
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))

  const move = (idx: number, dir: 'up' | 'down') => {
    const next = [...items]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl bg-input/60 border border-border/50 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-40 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/40 text-center py-2">
          Type an entry above and press Enter or click +
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2"
            >
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <Icon size={12} className="text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm">{item}</span>
              <button
                type="button"
                onClick={() => move(i, 'up')}
                disabled={i === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 'down')}
                disabled={i === items.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
              >
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function NewClientPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const docsInputRef      = useRef<HTMLInputElement>(null)
  const catalogueInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]       = useState<Step>('details')
  const [clientId, setClientId] = useState<string | null>(null)
  const [name, setName]         = useState('')
  const [industry, setIndustry] = useState('')
  const [targetIndustries, setTargetIndustries] = useState<string[]>([])
  const [targetLocations,  setTargetLocations]  = useState<string[]>([])
  const [customPrompt, setCustomPrompt]         = useState('')

  const { data: clientDetail } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId!),
    enabled: !!clientId && step === 'files',
    refetchInterval: (query) => {
      const files = query.state.data?.files ?? []
      return files.some(f => f.extraction_status === 'pending') ? 2000 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createClientApi({
      name,
      industry,
      target_industries: targetIndustries,
      target_locations:  targetLocations,
    }),
    onSuccess: (client) => { setClientId(client.id); setStep('files') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create client'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ files, category }: { files: File[]; category?: string }) =>
      uploadClientFiles(clientId!, files, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      toast.success('Files uploaded — extracting text in the background')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Upload failed'),
  })

  const generateMutation = useMutation({
    mutationFn: () => generateProfile(clientId!, customPrompt),
    onSuccess: () => setStep('generating'),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not start generation'),
  })

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadMutation.mutate({ files, category })
    e.target.value = ''
  }

  const catalogueFiles = clientDetail?.files.filter(f => f.file_category === 'catalogue') ?? []
  const referenceFiles = clientDetail?.files.filter(f => f.file_category !== 'catalogue') ?? []

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Clients
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold"
        >
          New Client
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="text-muted-foreground mt-1.5 text-sm"
        >
          Create a client, upload reference material, and generate training content
        </motion.p>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Stepper current={step} />
      </motion.div>

      {/* ── Step content ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* STEP 1 — Client Info */}
        {step === 'details' && (
          <motion.form
            key="details"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            onSubmit={(e) => { e.preventDefault(); setStep('markets') }}
            className="space-y-4"
          >
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={12} className="text-primary" />
                  Client Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Capital Extrusion India"
                  className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border/50 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* Industry */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Pencil size={12} className="text-primary" />
                  Industry
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {INDUSTRIES.map(ind => {
                    const Icon = ind.icon
                    const clr = CHIP_COLORS[ind.color]
                    const selected = industry === ind.label
                    return (
                      <motion.button
                        key={ind.label}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setIndustry(ind.label)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all text-[11px] font-medium',
                          selected
                            ? clr.active
                            : `bg-muted/30 border-border/40 text-muted-foreground ${clr.hover}`
                        )}
                      >
                        <Icon size={16} />
                        {ind.label}
                      </motion.button>
                    )
                  })}
                </div>

                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="Or type a custom industry…"
                  className="w-full px-4 py-2.5 rounded-xl bg-input/60 border border-border/50 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={!name.trim() || !industry.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm disabled:opacity-40 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            >
              Continue to Target Markets →
            </motion.button>
          </motion.form>
        )}

        {/* STEP 2 — Target Markets */}
        {step === 'markets' && (
          <motion.div
            key="markets"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">

              {/* Target Industries */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 size={15} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Target Industries</p>
                    <p className="text-xs text-muted-foreground">Priority order — highest first</p>
                  </div>
                </div>
                <PriorityList
                  items={targetIndustries}
                  onChange={setTargetIndustries}
                  placeholder="e.g. Automotive, Pharma, FMCG…"
                  icon={Building2}
                />
              </div>

              <div className="border-t border-border/40" />

              {/* Target Locations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <MapPin size={15} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Target Locations</p>
                    <p className="text-xs text-muted-foreground">Priority order — highest first</p>
                  </div>
                </div>
                <PriorityList
                  items={targetLocations}
                  onChange={setTargetLocations}
                  placeholder="e.g. Mumbai, Pune, Gujarat…"
                  icon={Globe}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm disabled:opacity-40 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            >
              {createMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Creating client…
                </span>
              ) : (
                'Continue to Documents →'
              )}
            </motion.button>
          </motion.div>
        )}

        {/* STEP 3 — Documents + prompt */}
        {step === 'files' && clientId && (
          <motion.div
            key="files"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            {/* Hidden file inputs */}
            <input
              ref={catalogueInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.md"
              className="hidden"
              onChange={(e) => handleFilesSelected(e, 'catalogue')}
            />
            <input
              ref={docsInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.md"
              className="hidden"
              onChange={(e) => handleFilesSelected(e, 'reference')}
            />

            {/* ── Product Catalogue ── */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Package size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Product Catalogue</p>
                    <p className="text-xs text-muted-foreground">Primary product / pricing document</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => catalogueInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {uploadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              {catalogueFiles.length === 0 ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => catalogueInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-orange-400/20 rounded-xl py-8 flex flex-col items-center gap-3 hover:border-orange-400/40 hover:bg-orange-500/5 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/15 flex items-center justify-center transition-colors">
                    <Package size={22} className="text-orange-400/60 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Upload product catalogue
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">PDF, DOCX, TXT, CSV, MD</p>
                  </div>
                </motion.button>
              ) : (
                <ul className="space-y-2">
                  {catalogueFiles.map((file, i) => (
                    <FileRow key={file.id} file={file} index={i} />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Reference Documents ── */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Reference Documents</p>
                    <p className="text-xs text-muted-foreground">Brochures, technical docs, presentations</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => docsInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {uploadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              {referenceFiles.length === 0 ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => docsInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border/40 rounded-xl py-8 flex flex-col items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Upload size={22} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">PDF, DOCX, TXT, CSV, MD — optional</p>
                  </div>
                </motion.button>
              ) : (
                <ul className="space-y-2">
                  {referenceFiles.map((file, i) => (
                    <FileRow key={file.id} file={file} index={i} />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Prompt + generate ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!customPrompt.trim()) { toast.error('Add a prompt to guide AI generation'); return }
                generateMutation.mutate()
              }}
              className="bg-card border border-border/60 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Generation Instructions</p>
                  <p className="text-xs text-muted-foreground">Guide the AI on focus areas and key differentiators</p>
                </div>
              </div>

              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus on enterprise security features and competitive differentiation vs. legacy vendors. Highlight ROI and integration capabilities…"
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-input/60 border border-border/50 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm transition-all"
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: User,      label: 'Client Profile' },
                  { icon: BookOpen,  label: 'Study Material' },
                  { icon: Megaphone, label: 'Sales Pitch' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5">
                    <Icon size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm disabled:opacity-40 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                {generateMutation.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Starting generation…</>
                ) : (
                  <><Sparkles size={15} /> Generate All Content</>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* STEP 4 — Generating */}
        {step === 'generating' && clientId && (
          <GeneratingPanel
            key="generating"
            clientId={clientId}
            onDone={() => router.push(`/admin/clients/${clientId}`)}
          />
        )}

      </AnimatePresence>
    </div>
  )
}

// ── File row ──────────────────────────────────────────────────────────────
function FileRow({ file, index }: {
  file: { id: string; file_name: string; extraction_status: string }
  index: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText size={14} className="text-primary" />
      </div>
      <span className="flex-1 text-xs font-medium truncate">{file.file_name}</span>
      {file.extraction_status === 'pending' && (
        <span className="flex items-center gap-1 text-[10px] text-amber-400">
          <Loader2 size={11} className="animate-spin" /> Extracting
        </span>
      )}
      {file.extraction_status === 'done'   && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
      {file.extraction_status === 'failed' && <XCircle size={14} className="text-red-400 flex-shrink-0" />}
    </motion.li>
  )
}

// ── Generating panel ──────────────────────────────────────────────────────
function GeneratingPanel({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { data: status } = useQuery({
    queryKey: ['generation-status', clientId],
    queryFn: () => getGenerationStatus(clientId),
    refetchInterval: (query) => {
      const overall = query.state.data?.overall_status
      return overall === 'generating' || overall === undefined ? 1500 : false
    },
  })

  const sections = [
    { label: 'Client Profile',  icon: User,      status: status?.profile_status,       error: status?.profile_error },
    { label: 'Study Material',  icon: BookOpen,  status: status?.study_material_status, error: status?.study_material_error },
    { label: 'Sales Pitch',     icon: Megaphone, status: status?.sales_pitch_status,    error: status?.sales_pitch_error },
  ]

  const overall = status?.overall_status
  const isDone  = overall === 'ready' || overall === 'edited'
  const isFail  = overall === 'failed'

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isDone ? 'bg-emerald-500/10' : 'bg-primary/10'
            )}>
              {isDone
                ? <CheckCircle2 size={20} className="text-emerald-400" />
                : <Sparkles size={20} className="text-primary" />}
            </div>
            {!isDone && !isFail && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping opacity-60" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isDone ? 'Content generated!' : isFail ? 'Some sections failed' : 'Generating training content…'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isDone ? 'All three sections are ready to review' : 'This may take 30–60 seconds'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {sections.map((s, i) => {
            const Icon = s.icon
            const isRunning = s.status === 'generating' || s.status === undefined
            const isReady   = s.status === 'ready' || s.status === 'edited'
            const isFailed  = s.status === 'failed'

            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  isReady ? 'bg-emerald-500/10' : isFailed ? 'bg-red-500/10' : 'bg-primary/10'
                )}>
                  <Icon size={15} className={cn(
                    isReady ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-primary'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  {isFailed && s.error && (
                    <p className="text-xs text-red-400 truncate">{s.error}</p>
                  )}
                  {isRunning && (
                    <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/60 rounded-full"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {isRunning && <Loader2 size={16} className="animate-spin text-primary" />}
                  {isReady   && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </motion.div>
                  )}
                  {isFailed  && <XCircle size={16} className="text-red-400" />}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {(isDone || isFail) && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={onDone}
            className={cn(
              'w-full py-3.5 rounded-xl font-semibold text-sm shadow-lg transition-shadow',
              isDone
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-primary/20 hover:shadow-primary/30'
                : 'border border-red-400/40 text-red-400 hover:bg-red-500/10'
            )}
          >
            {isDone ? 'View Generated Content →' : 'Some sections failed — open client to retry'}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
