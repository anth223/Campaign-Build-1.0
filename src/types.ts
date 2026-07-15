export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  useSimulation: boolean;
}

export interface TemplateConfig {
  subjectTemplate: string; // e.g., "Revolutionizing {{Industry}} with AI - {{Company}}"
  bodyTemplate: string;    // e.g., "Hi {{Company}} team,\n\nI noticed you are working in {{Industry}}..."
  promptInstruction: string; // Additional instruction to Gemini (e.g., "Keep it short, professional, address their likely painpoints")
  tone: string; // "professional" | "casual" | "creative" | "assertive" | "friendly"
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'pending_generation' | 'generating' | 'ready' | 'sending' | 'completed' | 'paused';
  recipients: Recipient[];
  template: TemplateConfig;
  stats: {
    total: number;
    pending: number;
    generating: number;
    ready: number;
    sending: number;
    sent: number;
    failed: number;
    opened: number;
    replied: number;
  };
}

export interface Recipient {
  id: string;
  campaignId: string;
  company: string;
  email: string;
  website?: string; // Optional company website/domain for AI discovery
  shouldDiscoverEmail?: boolean; // Flag to run the Gemini email finder
  industry: string;
  additionalInfo?: string; // Optional metadata mapped from CSV
  
  // Custom AI values
  subject: string;
  body: string;
  
  // Dispatch lifecycle
  status: 'pending' | 'generating' | 'ready' | 'sending' | 'sent' | 'failed';
  error?: string;
  
  // Monitoring & tracking
  trackingId: string;
  openedAt?: string;
  repliedAt?: string;
  replyContent?: string;
}

export interface DashboardOverview {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  openPercentage: number;
  replyPercentage: number;
  industryStats: { industry: string; sent: number; opened: number; replied: number }[];
  activityLogs: { timestamp: string; action: string; details: string; type: 'info' | 'success' | 'warn' | 'open' | 'reply' }[];
}
