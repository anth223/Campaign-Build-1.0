import React, { useState, useEffect } from "react";
import { Recipient } from "../types";
import { Inbox, Eye, Reply, Send, Loader2, ArrowRightCircle, Mail, CheckCircle, Terminal, HelpCircle } from "lucide-react";

interface SimulationQueueProps {
  onActivityChanged: () => void;
}

export default function SimulationQueue({ onActivityChanged }: SimulationQueueProps) {
  const [mails, setMails] = useState<(Recipient & { campaignName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [customReply, setCustomReply] = useState("");
  const [acting, setActing] = useState(false);

  // Suggestions for replies
  const suggestions = [
    "Yes, this sounds highly interesting! Can you send a calendar link?",
    "We use something similar but of course we are open to auditing other options. What is your pricing?",
    "Please remove me from your sales pipeline. Unsubscribe."
  ];

  const fetchMails = async () => {
    try {
      const res = await fetch("/api/simulation/sent-mails");
      if (res.ok) {
        const data = await res.json();
        setMails(data);
        if (data.length > 0 && selectedIndex === -1) {
          setSelectedIndex(0);
        }
      }
    } catch (err) {
      console.error("Simulation retrieval error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMails();
  }, []);

  // Action: Trigger direct open webhook via tracking pixel url
  const simulateOpen = async (recipient: Recipient) => {
    if (acting) return;
    setActing(true);
    try {
      // Fetch the actual tracking pixel endpoint
      await fetch(`/api/track/open/${recipient.id}`);
      await fetchMails();
      onActivityChanged();
    } catch (err) {
      console.error("Open simulation failure:", err);
    } finally {
      setActing(false);
    }
  };

  // Action: Submit reply simulation
  const simulateReplySubmit = async (e: React.FormEvent, recipient: Recipient) => {
    e.preventDefault();
    if (!customReply.trim() || acting) return;
    setActing(true);
    try {
      const res = await fetch("/api/track/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipient.id,
          replyText: customReply
        })
      });
      if (res.ok) {
        setCustomReply("");
        await fetchMails();
        onActivityChanged();
      }
    } catch (err) {
      console.error("Reply simulation failure:", err);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-gray-450 font-sans">
        <Loader2 className="w-5 h-5 mr-1.5 animate-spin text-indigo-400" />
        <span>Syncing sandboxed outbox items...</span>
      </div>
    );
  }

  const activeMail = selectedIndex !== -1 ? mails[selectedIndex] : null;

  return (
    <div className="bg-[#16161A] rounded-2xl border border-white/5 shadow-xl overflow-hidden font-sans grid grid-cols-1 md:grid-cols-5 min-h-[500px] animate-fade-in" id="simulation-queue-console">
      {/* LEFT LIST PANEL */}
      <div className="md:col-span-2 border-r border-white/5 flex flex-col bg-[#121216]/20 max-h-[600px]">
        <div className="p-4 bg-white/[0.01] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest">Interactive Sandbox Shell</h3>
          </div>
          <button
            onClick={fetchMails}
            className="text-2xs font-bold text-gray-450 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>Sync outbox</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {mails.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center space-y-2 h-full">
              <Mail className="w-8 h-8 text-gray-700 stroke-1" />
              <p className="font-semibold text-gray-300">Sent outbox is currently empty</p>
              <p className="max-w-[200px] text-gray-500 mx-auto leading-relaxed">
                Once emails are generated and you click "Send Campaign", sent copies populate here immediately for simulation.
              </p>
            </div>
          ) : (
            mails.map((mail, idx) => {
              const opened = !!mail.openedAt;
              const replied = !!mail.repliedAt;

              return (
                <button
                  key={mail.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full p-4.5 text-left transition-all relative flex flex-col space-y-1 cursor-pointer ${
                    selectedIndex === idx ? "bg-white/[0.04] border-l-2 border-indigo-500 shadow-2xs font-semibold text-white" : "hover:bg-white/[0.01] border-l-2 border-transparent"
                  }`}
                  id={`btn-mail-item-${mail.id}`}
                >
                  <div className="flex items-center justify-between text-3xs text-gray-455">
                    <span className="truncate max-w-[120px] font-bold text-indigo-400">{mail.campaignName}</span>
                    <span>{mail.industry}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-200 truncate pr-4">{mail.company}</h4>
                  <p className="text-3xs text-gray-450 truncate">{mail.subject}</p>
                  
                  <div className="flex items-center space-x-2 pt-1">
                    {replied ? (
                      <span className="flex items-center text-3xs text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 border border-indigo-500/20 rounded-md">
                        <Reply className="w-2.5 h-2.5 mr-0.5" />
                        <span>Replied</span>
                      </span>
                    ) : opened ? (
                      <span className="flex items-center text-3xs text-orange-300 font-bold bg-orange-500/10 px-1.5 py-0.5 border border-orange-500/20 rounded-md">
                        <Eye className="w-2.5 h-2.5 mr-0.5" />
                        <span>Opened</span>
                      </span>
                    ) : (
                      <span className="flex items-center text-3xs text-gray-400 bg-white/5 px-1.5 py-0.5 border border-white/5 rounded-md">
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT DISPLAY AND WEBHOOK ACTION PANEL */}
      <div className="md:col-span-3 flex flex-col max-h-[600px] overflow-y-auto bg-transparent">
        {activeMail ? (
          <div className="flex flex-col h-full divide-y divide-white/5">
            {/* VIEWING ENVELOPE */}
            <div className="p-5 space-y-3.5 bg-white/[0.01]">
              <div className="space-y-1">
                <span className="text-3xs font-bold text-indigo-400 tracking-wider block uppercase">Recipient Inbox Mock</span>
                <span className="text-2xs text-gray-305 block">
                  To: <strong className="text-white">{activeMail.company}</strong> &lt;{activeMail.email}&gt;
                </span>
                <span className="text-2xs text-gray-305 block">
                  Subject: <strong className="text-white">{activeMail.subject}</strong>
                </span>
              </div>

              <div className="bg-[#121216]/55 border border-white/10 rounded-xl p-4 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                {activeMail.body}
                
                {/* Visual simulator details referencing actual pixel */}
                <div className="mt-4 pt-3 border-t border-dashed border-white/5 text-3xs text-gray-500 font-sans flex items-center justify-between bg-white/5 px-2 py-1.5 rounded-lg">
                  <span>[Pixel Code Attached]: &lt;img src="/api/track/open/{activeMail.id}" /&gt;</span>
                  <span className="font-semibold text-emerald-400 text-3xs">Pixel Active ✓</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE COMPONENT: SEND TEST SIMULATORS */}
            <div className="p-5 space-y-4">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <ArrowRightCircle className="w-4 h-4 text-indigo-400" />
                <span>Trigger Live Client Behaviors</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => simulateOpen(activeMail)}
                    disabled={acting || !!activeMail.openedAt}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                      activeMail.openedAt
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-450 cursor-not-allowed"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                    }`}
                    id={`btn-simulate-open-${activeMail.id}`}
                  >
                    <Eye className="w-4 h-4 text-orange-400" />
                    <span>{activeMail.openedAt ? "Opened ✓" : "Simulate Open"}</span>
                  </button>
                  <span className="text-3xs text-gray-500 mt-1 block leading-tight text-center">
                    Requests hidden pixel. Watch opens jump!
                  </span>
                </div>

                <div className="sm:col-span-2 space-y-2 select-none">
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomReply(sug)}
                        className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-md text-3xs text-left max-w-[200px] truncate border border-white/5 cursor-pointer transition-all"
                      >
                        {idx + 1}. "{sug.substring(0, 16)}..."
                      </button>
                    ))}
                  </div>
                  <span className="text-3xs text-gray-500 mt-1 block">Click a predefined response to autofill.</span>
                </div>
              </div>

              <form onSubmit={(e) => simulateReplySubmit(e, activeMail)} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-3xs font-bold text-gray-450 uppercase tracking-widest">Write Simulated Customer Reply</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-xl outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-medium text-white"
                    placeholder="Type client response text here..."
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={acting || !customReply.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/10"
                  id={`btn-simulate-reply-${activeMail.id}`}
                >
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Reply className="w-3.5 h-3.5" />}
                  <span>Submit Client Reply</span>
                </button>
              </form>
            </div>

            {/* PREVIOUS RESPONSES DISCOVERY VIEWER */}
            {activeMail.repliedAt && (
              <div className="p-5 bg-indigo-500/5 space-y-2 border-t border-white/5">
                <span className="text-3xs font-bold text-indigo-400 block uppercase tracking-wide">Customer Feedback response</span>
                <div className="border border-indigo-500/20 bg-[#121216]/60 rounded-xl p-3 text-xs leading-relaxed text-gray-300 font-mono shadow-md">
                  <div className="flex items-center justify-between text-3xs text-indigo-400 mb-1.5">
                    <span>From: {activeMail.email}</span>
                    <span>Received: {new Date(activeMail.repliedAt).toLocaleTimeString()}</span>
                  </div>
                  "{activeMail.replyContent}"
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 text-xs">
            <Inbox className="w-10 h-10 text-gray-700 stroke-1 mb-2" />
            <p className="font-semibold text-gray-300">No email selected</p>
            <p className="max-w-xs mx-auto text-gray-500 mt-1 leading-normal">
              Click any recipient mail on the left shell list to view generated output, pull up simulator hooks, and test response feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
