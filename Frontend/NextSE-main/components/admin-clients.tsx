'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileUp, Plus, Trash2, Edit2, Zap, Check } from 'lucide-react'
import { clientStore, materialStore, mcqStore, voiceStore } from '@/lib/data-store'
import {
  generateClientProfile,
  generateLearningMaterials,
  generateMCQQuestions,
  generateVoiceScenarios,
  type ClientProfile
} from '@/lib/mock-llm'
import { toast } from 'sonner'

export function AdminClients() {
  const [clients, setClients] = useState<ClientProfile[]>(clientStore.getAll())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    industry: 'Technology',
    customPrompt: '',
    files: [] as File[]
  })

  const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education']

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        files: Array.from(e.target.files || [])
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Client name is required')
      return
    }

    setIsGenerating(true)

    try {
      // Generate profile from form data
      const profile = generateClientProfile(
        formData.name,
        formData.industry,
        formData.customPrompt
      )

      // Save profile
      clientStore.add(profile)

      // Generate and save learning materials
      const materials = generateLearningMaterials(profile)
      materialStore.addMultiple(materials)

      // Generate and save MCQ questions
      const mcqQuestions = generateMCQQuestions(profile)
      mcqStore.addMultiple(mcqQuestions)

      // Generate and save voice scenarios
      const voiceScenarios = generateVoiceScenarios(profile)
      voiceStore.addMultiple(voiceScenarios)

      // Update UI
      setClients([...clients, profile])
      setFormData({ name: '', industry: 'Technology', customPrompt: '', files: [] })
      setShowForm(false)

      toast.success(`Client profile "${profile.name}" created successfully with all learning materials!`)
    } catch (error) {
      console.error('[v0] Error creating profile:', error)
      toast.error('Failed to create client profile')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = (id: string) => {
    clientStore.delete(id)
    setClients(clients.filter(c => c.id !== id))
    toast.success('Client deleted')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage client profiles for sales training</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus size={20} />
          Add New Client
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Create New Client Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Client Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Acme Corp, TechFlow Solutions"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
              <select
                value={formData.industry}
                onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {industries.map(ind => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Upload Company Documents</label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <FileUp className="mx-auto mb-3 text-muted-foreground" size={32} />
                <p className="text-foreground font-medium mb-1">Drag and drop files here or click to browse</p>
                <p className="text-muted-foreground text-sm mb-4">PDF, DOC, TXT (up to 10MB each)</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <button type="button" className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">
                    Select Files
                  </button>
                </label>
                {formData.files.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-accent font-medium">{formData.files.length} file(s) selected</p>
                    <ul className="mt-2 space-y-1">
                      {formData.files.map(file => (
                        <li key={file.name} className="text-xs text-muted-foreground">{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Custom Prompt (Optional)</label>
              <textarea
                value={formData.customPrompt}
                onChange={e => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                placeholder="Add specific instructions for profile generation. E.g., 'Focus on API integration capabilities' or 'Emphasize compliance certifications'"
                rows={4}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">This prompt will guide the AI in creating customized learning materials</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Generating Profile...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Generate Profile & Materials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ name: '', industry: 'Technology', customPrompt: '', files: [] })
                }}
                className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground">No clients yet. Create your first client profile to get started.</p>
          </div>
        ) : (
          clients.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{client.name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{client.industry} | {client.description}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent rounded-full">
                  <Check size={14} />
                  <span className="text-xs font-medium">Profile Ready</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Products</p>
                  <p className="text-foreground font-medium">{client.products.length} items</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Services</p>
                  <p className="text-foreground font-medium">{client.services.length} items</p>
                </div>
              </div>

              {/* Key Points */}
              <div className="mb-4">
                <p className="text-muted-foreground text-sm mb-2">Key Points</p>
                <div className="flex flex-wrap gap-2">
                  {client.keyPoints.slice(0, 3).map((point, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-muted text-foreground rounded">
                      {point}
                    </span>
                  ))}
                  {client.keyPoints.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                      +{client.keyPoints.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button className="flex-1 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  <Edit2 size={16} />
                  Edit & Review
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="flex-1 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
