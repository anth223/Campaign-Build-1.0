import React, { useState, useEffect } from "react";
import { Campaign, Recipient } from "./types";
import {
  Inbox,
  Mail,
  Send,
  Users,
  Settings,
  PlusCircle,
  Eye,
  Reply,
  Loader2,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Server,
  HelpCircle,
  Clock,
  Sparkles
} from "lucide-react";
import UploadWizard from "./components/UploadWizard";
import TemplateDesigner from "./components/TemplateDesigner";
import DashboardStats from "./components/DashboardStats";
import SimulationQueue from "./components/SimulationQueue";
import SettingsPanel from "./components/SettingsPanel";

type ActiveTab = "dashboard" | "launch" | "sandbox" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drill-down campaign detail state
  const [drillCampaign, setDrillCampaign] = useState<Campaign | null>(null);
  
  // Launch campaign stepper states
  const [launchStep, setLaunchStep] = useState<"upload" | "design">("upload");
  const [scaffoldCampaign, setScaffoldCampaign] = useState<{
    name: string;
    recipients: any[];
    template: any;
  } | null>(null);

  // Trigger metrics refresh in stats panel
  const [statsTrigger, setStatsTrigger] = useState(0);

  // Fetch campaign directory log
  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        
        // Update drill Campaign reference if active
        if (drillCampaign) {
          const fresh = data.find((c: Campaign) => c.id === drillCampaign.id);
          if (fresh) setDrillCampaign(fresh);
        }
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Poll active sending/generating campaigns in the background (every 3 seconds)
  useEffect(() => {
    const activeStates = ["generating", "sending"];
    const hasActiveGroup = campaigns.some((c) => activeStates.includes(c.status));
    
    if (!hasActiveGroup) return;

    const pullInterval = setInterval(() => {
      loadCampaigns();
    }, 2000);

    return () => clearInterval(pullInterval);
  }, [campaigns]);

  // Handle new CSV upload mapped results
  const handleCSVUploaded = (created: any) => {
    setScaffoldCampaign(created);
    setLaunchStep("design");
  };

  // Handle fully compiled email personalizationapproved by copywriting
  const handleCampaignFinalized = (campaignId: string) => {
    loadCampaigns();
    // Reset wizard
    setScaffoldCampaign(null);
    setLaunchStep("upload");
    // Swap tab to dashboard so they can dispatch immediately
    setActiveTab("dashboard");
    
    // Auto pull detail view for that campaign
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data) => {
        setDrillCampaign(data);
      });
  };

  // Dispatch campaign (Sends SMTP or Sandbox mock emails)
  const handleDispatchCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      });
      if (res.ok) {
        loadCampaigns();
        setStatsTrigger((p) => p + 1);
      }
    } catch (err) {
      console.error("Dispatch campaign failed:", err);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this outreach campaign? This removes tracking log histories.")) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (drillCampaign?.id === campaignId) setDrillCampaign(null);
        loadCampaigns();
        setStatsTrigger((p) => p + 1);
      }
    } catch (err) {
      console.error("Delete campaign failed:", err);
    }
  };

  const forceRefreshStats = () => {
    setStatsTrigger((p) => p + 1);
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] flex flex-col font-sans text-gray-200" id="main-application-canvas">
      {/* GLOBAL BRANDING HEADER */}
      <header className="bg-[#121216]/55 border-b border-white/5 py-4.5 px-6 shadow-xs select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">PersonaMail</h1>
              <p className="text-3xs text-gray-450 font-semibold mt-1 uppercase tracking-wide">Enterprise Custom Sales Builder</p>
            </div>
          </div>
          <div className="flex items-center space-x-3.5">
            <span className="text-3xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-md px-2.5 py-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              <span>Real-Time Tracker Active</span>
            </span>
          </div>
        </div>
      </header>

      {/* HORIZONTAL SYSTEM NAVIGATION SECTORS */}
      <nav className="bg-[#16161A] border-b border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex space-x-1.5 overflow-x-auto py-1">
          {[
            { id: "dashboard", label: "📊 Campaign Dashboard", icon: Inbox },
            { id: "launch", label: "🚀 Launch Campaign", icon: PlusCircle },
            { id: "sandbox", label: "⚡ Interactive Sandbox", icon: Sparkles },
            { id: "settings", label: "⚙️ Dispatch Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  setDrillCampaign(null); // Reset drilldowns to clean views
                }}
                className={`flex items-center space-x-2 py-3 px-4.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400 font-extrabold"
                    : "border-transparent text-gray-400 hover:text-white hover:border-white/10"
                }`}
                id={`nav-tab-${tab.id}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* CORE DISPLAY WINDOW */}
      <main className="flex-1 py-6 px-6 max-w-7xl mx-auto w-full space-y-6">
        {/* TAB 1: DASHBOARD TELEMETRY AND METRICS */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {!drillCampaign ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CAMPAIGN METRICS TIMELINE */}
                <div className="lg:col-span-2 space-y-6">
                  {/* REAL-TIME CHARTS AND COUNTERS CARD */}
                  <DashboardStats refreshTrigger={statsTrigger} />

                  {/* CAMPAIGNS REGISTER LIST */}
                  <div className="bg-[#16161A] rounded-2xl border border-white/5 p-6 shadow-xl" id="campaigns-register">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                      <div>
                        <h3 className="text-base font-semibold text-white">Campaign Histories</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Explore active runs, send queues, and monitoring parameters.</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("launch");
                          setLaunchStep("upload");
                        }}
                        className="px-4.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
                        id="btn-create-campaign-shortcut"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Build Outreach Run</span>
                      </button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-12 text-gray-400 text-xs">
                        <Loader2 className="w-5 h-5 mr-1.5 animate-spin" />
                        <span>Synchronizing templates...</span>
                      </div>
                    ) : campaigns.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 max-w-md mx-auto space-y-3">
                        <Inbox className="w-10 h-10 text-gray-650 mx-auto stroke-1" />
                        <p className="font-semibold text-sm text-white font-sans">No campaign records initialized yet</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Drag and drop your company directory CSV list in the "Launch Campaign" tab to custom personalizations with Gemini in minutes.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {campaigns.map((camp) => {
                          const hasGenerating = camp.status === "generating";
                          const hasSending = camp.status === "sending";
                          const isReady = camp.status === "ready";
                          const isDraft = camp.status === "draft";
                          
                          // Determine performance stats percentage safe
                          const openPercentage = camp.stats.sent > 0 ? Math.round((camp.stats.opened / camp.stats.sent) * 100) : 0;
                          const replyPercentage = camp.stats.sent > 0 ? Math.round((camp.stats.replied / camp.stats.sent) * 100) : 0;

                          return (
                            <div
                              key={camp.id}
                              onClick={() => setDrillCampaign(camp)}
                              className="py-4.5 hover:bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between transition-all cursor-pointer rounded-lg px-2 group"
                            >
                              <div className="space-y-1 truncate pr-3 max-w-[280px]">
                                <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">{camp.name}</h4>
                                <div className="flex items-center space-x-2 text-3xs text-gray-450">
                                  <span>Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span className="font-bold">{camp.stats.total} total leads</span>
                                </div>
                              </div>

                              {/* Life Cycle State Tagged colorings */}
                              <div className="my-2 md:my-0">
                                {hasGenerating ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    <span>AI Copywriting</span>
                                  </span>
                                ) : hasSending ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    <span>Delivering</span>
                                  </span>
                                ) : isReady ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span>Copies Generated</span>
                                  </span>
                                ) : isDraft ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-white/5 text-gray-400 border border-white/5">
                                    <span>Template Draft</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-white/5 text-gray-300 border border-white/5">
                                    <span>Completed</span>
                                  </span>
                                )}
                              </div>

                              {/* Mini statistics values */}
                              <div className="flex items-center space-x-5 text-center mt-2 md:mt-0 font-mono text-xs">
                                <div>
                                  <span className="text-3xs font-sans text-gray-400 block tracking-wide uppercase">Sent</span>
                                  <span className="font-bold text-gray-100">{camp.stats.sent}</span>
                                </div>
                                <div>
                                  <span className="text-3xs font-sans text-gray-400 block tracking-wide uppercase">Opens</span>
                                  <span className="font-bold text-orange-400">{camp.stats.opened} ({openPercentage}%)</span>
                                </div>
                                <div>
                                  <span className="text-3xs font-sans text-gray-400 block tracking-wide uppercase">Replies</span>
                                  <span className="font-bold text-indigo-400">{camp.stats.replied} ({replyPercentage}%)</span>
                                </div>
                              </div>

                              {/* Trigger Dispatch Buttons */}
                              <div className="flex items-center space-x-2 mt-3 md:mt-0 self-end md:self-auto">
                                {isReady && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDispatchCampaign(camp.id);
                                    }}
                                    className="px-3 py-1 bg-indigo-500 text-white font-semibold text-xs border border-transparent rounded-lg hover:bg-indigo-600 flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                                    id={`btn-deploy-camp-${camp.id}`}
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Dispatch Mail</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCampaign(camp.id, e)}
                                  className="p-1.5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-55/20 transition-all"
                                  title="Delete Campaign"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* SIDEBAR GLANCE INFORMATION */}
                <div className="lg:col-span-1 space-y-6 select-none" id="dashboard-bulletin-panel">
                  <div className="bg-[#16161A] rounded-2xl border border-white/5 p-5 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sales Strategy Summary</h3>
                    <div className="space-y-4 divide-y divide-white/5 text-xs">
                      <div className="pt-0 flex items-start space-x-3 text-gray-350 leading-normal">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white">Personalized Copylines with Gemini</p>
                          <p className="text-gray-400 text-2xs mt-0.5">Customizing B2B layouts per industry solves generic engagement barriers, boosting outbound response rates up to 3x.</p>
                        </div>
                      </div>

                      <div className="pt-3.5 flex items-start space-x-3 text-gray-350 leading-normal">
                        <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white">Sandbox Mock Testing</p>
                          <p className="text-gray-400 text-2xs mt-0.5">Use the "Interactive Sandbox" workspace to trigger pixel loads and test automated responses instantly before SMTP release.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* DRILL DOWN MODAL-STYLE CAMPAIGN DETAILS VIEW */
              <div className="bg-[#16161A] rounded-2xl border border-white/5 p-6 space-y-6 shadow-xl" id="campaign-drilldown-window">
                <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                  <button
                    onClick={() => setDrillCampaign(null)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-white">{drillCampaign.name}</h2>
                      <span className="text-3xs uppercase tracking-wider font-extrabold bg-[#222228] text-indigo-400 px-2 py-0.5 rounded-sm border border-white/5">
                        {drillCampaign.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Launched: {new Date(drillCampaign.createdAt).toLocaleString()} • {drillCampaign.stats.total} target leads</p>
                  </div>
                </div>

                {/* TEMPLATE DETAILS HEADER IN DRILL DOWN */}
                <div className="p-4 border border-white/5 rounded-xl bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between text-xs gap-4 text-gray-300">
                  <div className="space-y-1 leading-relaxed">
                    <p><strong>Base Subject Rule:</strong> <span className="text-indigo-300">{drillCampaign.template.subjectTemplate}</span></p>
                    <p><strong>Configured Communication Tone:</strong> <span className="text-indigo-300 capitalize">{drillCampaign.template.tone}</span></p>
                    {drillCampaign.template.promptInstruction && (
                      <p><strong>Gemini Copywriting Instructions:</strong> <span className="text-indigo-300">"{drillCampaign.template.promptInstruction}"</span></p>
                    )}
                  </div>

                  {drillCampaign.status === "ready" && (
                    <button
                      onClick={() => handleDispatchCampaign(drillCampaign.id)}
                      className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs flex items-center space-x-2 transition-all cursor-pointer shrink-0 self-start md:self-auto shadow-md shadow-indigo-500/10"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Deliver Outreach Campaign</span>
                    </button>
                  )}
                </div>

                {/* DETAILED RECIPIENTS DICTIONARY DATABASE */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Demographics Outbox Leads</h3>
                  
                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#121216]/40">
                    <table className="w-full text-left text-xs border-collapse font-sans text-gray-300">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4 font-semibold">Enterprise</th>
                          <th className="py-2.5 px-4 font-semibold">Contact Email</th>
                          <th className="py-2.5 px-4 font-semibold">Target Industry</th>
                          <th className="py-2.5 px-4 font-semibold">Custom Copy</th>
                          <th className="py-2.5 px-4 font-semibold">Status State</th>
                          <th className="py-2.5 px-4 font-semibold">Telemetry Trace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {drillCampaign.recipients.map((recipient: Recipient) => (
                          <tr key={recipient.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-100">{recipient.company}</p>
                              <div className="flex flex-col space-y-0.5 mt-0.5">
                                {recipient.website && (
                                  <a
                                    href={recipient.website.startsWith('http') ? recipient.website : `https://${recipient.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-3xs text-indigo-400 hover:underline truncate max-w-[150px]"
                                  >
                                    🌐 {recipient.website.replace(/^(https?:\/\/)?(www\.)?/, '')}
                                  </a>
                                )}
                                {recipient.additionalInfo && (
                                  <p className="text-3xs text-gray-400 truncate max-w-[150px]">{recipient.additionalInfo}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1.5">
                                <span className={recipient.email ? "text-gray-300" : "text-gray-500 italic"}>
                                  {recipient.email || "AI discovery in queue..."}
                                </span>
                                {recipient.shouldDiscoverEmail && recipient.email && (
                                  <span className="px-1 py-0.5 bg-indigo-500/10 text-indigo-400 text-3xs font-extrabold rounded-sm border border-indigo-500/20" title="This corporate outreach address was discovered using Gemini AI">
                                    ✨ AI Pulled
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-300 bg-white/5 border border-white/5 px-2 py-0.5 text-3xs rounded-sm">{recipient.industry}</span>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <div className="space-y-1 text-3xs leading-relaxed truncate">
                                <p className="truncate font-bold text-gray-200">S: {recipient.subject || "[Pending AI]"}</p>
                                <p className="truncate text-gray-400">{recipient.body || "[Pending AI]"}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-1.5 py-0.5 text-3xs font-semibold capitalize rounded-md ${
                                recipient.status === 'sent' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                recipient.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-white/5 text-gray-400 animate-pulse'
                              }`}>
                                {recipient.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {recipient.repliedAt ? (
                                <div className="text-3xs space-y-0.5 leading-tight font-sans text-purple-400 font-bold bg-[#1d1633] p-1.5 border border-purple-500/20 inline-block rounded-md">
                                  <div className="flex items-center space-x-0.5">
                                    <Reply className="w-2.5 h-2.5" />
                                    <span>Replied</span>
                                  </div>
                                  <p className="font-semibold italic text-purple-300 truncate max-w-[120px]">"{recipient.replyContent}"</p>
                                </div>
                              ) : recipient.openedAt ? (
                                <div className="text-3xs space-y-0.5 leading-tight font-bold text-orange-400 bg-[#291708] p-1 rounded-sm border border-orange-500/20 inline-block">
                                  <div className="flex items-center space-x-0.5">
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Opened At</span>
                                  </div>
                                  <span className="text-gray-400 font-normal">{new Date(recipient.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ) : (
                                <span className="text-3xs text-gray-500">No activity logged</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LAUNCH WIZARD (STEPPER CRADLE) */}
        {activeTab === "launch" && (
          <div>
            {launchStep === "upload" ? (
              <UploadWizard onCampaignCreated={handleCSVUploaded} />
            ) : (
              scaffoldCampaign && (
                <TemplateDesigner
                  initialCampaign={scaffoldCampaign}
                  onBack={() => setLaunchStep("upload")}
                  onCampaignFinalized={handleCampaignFinalized}
                />
              )
            )}
          </div>
        )}

        {/* TAB 3: WORKSPACE SANDBOX TESTING SHIELDS */}
        {activeTab === "sandbox" && (
          <div className="space-y-6">
            <div className="bg-[#121625] border border-indigo-500/20 rounded-2xl p-5 select-none animate-fade-in" id="sandbox-intro-prompt">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="p-1 h-6 w-6 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-md">⚡</span>
                <span className="tracking-wide">Interactive CRM Sandboxing Workspace</span>
              </h2>
              <p className="text-xs text-indigo-300 leading-relaxed mt-2.5">
                Excellent! Here, you roleplay as the cold outreach lead recipient! Click any delivered outbox email, select simulation actions (like <strong>"Simulate Open"</strong> or <strong>"Submit Client Reply"</strong>), and watch the pixel trigger logs write back to the main <strong>Campaign Dashboard</strong> metrics immediately. Great for ensuring everything functions green!
              </p>
            </div>

            <SimulationQueue onActivityChanged={forceRefreshStats} />
          </div>
        )}

        {/* TAB 4: DISPATCH SMTP CONFIGURATIONS */}
        {activeTab === "settings" && (
          <SettingsPanel onSettingsChanged={forceRefreshStats} />
        )}
      </main>

      {/* FOOTER METADATA INDICATORS */}
      <footer className="bg-[#121216]/50 border-t border-white/5 py-4 px-6 text-center text-3xs text-gray-400 select-none">
        <p className="max-w-7xl mx-auto font-mono text-gray-500 font-semibold tracking-wider uppercase">
          PersonaMail Cold- Outreach Studio Engine v1.0.8 • UTC Active Connection
        </p>
      </footer>
    </div>
  );
}
