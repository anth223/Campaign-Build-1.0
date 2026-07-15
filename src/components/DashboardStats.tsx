import React, { useState, useEffect } from "react";
import { DashboardOverview } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Mail, RefreshCcw, Eye, Reply, TrendingUp, Calendar, Inbox, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

interface DashboardStatsProps {
  refreshTrigger: number;
}

export default function DashboardStats({ refreshTrigger }: DashboardStatsProps) {
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed fetching campaign telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  // Real-time stats auto-polling (every 3 seconds) for responsive tracking!
  useEffect(() => {
    if (!polling) return;
    const pollId = setInterval(fetchStats, 3000);
    return () => clearInterval(pollId);
  }, [polling]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 font-sans" id="stats-loading">
        <RefreshCcw className="w-6 h-6 mr-2 animate-spin text-indigo-400" />
        <span className="mt-2 text-xs font-semibold">Gathering telemetry metrics...</span>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Campaigns",
      value: stats?.totalCampaigns || 0,
      icon: Inbox,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Emails Dispatched",
      value: stats?.totalSent || 0,
      icon: Mail,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Email Opens",
      value: stats?.totalOpened || 0,
      icon: Eye,
      color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      suffix: ` (${stats?.openPercentage || 0}%)`
    },
    {
      title: "Replies Received",
      value: stats?.totalReplied || 0,
      icon: Reply,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      suffix: ` (${stats?.replyPercentage || 0}%)`
    },
  ];

  return (
    <div className="space-y-6 font-sans" id="dashboard-analytics-root">
      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 flex items-center justify-between shadow-lg relative overflow-hidden transition-all hover:bg-white/[0.01]"
            >
              <div className="space-y-1">
                <span className="text-3xs font-bold text-gray-400 tracking-widest uppercase block">{kpi.title}</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold font-mono text-gray-100">{kpi.value}</span>
                  {kpi.suffix && (
                    <span className="text-xs font-semibold text-gray-400">{kpi.suffix}</span>
                  )}
                </div>
              </div>
              <div className={`h-10 w-10 border rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART: INDUSTRY METRICS */}
        <div className="lg:col-span-2 bg-[#16161A] rounded-2xl border border-white/5 shadow-lg p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Industry Performance Analysis</h3>
              <p className="text-3xs text-gray-400 mt-0.5">Vetting open and response ratios relative to company demographics.</p>
            </div>
            
            <button
              onClick={fetchStats}
              className="p-1 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-white cursor-pointer"
              title="Manual Sync"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {stats && stats.industryStats && stats.industryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.industryStats}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="industry" stroke="#4b5563" fontSize={11} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#16161A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#f3f4f6",
                      fontFamily: "Inter, sans-serif",
                    }}
                    itemStyle={{ color: "#e5e7eb" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }} />
                  <Bar dataKey="sent" fill="#6366f1" name="Sent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opened" fill="#f97316" name="Opened" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="replied" fill="#a855f7" name="Replied" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <TrendingUp className="w-8 h-8 mb-2 stroke-1 text-gray-500" />
                <span>Waiting for campaign delivery data to generate analytics...</span>
              </div>
            )}
          </div>
        </div>

        {/* COMPONENT: REAL-TIME TIMELINE LOGGER */}
        <div className="bg-[#16161A] rounded-2xl border border-white/5 shadow-lg p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Live Campaign Tracker</h3>
              <p className="text-3xs text-gray-400 mt-0.5">Capturing pixel opens and customer feedback records.</p>
            </div>
            <label className="flex items-center space-x-1.5 text-3xs font-semibold text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={polling}
                onChange={(e) => setPolling(e.target.checked)}
                className="rounded-sm border-white/10 text-indigo-500 focus:ring-transparent bg-white/5"
              />
              <span>Auto-poll</span>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-white/5 pr-1 space-y-3 font-sans">
            {stats && stats.activityLogs && stats.activityLogs.length > 0 ? (
              stats.activityLogs.map((log) => {
                let badgeColor = "bg-white/5 text-gray-300 border-white/5";
                if (log.type === "open") badgeColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                if (log.type === "reply") badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                if (log.type === "success") badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                if (log.type === "warn") badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                return (
                  <div key={log.id} className="pt-3 first:pt-0 flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-3xs font-bold border rounded-xs ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-3xs text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="text-2xs text-gray-300 leading-relaxed font-semibold">
                      {log.details}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs py-10">
                <Calendar className="w-8 h-8 mb-1.5 stroke-1 text-gray-500" />
                <span>No logger actions received.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
