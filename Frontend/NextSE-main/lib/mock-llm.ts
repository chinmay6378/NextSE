export interface ClientProfile {
  id: string
  name: string
  industry: string
  description: string
  products: string[]
  services: string[]
  keyPoints: string[]
  competitors: string[]
  targetMarket: string
  uniqueValue: string
  challenges: string[]
  customPrompt: string
}

export interface LearningMaterial {
  id: string
  clientId: string
  type: 'module' | 'flashcard' | 'visual-aid' | 'cheat-sheet'
  title: string
  content: string
  details?: unknown
}

export interface MCQQuestion {
  id: string
  clientId: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface VoiceScenario {
  id: string
  clientId: string
  scenario: string
  objectives: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface TestResult {
  id: string
  userId: string
  clientId: string
  mcqScore: number
  mcqTotal: number
  voiceScore: number
  communicationScore: number
  overallScore: number
  timestamp: Date
  details: unknown
}

// Mock data generator
export function generateClientProfile(
  clientName: string,
  industry: string,
  customPrompt: string
): ClientProfile {
  const profiles: Record<string, Partial<ClientProfile>> = {
    'Technology': {
      description: 'A leading software development company specializing in enterprise solutions.',
      products: ['Cloud Platform', 'DevOps Tools', 'AI Analytics Suite'],
      services: ['Consulting', 'Implementation', 'Support'],
      keyPoints: [
        'Industry-leading uptime (99.99%)',
        'Global presence in 50+ countries',
        'Trusted by Fortune 500 companies',
        'AI-powered insights and automation'
      ],
      competitors: ['AWS', 'Azure', 'GCP'],
      targetMarket: 'Enterprise companies with 1000+ employees',
      uniqueValue: 'Best-in-class automation and intelligence',
      challenges: ['Integration complexity', 'Data migration', 'Training requirements']
    },
    'Finance': {
      description: 'Financial services platform offering banking and investment solutions.',
      products: ['Banking Platform', 'Investment Tools', 'Compliance Suite'],
      services: ['Advisory', 'Integration', 'Training'],
      keyPoints: [
        'Regulatory compliant (SOC 2, ISO 27001)',
        'Real-time transaction processing',
        'Multi-currency support',
        'Advanced fraud detection'
      ],
      competitors: ['Stripe', 'Square', 'PayPal'],
      targetMarket: 'Mid-market to enterprise financial institutions',
      uniqueValue: 'Compliance-first architecture',
      challenges: ['Security concerns', 'Regulatory updates', 'Integration with legacy systems']
    },
    'Healthcare': {
      description: 'Healthcare technology provider for patient management and analytics.',
      products: ['EHR System', 'Patient Portal', 'Analytics Dashboard'],
      services: ['Implementation', 'Training', 'Support'],
      keyPoints: [
        'HIPAA compliant',
        'Interoperable with major EHR systems',
        'Mobile-first design',
        'AI-powered diagnostics'
      ],
      competitors: ['Epic', 'Cerner', 'Allscripts'],
      targetMarket: 'Hospitals and healthcare networks',
      uniqueValue: 'Patient-centric design with powerful analytics',
      challenges: ['Regulatory compliance', 'Data privacy', 'Legacy system integration']
    }
  }

  const baseProfile = profiles[industry] || profiles['Technology']

  return {
    id: Math.random().toString(36).substring(7),
    name: clientName,
    industry: industry,
    description: baseProfile.description || '',
    products: baseProfile.products || [],
    services: baseProfile.services || [],
    keyPoints: baseProfile.keyPoints || [],
    competitors: baseProfile.competitors || [],
    targetMarket: baseProfile.targetMarket || '',
    uniqueValue: baseProfile.uniqueValue || '',
    challenges: baseProfile.challenges || [],
    customPrompt: customPrompt
  }
}

export function generateLearningMaterials(profile: ClientProfile): LearningMaterial[] {
  const materials: LearningMaterial[] = []

  // Generate modules
  const modules = [
    {
      title: `Introduction to ${profile.name}`,
      content: `${profile.name} is a ${profile.industry} company that specializes in ${profile.services.join(', ')}. Their key differentiator is ${profile.uniqueValue}.`
    },
    {
      title: `Products & Services`,
      content: `${profile.name} offers ${profile.products.length} main products: ${profile.products.join(', ')}. Each product is designed to address specific market needs and challenges.`
    },
    {
      title: `Competitive Landscape`,
      content: `In the ${profile.industry} space, ${profile.name} competes with ${profile.competitors.join(', ')}. Their main advantage is superior automation and integration capabilities.`
    },
    {
      title: `Target Market & Use Cases`,
      content: `${profile.name}'s target market is ${profile.targetMarket}. Common use cases include streamlining operations, improving data analysis, and reducing manual processes.`
    }
  ]

  modules.forEach((mod, idx) => {
    materials.push({
      id: `module-${idx}`,
      clientId: profile.id,
      type: 'module',
      title: mod.title,
      content: mod.content,
      details: { difficulty: idx < 2 ? 'beginner' : 'intermediate' }
    })
  })

  // Generate flashcards
  const flashcards = [
    { front: `What is ${profile.name}'s main value proposition?`, back: profile.uniqueValue },
    { front: `List the key products offered by ${profile.name}`, back: profile.products.join(', ') },
    { front: `What industries does ${profile.name} serve?`, back: profile.industry },
    { front: `Who are the main competitors?`, back: profile.competitors.join(', ') },
    { front: `What are the key challenges customers face?`, back: profile.challenges.join(', ') }
  ]

  flashcards.forEach((card, idx) => {
    materials.push({
      id: `flashcard-${idx}`,
      clientId: profile.id,
      type: 'flashcard',
      title: card.front,
      content: card.back
    })
  })

  // Generate visual aid
  materials.push({
    id: 'visual-aid',
    clientId: profile.id,
    type: 'visual-aid',
    title: 'Product Positioning Map',
    content: `${profile.name} positions itself as a premium solution in the ${profile.industry} space, focusing on ${profile.keyPoints[0]} and ${profile.keyPoints[1]}.`,
    details: {
      type: 'comparison-matrix',
      competitors: profile.competitors,
      dimensions: ['Price', 'Features', 'Support', 'Ease of Use']
    }
  })

  // Generate cheat sheet
  materials.push({
    id: 'cheat-sheet',
    clientId: profile.id,
    type: 'cheat-sheet',
    title: 'Quick Reference Guide',
    content: `
Key Points:
${profile.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Quick Talking Points:
- Founded with a mission to ${profile.uniqueValue}
- Trusted by over 500+ clients globally
- Available 24/7 support
- Regular product updates and improvements
    `.trim()
  })

  return materials
}

export function generateMCQQuestions(profile: ClientProfile): MCQQuestion[] {
  const questions: MCQQuestion[] = [
    {
      id: 'mcq-1',
      clientId: profile.id,
      question: `What is the primary value proposition of ${profile.name}?`,
      options: [
        profile.uniqueValue,
        'Lowest cost in the market',
        'Largest customer base',
        'Newest technology'
      ],
      correctAnswer: 0,
      explanation: `${profile.name}'s unique value is ${profile.uniqueValue}.`
    },
    {
      id: 'mcq-2',
      clientId: profile.id,
      question: `Which of the following is a main product of ${profile.name}?`,
      options: [
        profile.products[0] || 'Main Product',
        'Social Media Platform',
        'Gaming Console',
        'Streaming Service'
      ],
      correctAnswer: 0,
      explanation: `${profile.products[0]} is one of ${profile.name}'s core offerings.`
    },
    {
      id: 'mcq-3',
      clientId: profile.id,
      question: `What is the target market for ${profile.name}?`,
      options: [
        profile.targetMarket,
        'Small startups',
        'Individual consumers',
        'Government agencies'
      ],
      correctAnswer: 0,
      explanation: `${profile.name} primarily targets ${profile.targetMarket}.`
    },
    {
      id: 'mcq-4',
      clientId: profile.id,
      question: `Name one key challenge that ${profile.name} helps customers overcome:`,
      options: [
        profile.challenges[0] || 'Operational efficiency',
        'Social media management',
        'Personal fitness',
        'Recipe planning'
      ],
      correctAnswer: 0,
      explanation: `Customers often struggle with ${profile.challenges[0]}, which is why ${profile.name}'s solution is valuable.`
    },
    {
      id: 'mcq-5',
      clientId: profile.id,
      question: `How does ${profile.name} differentiate from competitors like ${profile.competitors[0]}?`,
      options: [
        `${profile.keyPoints[0]} and ${profile.keyPoints[1]}`,
        'Lower pricing',
        'Larger team size',
        'Older company'
      ],
      correctAnswer: 0,
      explanation: `${profile.name} stands out through ${profile.keyPoints.slice(0, 2).join(' and ')}.`
    }
  ]

  return questions
}

export function generateVoiceScenarios(profile: ClientProfile): VoiceScenario[] {
  return [
    {
      id: 'voice-1',
      clientId: profile.id,
      scenario: `A customer from ${profile.targetMarket} is interested in ${profile.products[0]}. They want to know how it can help reduce ${profile.challenges[0]}. Pitch the solution and answer their technical questions.`,
      objectives: [
        'Understand customer pain point',
        'Explain product features clearly',
        'Address specific technical requirements',
        'Close the conversation positively'
      ],
      difficulty: 'beginner'
    },
    {
      id: 'voice-2',
      clientId: profile.id,
      scenario: `An existing customer is considering switching to a competitor. They mention concerns about ${profile.challenges[1]}. Convince them to stay with ${profile.name} and highlight unique features.`,
      objectives: [
        'Listen to customer concerns',
        'Demonstrate product knowledge',
        'Show competitive advantages',
        'Provide personalized solutions'
      ],
      difficulty: 'intermediate'
    },
    {
      id: 'voice-3',
      clientId: profile.id,
      scenario: `A C-level executive from a large enterprise wants a comprehensive overview of ${profile.name}'s solutions. They have budget approval but need a detailed implementation roadmap and ROI justification.`,
      objectives: [
        'Executive communication',
        'Deep product knowledge',
        'Business case presentation',
        'Strategic thinking'
      ],
      difficulty: 'advanced'
    }
  ]
}

export function scoreTestResponse(
  questions: MCQQuestion[],
  answers: number[]
): { score: number; total: number } {
  let correct = 0
  answers.forEach((answer, idx) => {
    if (idx < questions.length && answer === questions[idx].correctAnswer) {
      correct++
    }
  })
  return { score: correct, total: questions.length }
}
