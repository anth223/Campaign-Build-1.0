import React, { useState, useEffect } from "react";
import { SMTPConfig } from "../types";
import { Check, Settings, ShieldAlert, Cpu, Database, Save, Loader2 } from "lucide-react";

interface SettingsPanelProps {
  onSettingsChanged?: () => void;
}

export default function SettingsPanel({ onSettingsChanged }: SettingsPanelProps) {
  const [config, setConfig] = useState<SMTPConfig>({
    host: "",
    port: 2525,
    secure: false,
    user: "",
    pass: "",
    fromName: "",
    fromEmail: "",
    useSimulation: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading SMTP credentials:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (name === "port") {
      finalValue = parseInt(value, 10) || 0;
    }

    setConfig((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleModeToggle = (useSimulationValue: boolean) => {
    setConfig((prev) => ({
      ...prev,
      useSimulation: useSimulationValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedStatus(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedStatus(true);
        if (onSettingsChanged) onSettingsChanged();
        setTimeout(() => setSavedStatus(false), 3000);
      }
    } catch (err) {
      console.error("Failed saving SMTP setting configuration:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-450 font-sans" id="settings-loading">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-indigo-400" />
        <span>Loading dispatcher credentials...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#16161A] rounded-2xl border border-white/5 shadow-xl overflow-hidden font-sans animate-fade-in" id="settings-panel">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Mail Dispatch Settings</h2>
        </div>
        <div className="flex items-center space-x-1 p-0.5 bg-white/5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => handleModeToggle(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.useSimulation
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                : "text-gray-400 hover:text-white"
            }`}
            id="btn-toggle-sim"
          >
            <div className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Sandbox Simulation</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleModeToggle(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !config.useSimulation
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                : "text-gray-400 hover:text-white"
            }`}
            id="btn-toggle-smtp"
          >
            <div className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5" />
              <span>Real SMTP Server</span>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5" id="settings-form">
        {config.useSimulation ? (
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl p-4 flex items-start space-x-3 text-sm">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Sandboxed Simulation Active</p>
              <p className="text-gray-400 leading-relaxed text-xs">
                Perfect for secure, sandbox testing. Dispatched emails go straight to our virtual inbox below rather than actual recipient domains. No SMTP settings required. You can click-open and self-reply inside the sandbox console to inspect logs in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-xl p-4 flex items-start space-x-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-450 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">Live SMTP Mailer Setup</p>
              <p className="text-gray-400 leading-relaxed text-xs">
                Active connections dispatch actual emails. Please double-check your credential setups carefully. Unrequested emails sent through live providers may impact your domain deliverability rating or violate transactional limits.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Sender Visible Name</label>
            <input
              type="text"
              name="fromName"
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium text-white"
              placeholder="e.g. Acme Sales Partner"
              value={config.fromName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Sender Email Address</label>
            <input
              type="email"
              name="fromEmail"
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium text-white"
              placeholder="e.g. greetings@yourdomain.com"
              value={config.fromEmail}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {!config.useSimulation && (
          <div className="pt-3 border-t border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-450 tracking-wider uppercase">SMTP Credentials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">SMTP Host Hostname</label>
                <input
                  type="text"
                  name="host"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono text-white"
                  placeholder="smtp.example.com"
                  value={config.host}
                  onChange={handleChange}
                  required={!config.useSimulation}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Port</label>
                <input
                  type="number"
                  name="port"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono text-white"
                  placeholder="465"
                  value={config.port}
                  onChange={handleChange}
                  required={!config.useSimulation}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">SMTP Username</label>
                <input
                  type="text"
                  name="user"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono text-white"
                  placeholder="greetings@domain.com"
                  value={config.user}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">SMTP Authorisation Password</label>
                <input
                  type="password"
                  name="pass"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono text-white"
                  placeholder="••••••••••••••"
                  value={config.pass}
                  onChange={handleChange}
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs font-medium text-gray-400 select-none pt-1 cursor-pointer">
              <input
                type="checkbox"
                name="secure"
                checked={config.secure}
                onChange={handleChange}
                className="rounded-md text-indigo-500 bg-white/5 border-white/10 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Enable Secure Connection (SSL/TLS, recommended for Port 465)</span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <p className="text-gray-500 text-xs">
            {config.useSimulation ? "Sandbox state saves immediately" : "Credentials safely kept on app backend"}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
            id="btn-save-settings"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedStatus ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-450">Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Setup</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
