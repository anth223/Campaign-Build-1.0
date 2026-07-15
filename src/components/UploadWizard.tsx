import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, ChevronRight, FileSpreadsheet, AlertCircle, Database, Check, RefreshCw } from "lucide-react";

interface UploadWizardProps {
  onCampaignCreated: (campaign: any) => void;
}

export default function UploadWizard({ onCampaignCreated }: UploadWizardProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [mapping, setMapping] = useState({
    company: "",
    email: "",
    website: "", // Dynamic mapping attribute for corporate CRM domain predictions
    industry: "",
    additionalInfo: "",
  });

  const [campaignType, setCampaignType] = useState<"sales" | "partnership" | "followup">("sales");

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file parsing
  const processCSV = (file: File) => {
    setFileName(file.name);
    setErrorMsg("");
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg("Failed to parse CSV file structure properly. Please check spacing or quotes.");
          return;
        }

        const keys = results.meta.fields || [];
        if (keys.length < 2) {
          setErrorMsg("Your CSV needs at least two mapped headers (e.g., Company and Email) to proceed.");
          return;
        }

        setHeaders(keys);
        setParsedData(results.data);

        // Auto-detect mappings based on keyword match
        const matches = { company: "", email: "", website: "", industry: "", additionalInfo: "" };
        
        keys.forEach((k) => {
          const lower = k.toLowerCase().trim();
          if (lower.includes("company") || lower.includes("organization") || lower.includes("name") || lower === "co") {
            if (!matches.company) matches.company = k;
          } else if (lower.includes("email") || lower.includes("mail") || lower.includes("addr")) {
            if (!matches.email) matches.email = k;
          } else if (lower.includes("website") || lower.includes("url") || lower.includes("domain") || lower === "site" || lower === "link") {
            if (!matches.website) matches.website = k;
          } else if (lower.includes("industry") || lower.includes("sector") || lower.includes("category") || lower.includes("niche")) {
            if (!matches.industry) matches.industry = k;
          } else if (lower.includes("info") || lower.includes("note") || lower.includes("comment") || lower.includes("personal") || lower.includes("about") || lower.includes("hook")) {
            if (!matches.additionalInfo) matches.additionalInfo = k;
          }
        });

        // Set fallback values if no matching heuristics
        setMapping({
          company: matches.company || keys[0] || "",
          email: matches.email || keys.find(k => k.toLowerCase().includes("email")) || "",
          website: matches.website || keys.find(k => k.toLowerCase().includes("url") || k.toLowerCase().includes("website")) || "",
          industry: matches.industry || keys.find(k => k.toLowerCase().includes("industry")) || "",
          additionalInfo: matches.additionalInfo || "",
        });

        // Default campaign name
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setCampaignName(`${cleanName} Campaign - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
      },
      error: (err) => {
        setErrorMsg(`Failed reading CSV spreadsheet file: ${err.message}`);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSV(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSV(e.target.files[0]);
    }
  };

  const onMappingChange = (field: string, val: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const resetUpload = () => {
    setParsedData([]);
    setHeaders([]);
    setFileName("");
    setErrorMsg("");
  };

  const handleGenerateBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setErrorMsg("Please identify a descriptive name for this campaign run.");
      return;
    }
    if (!mapping.company || !mapping.email) {
      setErrorMsg("You must designate columns for Company Name and corporate Email Address.");
      return;
    }

    // Convert CSV structured rows into standard template entities
    const processedRecipients = parsedData.map((row) => {
      const companyVal = row[mapping.company] || "Unknown Enterprise";
      const rawEmail = mapping.email === "__discover__" ? "" : (row[mapping.email] || "");
      const emailVal = rawEmail.trim();
      const websiteVal = mapping.website ? (row[mapping.website] || "") : "";
      
      const shouldDiscover = mapping.email === "__discover__" || !emailVal || !emailVal.includes("@");
      
      return {
        company: companyVal,
        email: emailVal,
        website: websiteVal,
        industry: mapping.industry ? (row[mapping.industry] || "General") : "General",
        additionalInfo: mapping.additionalInfo ? (row[mapping.additionalInfo] || "") : "",
        shouldDiscoverEmail: shouldDiscover,
      };
    });

    if (processedRecipients.length === 0) {
      setErrorMsg("No valid rows parsed from the spreadsheet.");
      return;
    }

    // If they did not map AI Discovery and have NO valid emails, error
    if (mapping.email !== "__discover__" && !processedRecipients.some(r => r.email && r.email.includes("@"))) {
      setErrorMsg("No valid email addresses detected in the designated 'Email' column! Choose '💡 Auto-Predict via Gemini' in mapping if you want to pull / find corporate emails automatically.");
      return;
    }

    // Determine default template structures based on Campaign Type selection
    let defaultTemplate = {
      subjectTemplate: "Enhancing {{Industry}} pipelines at {{Company}}",
      bodyTemplate: "Hi team at {{Company}},\n\nI was compiling interesting developers in the {{Industry}} sector and noticed some bottlenecks in digital productivity.\n\nWe build an automated AI automation platform that cuts deployment pipelines down by 40%.\n\n{{Personalization}}\n\nWould you be open to a 5-minute chat next Wednesday?\n\nBest,\nPartners Team",
      promptInstruction: "Match their specific industry. Speak professionally but casually. Focus on standard industry problems.",
      tone: "professional"
    };

    if (campaignType === "partnership") {
      defaultTemplate = {
        subjectTemplate: "Potential Synergy in {{Industry}} - {{Company}} x Our Team",
        bodyTemplate: "Hi {{Company}} Team,\n\nI love your presence within the {{Industry}} space. We specialize in cross-compatibility logistics and there is a brilliant opportunity to bundle integrations.\n\n{{Personalization}}\n\nLet me know if there's a good day for a brief 10-minute brainstorming session.\n\nRegards,\nStrategic Alliances Team",
        promptInstruction: "Empathetic, collaborative tone. Call out mutual partner workflows.",
        tone: "creative"
      };
    } else if (campaignType === "followup") {
      defaultTemplate = {
        subjectTemplate: "Re: Quick question about {{Company}} product velocity",
        bodyTemplate: "Hello Team,\n\nJust following up on how your workflow automation is holding up in {{Industry}}.\n\n{{Personalization}}\n\nBest,\nDev Growth",
        promptInstruction: "Keep under 30 words. Extremely direct, humble but enthusiastic.",
        tone: "casual"
      };
    }

    onCampaignCreated({
      name: campaignName,
      recipients: processedRecipients,
      template: defaultTemplate,
    });
  };

  return (
    <div className="bg-[#16161A] rounded-2xl border border-white/5 p-6 font-sans shadow-xl animate-fade-in" id="upload-wizard">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-white">Launch New Campaign Run</h2>
          <p className="text-xs text-gray-400 mt-0.5">Upload, map, and create high-conversion custom outreach queues.</p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-medium">
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">Step 1: Parse CSV</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-gray-500">Step 2: Template Outreach & Gemini</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl p-3.5 flex items-start space-x-2.5 mb-5" id="upload-error-banner">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {parsedData.length === 0 ? (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/5 scale-98"
                : "border-white/10 hover:border-white/20 bg-white/[0.01]"
            }`}
            id="dropzone"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleInputChange}
              accept=".csv"
              className="hidden"
              id="file-csv-input"
            />
            <div className="h-10 w-10 rounded-full bg-[#222228] border border-white/5 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-gray-200">Drag & drop your companies spreadsheet</p>
            <p className="text-xs text-gray-500 mt-1">Accepts standard .CSV files up to 10MB</p>
            <button
              type="button"
              className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10 transition-colors"
              id="btn-trigger-browse"
            >
              Browse Files
            </button>
          </div>

          <div className="bg-[#121216]/50 border border-white/5 rounded-xl p-4 space-y-3.5" id="template-instructions">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Example CSV Spreadsheet Structure</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono border-collapse text-gray-350">
                <thead>
                  <tr className="border-b border-white/5 text-gray-300 bg-white/5">
                    <th className="py-1 px-2 font-semibold">Company</th>
                    <th className="py-1 px-2 font-semibold">Email</th>
                    <th className="py-1 px-2 font-semibold">Industry</th>
                    <th className="py-1 px-2 font-semibold">Personalization</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  <tr className="border-b border-white/5">
                    <td className="py-1.5 px-2">BetaFlow Inc</td>
                    <td className="py-1.5 px-2">hello@betaflow.io</td>
                    <td className="py-1.5 px-2 text-indigo-300">Logistics</td>
                    <td className="py-1.5 px-2">Just opened Dallas hub</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2">Zephyr FinTech</td>
                    <td className="py-1.5 px-2">growth@zephyr.co</td>
                    <td className="py-1.5 px-2 text-indigo-300">Finance</td>
                    <td className="py-1.5 px-2">Integrated Stripe recently</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerateBase} className="space-y-6" id="wizard-form">
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs rounded-xl px-4 py-3 flex items-center justify-between shadow-xs" id="upload-success">
            <div className="flex items-center space-x-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Parsed <strong>{parsedData.length} records</strong> from spreadsheet <strong>{fileName}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={resetUpload}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 underline hover:no-underline transition-all cursor-pointer"
              id="btn-reupload-csv"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Replace File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Campaign Campaign Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Outreach Category Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {(["sales", "partnership", "followup"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCampaignType(type)}
                    className={`py-2 text-xs font-bold capitalize border transition-all rounded-xl cursor-pointer ${
                      campaignType === type
                        ? "bg-indigo-500 border-transparent text-white shadow-lg shadow-indigo-500/10"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border border-white/5 rounded-2xl bg-white/[0.01]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
              <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              <span>Map CSV Header Columns & Dynamic AI Pullers</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Company Name *</label>
                <select
                  className="w-full px-2 py-1.5 text-xs bg-[#121216]/55 border border-white/10 rounded-xl text-gray-300 outline-hidden font-medium cursor-pointer focus:border-indigo-500/50"
                  value={mapping.company}
                  onChange={(e) => onMappingChange("company", e.target.value)}
                  required
                >
                  <option value="" className="bg-[#16161A]">-- Choose Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h} className="bg-[#16161A]">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Column *</label>
                <select
                  className="w-full px-2 py-1.5 text-xs bg-[#121216]/55 border border-white/10 rounded-xl text-gray-300 outline-hidden font-medium cursor-pointer focus:border-indigo-500/50"
                  value={mapping.email}
                  onChange={(e) => onMappingChange("email", e.target.value)}
                  required
                >
                  <option value="" className="bg-[#16161A]">-- Choose Column --</option>
                  <option value="__discover__" className="bg-[#16161A] font-semibold text-indigo-400">💡 Auto-Predict via Gemini</option>
                  {headers.map((h) => (
                    <option key={h} value={h} className="bg-[#16161A]">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Company Website</label>
                <select
                  className="w-full px-2 py-1.5 text-xs bg-[#121216]/55 border border-white/10 rounded-xl text-gray-300 outline-hidden font-medium cursor-pointer focus:border-indigo-500/50"
                  value={mapping.website}
                  onChange={(e) => onMappingChange("website", e.target.value)}
                >
                  <option value="" className="bg-[#16161A]">-- Predict from Name --</option>
                  {headers.map((h) => (
                    <option key={h} value={h} className="bg-[#16161A]">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Company Industry</label>
                <select
                  className="w-full px-2 py-1.5 text-xs bg-[#121216]/55 border border-white/10 rounded-xl text-gray-300 outline-hidden font-medium cursor-pointer focus:border-indigo-500/50"
                  value={mapping.industry}
                  onChange={(e) => onMappingChange("industry", e.target.value)}
                >
                  <option value="" className="bg-[#16161A]">-- Hardcode to "General" --</option>
                  {headers.map((h) => (
                    <option key={h} value={h} className="bg-[#16161A]">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Custom Notes Detail</label>
                <select
                  className="w-full px-2 py-1.5 text-xs bg-[#121216]/55 border border-white/10 rounded-xl text-gray-300 outline-hidden font-medium cursor-pointer focus:border-indigo-500/50"
                  value={mapping.additionalInfo}
                  onChange={(e) => onMappingChange("additionalInfo", e.target.value)}
                >
                  <option value="" className="bg-[#16161A]">-- None (Dynamic Only) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h} className="bg-[#16161A]">{h}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 bg-[#16161A]">
            <span className="text-xs text-gray-450 font-medium font-mono">
              Fields: Company [{mapping.company || "x"}] | Email [{mapping.email === "__discover__" ? "AI Prediction" : (mapping.email || "x")}] | Website [{mapping.website || "Auto"}]
            </span>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
              id="btn-process-campaign-mapped"
            >
              <span>Verify & Design Template</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
