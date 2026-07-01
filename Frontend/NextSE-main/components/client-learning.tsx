'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Building2, ChevronRight, CheckCircle2, ExternalLink, FileText,
  FlipHorizontal, Megaphone, MessageCircle, Play, X,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { ClientChatbot } from '@/components/client-chatbot'

import {
  getEngineerProgress, getSalesPitch, getStudyMaterial, updateEngineerProgress,
} from '@/lib/api/study'
import { getClient } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/client'
import type { StudyMaterialContent, YoutubeVideo } from '@/lib/api/types'

interface ClientLearningProps {
  clientId: string
  clientName: string
}

type ActiveTab = 'profile' | 'study' | 'pitch' | 'chat'

type SelectedItem =
  | { kind: 'module';      sectionId: string; title: string; content: string }
  | { kind: 'flashcard';   sectionId: string; front: string; back: string }
  | { kind: 'cheat-sheet'; sectionId: string; content: string }

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
}

const TABS: { id: ActiveTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'profile', label: 'Client Profile', icon: Building2 },
  { id: 'study',   label: 'Study Material', icon: BookOpen },
  { id: 'pitch',   label: 'Sales Pitch',    icon: Megaphone },
  { id: 'chat',    label: 'Ask AI',         icon: MessageCircle },
]

export function ClientLearning({ clientId, clientName }: ClientLearningProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile')
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [activeVideo, setActiveVideo] = useState<YoutubeVideo | null>(null)

  const { data: clientDetail, isLoading: profileLoading } = useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => getClient(clientId),
  })

  const { data: studyMaterial, isLoading: materialLoading, isError: materialIsError } = useQuery({
    queryKey: ['study-material', clientId],
    queryFn: () => getStudyMaterial(clientId),
    retry: (count, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return count < 2
    },
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? 4000 : false,
  })

  const { data: salesPitch } = useQuery({
    queryKey: ['sales-pitch', clientId],
    queryFn: () => getSalesPitch(clientId),
  })

  const { data: progress } = useQuery({
    queryKey: ['engineer-progress', clientId],
    queryFn: () => getEngineerProgress(clientId),
  })

  const markStudied = useMutation({
    mutationFn: (sectionId: string) => updateEngineerProgress(clientId, sectionId, true),
    onSuccess: (data) => queryClient.setQueryData(['engineer-progress', clientId], data),
  })

  const content = studyMaterial?.content_json as StudyMaterialContent | undefined
  const modules = content?.modules ?? []
  const flashcards = content?.flashcards ?? []
  const cheatSheet = content?.cheat_sheet
  const youtubeVideos: YoutubeVideo[] = content?.youtube_videos ?? []
  const studiedSections = progress?.studied_sections ?? {}
  const percentComplete = Math.round(progress?.studied_percent ?? 0)

  const handleComplete = () => {
    if (selected) {
      markStudied.mutate(selected.sectionId)
      setSelected(null)
    }
  }

  if (materialLoading && profileLoading) {
    return (
      <div className="flex justify-center py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
        />
      </div>
    )
  }

  return (
    <motion.div className="space-y-7" variants={container} initial="hidden" animate="show">

      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Learning Hub: {clientName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Study comprehensive materials to master this client</p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={item} className="flex gap-1 bg-muted/50 rounded-2xl p-1.5 border border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── CLIENT PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <motion.div
          key="profile-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {profileLoading ? (
            <div className="flex justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
              />
            </div>
          ) : clientDetail?.profile?.content_markdown ? (
            <div className="bg-card border border-border rounded-2xl p-6">
              <MarkdownRenderer className="prose prose-sm max-w-none">
                {clientDetail.profile.content_markdown}
              </MarkdownRenderer>
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="text-muted-foreground" size={22} />
              </div>
              <p className="text-foreground font-semibold mb-1.5">Client profile not available</p>
              <p className="text-muted-foreground text-sm">Ask your admin to generate the profile for {clientName}.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── SALES PITCH TAB ── */}
      {activeTab === 'pitch' && (
        <motion.div
          key="pitch-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {salesPitch?.content_markdown ? (
            <div className="bg-card border border-border rounded-2xl p-6">
              <MarkdownRenderer className="prose prose-sm max-w-none">
                {salesPitch.content_markdown}
              </MarkdownRenderer>
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Megaphone className="text-muted-foreground" size={22} />
              </div>
              <p className="text-foreground font-semibold mb-1.5">Sales pitch not generated yet</p>
              <p className="text-muted-foreground text-sm">Ask your admin to generate the sales pitch for {clientName}.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── STUDY MATERIAL TAB ── */}
      {activeTab === 'study' && (
        <motion.div
          key="study-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Progress */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <BookOpen size={13} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Learning Progress</h3>
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-primary"
              >
                {percentComplete}%
              </motion.span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentComplete}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, oklch(0.618 0.195 38), oklch(0.540 0.210 15))' }}
              />
            </div>
            {percentComplete === 100 && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} /> All sections complete — ready for the test!
              </motion.p>
            )}
          </div>

          {/* Error / generating / empty states */}
          {materialLoading ? (
            <div className="flex justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
              />
            </div>
          ) : materialIsError ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-amber-500" size={22} />
              </div>
              <p className="text-foreground font-semibold mb-1.5">Study material hasn&apos;t been generated yet</p>
              <p className="text-muted-foreground text-sm">Ask your admin to generate study material for {clientName}.</p>
            </div>
          ) : studyMaterial?.status === 'generating' ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-4"
              />
              <p className="text-foreground font-semibold mb-1.5">Generating study material…</p>
              <p className="text-muted-foreground text-sm">This takes about a minute. The page will refresh automatically.</p>
            </div>
          ) : studyMaterial?.status === 'failed' ? (
            <div className="text-center py-16 bg-card border border-red-100 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-red-400" size={22} />
              </div>
              <p className="text-foreground font-semibold mb-1.5">Generation failed</p>
              <p className="text-muted-foreground text-sm">Contact your admin to regenerate study material for {clientName}.</p>
            </div>
          ) : !content && studyMaterial?.content_markdown ? (
            /* content_json is null but markdown exists — render markdown directly */
            <div className="bg-card border border-border rounded-2xl p-6">
              <MarkdownRenderer className="prose prose-sm max-w-none">
                {studyMaterial.content_markdown}
              </MarkdownRenderer>
            </div>
          ) : !content ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-muted-foreground" size={22} />
              </div>
              <p className="text-foreground font-semibold mb-1.5">Study material isn&apos;t ready yet</p>
              <p className="text-muted-foreground text-sm">Check back once an admin has generated it for {clientName}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Modules */}
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center">
                    <BookOpen size={13} className="text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">Learning Modules</h2>
                </div>
                <div className="space-y-2">
                  {modules.map((module, idx) => {
                    const sectionId = `module-${idx}`
                    const done = studiedSections[sectionId]
                    return (
                      <motion.div
                        key={sectionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ x: 4, transition: { duration: 0.15 } }}
                        onClick={() => setSelected({ kind: 'module', sectionId, title: module.title, content: module.content })}
                        className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-muted-foreground/30 hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                              {done && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                              {module.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{module.content}</p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.section>

              {/* Flashcards */}
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.07, ease: [0.16, 1, 0.3, 1] }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                    <FlipHorizontal size={13} className="text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">Flashcards</h2>
                </div>
                <div className="space-y-2">
                  {flashcards.map((card, idx) => {
                    const sectionId = `flashcard-${idx}`
                    return (
                      <motion.div
                        key={sectionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ x: 4, transition: { duration: 0.15 } }}
                        onClick={() => { setFlipped(false); setSelected({ kind: 'flashcard', sectionId, front: card.front, back: card.back }) }}
                        className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 cursor-pointer hover:border-violet-300 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 mb-0.5">Question</p>
                            <h3 className="font-semibold text-sm text-foreground line-clamp-2">{card.front}</h3>
                          </div>
                          {studiedSections[sectionId] && (
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.section>

              {/* Cheat Sheet */}
              {cheatSheet && (
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.14, ease: [0.16, 1, 0.3, 1] }} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <FileText size={13} className="text-white" />
                    </div>
                    <h2 className="text-base font-semibold text-foreground">Quick Reference</h2>
                  </div>
                  <motion.div
                    whileHover={{ x: 4, transition: { duration: 0.15 } }}
                    onClick={() => setSelected({ kind: 'cheat-sheet', sectionId: 'cheat-sheet', content: cheatSheet })}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:border-amber-300 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          {studiedSections['cheat-sheet'] && <CheckCircle2 size={14} className="text-emerald-500" />}
                          Cheat Sheet
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cheatSheet}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </motion.div>
                </motion.section>
              )}

              {/* YouTube Videos */}
              {youtubeVideos.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.21, ease: [0.16, 1, 0.3, 1] }} className="space-y-3 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
                      <Play size={13} className="text-white" fill="white" />
                    </div>
                    <h2 className="text-base font-semibold text-foreground">Video Resources</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {youtubeVideos.map((video, idx) => {
                      const thumbUrl = video.video_id
                        ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`
                        : null
                      const handleVideoClick = () => {
                        if (video.video_id) {
                          setActiveVideo(video)
                        } else {
                          window.open(
                            `https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`,
                            '_blank',
                            'noopener,noreferrer',
                          )
                        }
                      }
                      return (
                        <motion.button
                          key={idx}
                          onClick={handleVideoClick}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          className="group flex flex-col rounded-xl overflow-hidden border border-red-200 hover:border-red-500 hover:shadow-lg transition-all text-left w-full"
                        >
                          <div className="relative h-36 bg-gradient-to-br from-red-600 to-rose-700 overflow-hidden">
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                  <Play size={28} className="text-white ml-1" fill="white" />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-200">
                              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 shadow-xl">
                                <Play size={24} className="text-white ml-1" fill="white" />
                              </div>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-red-500"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                              <span className="text-white text-[10px] font-bold">{video.video_id ? 'Watch' : 'Search'}</span>
                            </div>
                          </div>
                          <div className="bg-white p-3 flex flex-col gap-1 flex-1">
                            <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{video.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                              <ExternalLink size={10} className="shrink-0" />
                              {video.query}
                            </p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.section>
              )}

            </div>
          )}
        </motion.div>
      )}

      {/* ── ASK AI TAB ── */}
      {activeTab === 'chat' && (
        <motion.div
          key="chat-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <ClientChatbot clientId={clientId} clientName={clientName} />
        </motion.div>
      )}

      {/* YouTube embed modal */}
      <AnimatePresence>
        {activeVideo && activeVideo.video_id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
                <p className="text-sm font-semibold text-white line-clamp-1 pr-4">{activeVideo.title}</p>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
                >
                  <X size={15} className="text-white" />
                </button>
              </div>
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.video_id}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="px-4 py-2 bg-zinc-900 flex items-center justify-end">
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <ExternalLink size={11} />
                  Open in YouTube
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content modal (modules / flashcards / cheat sheet) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[80vh] overflow-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-bold text-foreground text-base">
                  {selected.kind === 'module'    ? selected.title :
                   selected.kind === 'flashcard' ? 'Flashcard'    :
                   'Quick Reference'}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-6">
                {selected.kind === 'flashcard' ? (
                  <div
                    className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-6 cursor-pointer text-center shadow-lg"
                    onClick={() => setFlipped(!flipped)}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={flipped ? 'back' : 'front'}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center gap-3"
                      >
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider shrink-0">
                          {flipped ? 'Answer' : 'Question'} — tap to flip
                        </p>
                        <p className="text-base font-semibold text-white leading-relaxed whitespace-pre-wrap text-left w-full">
                          {flipped ? selected.back : selected.front}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                ) : (
                  <MarkdownRenderer className="prose prose-sm max-w-none">
                    {selected.content}
                  </MarkdownRenderer>
                )}

                <div className="flex gap-3 mt-7">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleComplete}
                    className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, oklch(0.700 0.172 142), oklch(0.620 0.180 160))' }}
                  >
                    <CheckCircle2 size={15} />
                    Mark as Complete
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(null)}
                    className="flex-1 px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
