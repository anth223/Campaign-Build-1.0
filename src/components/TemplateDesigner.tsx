import React, { useState, useEffect } from "react";
import { Campaign, TemplateConfig } from "../types";
import { Send, FileText, ChevronLeft, HelpCircle, Loader2, Sparkles, Wand2, Check, ArrowRight, Eye, RefreshCw } from "lucide-react";

interface TemplateDesignerProps {
  initialCampaign: {
    name: string;
    recipients: any[];
    template: TemplateConfig;
  };
  onBack: () => void;
  onCampaignFinalized: (campaignId: string) => void;
}

export default function TemplateDesigner({ initialCampaign, onBack, onCampaignFinalized }: TemplateDesignerProps) {
  const [template, setTemplate] = useState<TemplateConfig>(initialCampaign.template);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  
  // Polling state
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);
  const [viewRecipientIndex, setViewRecipientIndex] = useState(0);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Kick off Gemini personalized generation
  const handleStartGeneration = async () => {
    setLoading(true);
    try {
      // 1. Create the campaign draft in database
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: initialCampaign.name,
          recipients: initialCampaign.recipients,
          template: template,
        }),
      });

      if (!createRes.ok) throw new Error("Could not initialize draft campaign root");
      const createdCampaign = await createRes.json();
      setCampaignId(createdCampaign.id);
      setActiveCampaign(createdCampaign);

      // 2. Start Gemini generation thread on backend
      const genRes = await fetch(`/api/campaigns/${createdCampaign.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!genRes.ok) throw new Error("Could not launch generative customization pipeline");
      
      setGenerating(true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed launching outreach personalization. Please check server logs.");
      setLoading(false);
    }
  };

  // Poll campaign status while generating
  useEffect(() => {
    if (!generating || !campaignId) return;

    const intervalRef = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (!res.ok) return;

        const data: Campaign = await res.json();
        setActiveCampaign(data);

        // Check if finished generating
        const nonGenerated = data.recipients.filter(
          (r) => r.status === "generating" || r.status === "pending"
        );

        if (nonGenerated.length === 0 || data.status === "ready" || data.status === "completed") {
          setGenerating(false);
          clearInterval(intervalRef);
        }
      } catch (err) {
        console.error("Error polling campaign state:", err);
      }
    }, 1500);

    return () => clearInterval(intervalRef);
  }, [generating, campaignId]);

  const handleProceedToSend = () => {
    if (campaignId) {
      onCampaignFinalized(campaignId);
    }
  };

  // Calculate stats progress bar percentage
  const totalRecs = activeCampaign?.stats.total || initialCampaign.recipients.length;
  const processedRecs = activeCampaign
    ? activeCampaign.recipients.filter((r) => r.status === "ready" || r.status === "failed").length
    : 0;
  const progressPercent = totalRecs > 0 ? Math.round((processedRecs / totalRecs) * 100) : 0;

  // Selected testing recipient
  const demoRecipient = initialCampaign.recipients[0] || { company: "Sample Corp", industry: "Technology", additionalInfo: "Has modern integrations" };

  return (
    <div className="space-y-6 font-sans" id="template-designer">
      {/* 1. SETUP / INPUTS PHASE */}
      {!activeCampaign && (
        <div className="bg-[#16161A] rounded-2xl border border-white/5 p-6 space-y-6 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
              id="btn-back-to-wizard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-white">Customize Outreach Template</h2>
              <p className="text-xs text-gray-400 mt-0.5">Campaign Name: <strong className="text-indigo-400">{initialCampaign.name}</strong> • ({initialCampaign.recipients.length} companies)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* INPUT CONTROLS */}
            <div className="lg:col-span-3 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Subject Line Template</label>
                <input
                  type="text"
                  name="subjectTemplate"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                  value={template.subjectTemplate}
                  onChange={handleTemplateChange}
                  required
                />
                <span className="text-2xs text-gray-500 mt-1 block">Merge fields supported: <code className="font-mono text-indigo-400 bg-white/5 px-1 py-0.5 rounded-sm">{"{{Company}}"}</code>, <code className="font-mono text-indigo-400 bg-white/5 px-1 py-0.5 rounded-sm">{"{{Industry}}"}</code></span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email Body Draft Template</label>
                <textarea
                  name="bodyTemplate"
                  rows={8}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-gray-300 leading-normal"
                  value={template.bodyTemplate}
                  onChange={handleTemplateChange}
                  required
                />
                <span className="text-2xs text-gray-500 mt-1 block">Variables: <code className="font-mono text-indigo-400 bg-white/5 px-1 py-0.5 rounded-sm">{"{{Company}}"}</code>, <code className="font-mono text-indigo-400 bg-white/5 px-1 py-0.5 rounded-sm">{"{{Industry}}"}</code>, <code className="font-mono text-indigo-400 bg-white/5 px-1 py-0.5 rounded-sm">{"{{Personalization}}"}</code> (CSV Info)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Communication Tone</label>
                  <select
                    name="tone"
                    className="w-full px-3 py-2 text-sm bg-[#121216]/55 border border-white/10 rounded-xl font-medium text-gray-300 focus:border-indigo-500/50 cursor-pointer"
                    value={template.tone}
                    onChange={handleTemplateChange}
                  >
                    <option value="professional" className="bg-[#16161A]">👔 Professional</option>
                    <option value="casual" className="bg-[#16161A]">☕ Casual & Direct</option>
                    <option value="creative" className="bg-[#16161A]">🎨 Creative & Bold</option>
                    <option value="friendly" className="bg-[#16161A]">🤗 Warm & Friendly</option>
                    <option value="assertive" className="bg-[#16161A]">🎯 Smart & Focused</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Additional Gemini Instructions</label>
                  <input
                    type="text"
                    name="promptInstruction"
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Keep body short. Don't sound like generic templates"
                    value={template.promptInstruction}
                    onChange={handleTemplateChange}
                  />
                </div>
              </div>
            </div>

            {/* LIVE DRAFT INJECTED SAMPLE */}
            <div className="lg:col-span-2 bg-white/[0.01] rounded-2xl border border-white/5 p-4 space-y-4 h-fit">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                <span>Base Merging Preview</span>
              </h3>

              <div className="bg-[#121216]/55 rounded-xl border border-white/5 p-4 shadow-sm font-sans text-xs space-y-3">
                <div className="border-b border-white/5 pb-2">
                  <span className="font-semibold text-gray-500 block pb-0.5 text-3xs uppercase tracking-wide">Demo Recipient Comp:</span>
                  <span className="font-bold text-gray-100 text-xs">{demoRecipient.company} <span className="text-indigo-400">({demoRecipient.industry})</span></span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 block text-3xs uppercase tracking-wide">Subject:</span>
                  <span className="font-semibold text-gray-200">
                    {template.subjectTemplate
                      .replace(/\{\{Company\}\}/g, demoRecipient.company)
                      .replace(/\{\{Industry\}\}/g, demoRecipient.industry)}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5 text-gray-300 leading-relaxed whitespace-pre-line font-mono bg-white/5 p-2.5 rounded-lg max-h-56 overflow-y-auto text-3xs border border-white/5">
                  {template.bodyTemplate
                    .replace(/\{\{Company\}\}/g, demoRecipient.company)
                    .replace(/\{\{Industry\}\}/g, demoRecipient.industry)
                    .replace(/\{\{Personalization\}\}/g, demoRecipient.additionalInfo || "[Additional Context Hook]")}
                </div>
              </div>

              <div className="bg-indigo-500/10 rounded-xl p-3.5 text-indigo-300 border border-indigo-500/20 text-2xs leading-relaxed space-y-1">
                <div className="flex items-center space-x-1 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Personalized Gemini Generation</span>
                </div>
                <p className="text-gray-400">
                  When you click start, Gemini will read your base template and enhance the sentences individually for each company's industry, replacing boring sales speak with high-conversion custom painpoint highlights!
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 bg-[#16161A]">
            <span className="text-xs text-gray-400 font-medium">Ready to personalize {initialCampaign.recipients.length} custom emails using Gemini?</span>
            <button
              onClick={handleStartGeneration}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm cursor-pointer flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 disabled:opacity-50"
              id="btn-trigger-generation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Campaign Copies</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. GENERATION RUNNING AND POLLING STATUS */}
      {activeCampaign && (
        <div className="bg-[#16161A] rounded-2xl border border-white/5 p-6 space-y-6 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center space-x-1.5 animate-pulse">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <span>Generating Personalized Content</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Campaign Name: <strong className="text-indigo-400">{activeCampaign.name}</strong></p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-sm">
                Progress: {processedRecs} / {totalRecs} ({progressPercent}%)
              </span>
            </div>
          </div>

          {/* PROGRESS stepper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
              <span className="flex items-center text-gray-300">
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-indigo-400" />
                    <span>Gemini-3.5-flash is thinking and formulating copies...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 mr-1.5" />
                    <span className="text-emerald-450 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">Copywriting Completed Successfully!</span>
                  </>
                )}
              </span>
              <span className="font-mono text-gray-300">{progressPercent}%</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-indigo-500 h-full transition-all duration-550 ease-out shadow-lg shadow-indigo-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RECIPIENT CHEAT SHEET LIST */}
            <div className="lg:col-span-1 border border-white/5 rounded-xl overflow-hidden max-h-96 flex flex-col bg-[#121216]/50">
              <div className="p-3 bg-white/5 border-b border-white/5 font-bold text-3xs text-gray-400 uppercase tracking-widest">
                Outreach Queue Status
              </div>
              <div className="divide-y divide-white/5 overflow-y-auto flex-1">
                {activeCampaign.recipients.map((recipient, idx) => (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => setViewRecipientIndex(idx)}
                    className={`w-full p-3 text-left transition-all flex items-center justify-between text-xs cursor-pointer ${
                      viewRecipientIndex === idx ? "bg-[#1s1s22] bg-white/[0.04] border-l-2 border-indigo-500 shadow-2xs font-semibold" : "hover:bg-white/[0.01] border-l-2 border-transparent"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-gray-200 truncate font-semibold">{recipient.company}</p>
                      <p className="text-gray-450 text-3xs truncate mt-0.5">{recipient.industry}</p>
                    </div>
                    <div>
                      {recipient.status === "generating" || recipient.status === "pending" ? (
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                      ) : recipient.status === "ready" ? (
                        <span className="text-2xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold px-1.5 py-0.5 rounded-sm">Ready</span>
                      ) : (
                        <span className="text-2xs bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold px-1.5 py-0.5 rounded-sm">Failed</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE DETAILED COPY PREVIEWER */}
            <div className="lg:col-span-2 space-y-4">
              {activeCampaign.recipients[viewRecipientIndex] ? (
                (() => {
                  const rec = activeCampaign.recipients[viewRecipientIndex];
                  const hasDetails = rec.subject && rec.body;

                  return (
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#121216]/30 shadow-sm flex flex-col h-full">
                      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-3xs font-bold text-indigo-400 block uppercase tracking-wide">In-App AI Copy Inspector</span>
                          <span className="text-sm font-semibold text-white">{rec.company} <span className="text-gray-400">({rec.industry})</span></span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-2xs font-bold text-gray-400">
                          <span>Status:</span>
                          <span className={`px-2 py-0.5 rounded-md capitalize border ${rec.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-gray-400 border-white/5 animate-pulse'}`}>
                            {rec.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 min-h-64 flex flex-col justify-between">
                        {hasDetails ? (
                          <div className="space-y-4 font-sans text-xs">
                            <div>
                              <span className="font-bold text-gray-500 block text-3xs uppercase tracking-wide">Subject line generated:</span>
                              <span className="text-sm font-bold text-gray-100">{rec.subject}</span>
                            </div>
                            <div className="pt-3 border-t border-white/5">
                              <span className="font-bold text-gray-500 block text-3xs mb-1.5 uppercase tracking-wide">Email body generated:</span>
                              <div className="bg-white/5 p-4 rounded-lg font-mono text-gray-300 text-3xs leading-relaxed whitespace-pre-line border border-white/5 max-h-60 overflow-y-auto">
                                {rec.body}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                            <p className="font-semibold text-gray-200">Gemini drafting personalized email content...</p>
                            <p className="text-3xs text-gray-500 max-w-xs">Customized templates vary the tone and statistics according to the {rec.industry} industry.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">Please select a recipient from the list.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 bg-[#16161A]">
            <span className="text-xs text-gray-450">
              {generating ? "Emails are writing in chunks. You can review them in real time above." : "All customized copies generated and vetted successfully!"}
            </span>
            <div className="flex items-center space-x-3">
              {generating ? (
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Processing...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToSend}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all"
                  id="btn-proceed-to-send"
                >
                  <span>Approve & Open Campaign Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
