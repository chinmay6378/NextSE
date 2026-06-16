'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, Loader2, Sparkles, Upload, XCircle } from 'lucide-react'
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

const INDUSTRY_SUGGESTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Insurance',
  'Logistics',
  'Education',
]

type Step = 'details' | 'files' | 'generating'

export default function NewClientPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('details')
  const [clientId, setClientId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  const { data: clientDetail } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId!),
    enabled: !!clientId && step === 'files',
    refetchInterval: (query) => {
      const files = query.state.data?.files ?? []
      return files.some((f) => f.extraction_status === 'pending') ? 2000 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createClientApi({ name, industry }),
    onSuccess: (client) => {
      setClientId(client.id)
      setStep('files')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not create client'),
  })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadClientFiles(clientId!, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      toast.success('Files uploaded — extracting text in the background')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Upload failed'),
  })

  const generateMutation = useMutation({
    mutationFn: () => generateProfile(clientId!, customPrompt),
    onSuccess: () => setStep('generating'),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not start generation'),
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadMutation.mutate(files)
    e.target.value = ''
  }

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPrompt.trim()) {
      toast.error('Add a custom prompt to guide generation')
      return
    }
    generateMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Client</h1>
        <p className="text-muted-foreground mt-2">Create a client, upload reference material, and generate training content</p>
      </div>

      {step === 'details' && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateSubmit}
          className="bg-card border border-border rounded-lg p-6 space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Client Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Industry</label>
            <input
              type="text"
              list="industry-suggestions"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Technology"
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <datalist id="industry-suggestions">
              {INDUSTRY_SUGGESTIONS.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full mt-2 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            {createMutation.isPending ? 'Creating…' : 'Continue'}
          </button>
        </motion.form>
      )}

      {step === 'files' && clientId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Reference Documents</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload size={16} />
                {uploadMutation.isPending ? 'Uploading…' : 'Upload Files'}
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

            {(clientDetail?.files.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No files yet. Optional — you can also generate from the custom prompt alone.
              </p>
            ) : (
              <ul className="space-y-2">
                {clientDetail!.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <FileText size={16} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.file_name}</span>
                    {file.extraction_status === 'pending' && (
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    )}
                    {file.extraction_status === 'done' && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {file.extraction_status === 'failed' && <XCircle size={14} className="text-destructive" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleGenerateSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Custom Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Focus on enterprise security features and competitive differentiation vs. legacy vendors…"
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <Sparkles size={18} />
              {generateMutation.isPending ? 'Starting…' : 'Generate Profile, Study Material & Pitch'}
            </button>
          </form>
        </motion.div>
      )}

      {step === 'generating' && clientId && (
        <GeneratingPanel clientId={clientId} onDone={() => router.push(`/admin/clients/${clientId}`)} />
      )}
    </div>
  )
}

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
    { label: 'Client Profile', status: status?.profile_status, error: status?.profile_error },
    { label: 'Study Material', status: status?.study_material_status, error: status?.study_material_error },
    { label: 'Sales Pitch', status: status?.sales_pitch_status, error: status?.sales_pitch_error },
  ]

  const overall = status?.overall_status

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 space-y-4"
    >
      <h2 className="font-semibold">Generating training content…</h2>
      <ul className="space-y-3">
        {sections.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            {s.status === 'generating' || s.status === undefined ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : s.status === 'failed' ? (
              <XCircle size={18} className="text-destructive" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-400" />
            )}
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              {s.status === 'failed' && s.error && <p className="text-xs text-destructive">{s.error}</p>}
            </div>
          </li>
        ))}
      </ul>

      {(overall === 'ready' || overall === 'edited') && (
        <button
          onClick={onDone}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          View Generated Content
        </button>
      )}
      {overall === 'failed' && (
        <button
          onClick={onDone}
          className="w-full py-2.5 rounded-lg border border-destructive/50 text-destructive font-medium hover:bg-destructive/10 transition-colors"
        >
          Some sections failed — open client to retry
        </button>
      )}
    </motion.div>
  )
}
