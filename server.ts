import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Base Database structure setup
const DB_FILE = path.join(process.cwd(), "db.json");

interface Database {
  settings: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
    useSimulation: boolean;
  };
  campaigns: any[];
  activityLogs: {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    type: 'info' | 'success' | 'warn' | 'open' | 'reply';
  }[];
}

const DEFAULT_DB: Database = {
  settings: {
    host: "smtp.mailtrap.io",
    port: 2525,
    secure: false,
    user: "",
    pass: "",
    fromName: "Sales Growth Team",
    fromEmail: "outreach@example.com",
    useSimulation: true,
  },
  campaigns: [
    {
      id: "sample-id-1",
      name: "SaaS Launch - Initial Cold Outreach",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      status: "completed",
      template: {
        subjectTemplate: "Transforming {{Industry}} workflow for {{Company}} team",
        bodyTemplate: "Hi team at {{Company}},\n\nI was researching companies in the {{Industry}} sector and noticed some bottlenecks in digital workflows. We recently built an AI-powered automation tool that cuts down delivery times by 40%.\n\n{{Personalization}}\n\nWould you be open to a quick 5-minute chat next Thursday?\n\nBest,\nSales Team",
        promptInstruction: "Highlight productivity increase. Speak professionally but casually. Reference industry bottlenecks.",
        tone: "professional"
      },
      recipients: [
        {
          id: "rec-1",
          campaignId: "sample-id-1",
          company: "AlphaTech Systems",
          email: "contact@alphatech.example.com",
          industry: "Software",
          additionalInfo: "They recently expanded their cloud team.",
          subject: "Streamlining Software delivery for AlphaTech Systems",
          body: "Hi team at AlphaTech Systems,\n\nI was researching software builders and noticed some bottlenecks in fast deployment. Since you recently expanded your cloud team, we recently built an AI automation platform that cuts developers' delivery time on pipelines by 40%.\n\nI thought this could help AlphaTech Systems ship products even faster to market.\n\nWould you be open to a quick 5-minute call next week?\n\nBest,\nGrowth Partner",
          status: "sent",
          trackingId: "track-alphatech",
          openedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          repliedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
          replyContent: "Thanks for the email. We actually use Jenkins and are looking for something faster. Can you send over a demo link?"
        },
        {
          id: "rec-2",
          campaignId: "sample-id-1",
          company: "Apex Healthcare",
          email: "info@apexhealth.example.com",
          industry: "Healthcare",
          additionalInfo: "Developing telemetry medical apps.",
          subject: "Enhancing digital healthcare flows at Apex Healthcare",
          body: "Hi team at Apex Healthcare,\n\nI saw your work developing state-of-the-art telemetry medical apps. Ensuring fast compliance and smooth healthcare data flows is always a bottleneck.\n\nWe would love to show you how our private AI-powered automation engine secures health information while accelerating deployments by 40%.\n\nWould you be open to a brief chat next Tuesday?\n\nBest,\nGrowth Partner",
          status: "sent",
          trackingId: "track-apex",
          openedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
        },
        {
          id: "rec-3",
          campaignId: "sample-id-1",
          company: "Nexus Finance",
          email: "inbox@nexusfin.example.com",
          industry: "Finance",
          additionalInfo: "Just closed Series A.",
          subject: "Securing Financial workflows at Nexus Finance",
          body: "Hi team at Nexus Finance,\n\nCongratulations on your recent Series A. Fast-growing fintechs face huge compliance overhead with transactional datasets.\n\nOur system automates routine reporting by 40% so Nexus Finance can focus on building core smart contracts.\n\nIs there a good time for a brief demo next Wednesday?\n\nBest,\nGrowth Partner",
          status: "sent",
          trackingId: "track-nexus"
        }
      ],
      stats: {
        total: 3,
        pending: 0,
        generating: 0,
        ready: 0,
        sending: 0,
        sent: 3,
        failed: 0,
        opened: 2,
        replied: 1
      }
    }
  ],
  activityLogs: [
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
      action: "Campaign Created",
      details: "SaaS Launch - Initial Cold Outreach created with 3 recipients.",
      type: "info"
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      action: "Gemini Customized Copy",
      details: "Successfully generated 3 personalized emails using Gemini-3.5-flash.",
      type: "success"
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 45 * 3600 * 1000).toISOString(),
      action: "Campaign Sent",
      details: "Sent out 3 emails successfully (Simulation Mode).",
      type: "info"
    },
    {
      id: "log-4",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      action: "Email Opened",
      details: "AlphaTech Systems (contact@alphatech.example.com) opened their email.",
      type: "open"
    },
    {
      id: "log-5",
      timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      action: "Response Received",
      details: "AlphaTech Systems replied: 'Thanks for the email. We actually use...'",
      type: "reply"
    },
    {
      id: "log-6",
      timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      action: "Email Opened",
      details: "Apex Healthcare (info@apexhealth.example.com) opened their email.",
      type: "open"
    }
  ]
};

// Database utility methods
function loadDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file", err);
  }
  saveDB(DEFAULT_DB);
  return DEFAULT_DB;
}

function saveDB(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

function addLog(action: string, details: string, type: 'info' | 'success' | 'warn' | 'open' | 'reply') {
  const db = loadDB();
  db.activityLogs.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    action,
    details,
    type,
  });
  // Cap at 100 logs
  if (db.activityLogs.length > 100) {
    db.activityLogs = db.activityLogs.slice(0, 100);
  }
  saveDB(db);
}

// Ensure database file is initialized on import
loadDB();

// Initialize Gemini API client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Return client with mock/missing key message on API call, but don't crash startup
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Expose root configuration files for the exporter to fetch their genuine content instead of getting the index.html fallback
const rootConfigFiles = [
  "package.json",
  "tsconfig.json",
  ".env.example",
  ".gitignore",
  "vite.config.ts",
  "metadata.json",
  "Dockerfile",
  ".dockerignore",
  "package-lock.json"
];

rootConfigFiles.forEach((file) => {
  app.get(`/${file}`, (req, res) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      if (file.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json");
      } else if (file.endsWith(".ts")) {
        res.setHeader("Content-Type", "text/plain");
      } else {
        res.setHeader("Content-Type", "text/plain");
      }
      res.sendFile(filePath);
    } else {
      res.status(404).send("Not found");
    }
  });
});

// --- API ROUTES ---

// 1. Settings Routes
app.get("/api/settings", (req, res) => {
  const db = loadDB();
  res.json(db.settings);
});

app.post("/api/settings", (req, res) => {
  const db = loadDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  addLog("Settings Updated", `Configured sending mode as: ${db.settings.useSimulation ? 'Simulation' : 'Real SMTP'}`, 'info');
  res.json({ success: true, settings: db.settings });
});

// 2. Campaigns Routes
app.get("/api/campaigns", (req, res) => {
  const db = loadDB();
  res.json(db.campaigns);
});

app.get("/api/campaigns/:id", (req, res) => {
  const db = loadDB();
  const campaign = db.campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  res.json(campaign);
});

app.post("/api/campaigns", (req, res) => {
  const { name, recipients, template } = req.body;
  if (!name || !recipients || !Array.isArray(recipients)) {
    return res.status(400).json({ error: "Invalid campaign parameters" });
  }

  const db = loadDB();
  const newCampaign = {
    id: "camp-" + Math.random().toString(36).substring(2, 9),
    name,
    createdAt: new Date().toISOString(),
    status: "draft",
    template: {
      subjectTemplate: template?.subjectTemplate || "Hello from Sales - {{Company}}",
      bodyTemplate: template?.bodyTemplate || "Hi {{Company}} team,\n\nI saw your work in {{Industry}}.\n\nBest,\nSaaS Team",
      promptInstruction: template?.promptInstruction || "Ensure copy targets people in their industry.",
      tone: template?.tone || "professional"
    },
    recipients: recipients.map((r: any) => ({
      id: "rec-" + Math.random().toString(36).substring(2, 9),
      campaignId: "", // Will map below
      company: r.company || "Unknown Company",
      email: r.email || "",
      website: r.website || "",
      shouldDiscoverEmail: !!r.shouldDiscoverEmail,
      industry: r.industry || "General",
      additionalInfo: r.additionalInfo || "",
      subject: "",
      body: "",
      status: "pending",
      trackingId: "trk-" + Math.random().toString(36).substring(2, 12)
    })),
    stats: {
      total: recipients.length,
      pending: recipients.length,
      generating: 0,
      ready: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      opened: 0,
      replied: 0
    }
  };

  // Map campaign ID
  newCampaign.recipients.forEach(r => {
    r.campaignId = newCampaign.id;
  });

  db.campaigns.unshift(newCampaign);
  saveDB(db);
  addLog("Campaign Created", `Campaign "${name}" initialized with ${recipients.length} recipients.`, 'info');
  res.json(newCampaign);
});

app.delete("/api/campaigns/:id", (req, res) => {
  const db = loadDB();
  const index = db.campaigns.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  const deleted = db.campaigns.splice(index, 1);
  saveDB(db);
  addLog("Campaign Deleted", `Deleted campaign "${deleted[0].name}".`, 'warn');
  res.json({ success: true });
});

// 3. Gemini Customization Generation Route
app.post("/api/campaigns/:id/generate", async (req, res) => {
  const campaignId = req.params.id;
  const db = loadDB();
  const campaign = db.campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  // Set state to generating
  campaign.status = "generating";
  campaign.recipients.forEach((r: any) => {
    if (r.status === "pending" || r.status === "failed") {
      r.status = "generating";
    }
  });
  
  // Recalculate stats
  campaign.stats.pending = campaign.recipients.filter((r: any) => r.status === 'pending').length;
  campaign.stats.generating = campaign.recipients.filter((r: any) => r.status === 'generating').length;
  saveDB(db);

  addLog("Generation Started", `Personalizing copy for "${campaign.name}" via Gemini-3.5-flash.`, 'info');

  // We immediately respond to the client so that they can poll our status.
  // We'll process generation asynchronously.
  res.json({ message: "Generation started in background", campaignId });

  // Background Async Generator Loop
  (async () => {
    try {
      const gClient = getGeminiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      
      const { subjectTemplate, bodyTemplate, promptInstruction, tone } = campaign.template;

      for (let r of campaign.recipients) {
        if (r.status !== "generating") continue;

        // --- STEP A: EMAIL & WEBSITE AI DISCOVERY ---
        if (r.shouldDiscoverEmail || !r.email || !r.email.includes("@")) {
          if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MOCK_KEY") {
            // Local fallback simulation directory loop
            await new Promise(resolve => setTimeout(resolve, 500)); // Mimic API network latency
            let cleanDomain = r.website ? r.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : "";
            if (!cleanDomain) {
              const nameSlug = r.company.toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .split(/\s+/)[0];
              cleanDomain = `${nameSlug || "enterprise"}.com`;
            }
            r.website = r.website || `https://www.${cleanDomain}`;
            r.email = `contact@${cleanDomain}`;
          } else {
            try {
              const discoveryPrompt = `
              Predict the corporate office/contact/inbound business email address and website for the following company.
              
              Company Details:
              - Name: ${r.company}
              - Website (if provided): ${r.website || "Not provided"}
              - Sector/Industry: ${r.industry}
              
              Identify or formulate a highly realistic contact/sales/info email (e.g. hello@domain.com, contact@domain.com, info@domain.com) suitable for cold outreach.
              Also, if the website was not provided, predict the company's real corporate URL.
              
              Respond STRICTLY in JSON format following the schema provided.
              `;

              const discoveryRes = await gClient.models.generateContent({
                model: "gemini-3.5-flash",
                contents: discoveryPrompt,
                config: {
                  systemInstruction: "You are an intelligent business directory data extractor. Predict correct company domains and inbound contact emails.",
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      email: {
                        type: Type.STRING,
                        description: "The predicted outreach/contact email address."
                      },
                      website: {
                        type: Type.STRING,
                        description: "The predicted company website URL."
                      }
                    },
                    required: ["email", "website"]
                  }
                }
              });

              const parsedDiscovery = JSON.parse(discoveryRes.text || "{}");
              if (parsedDiscovery.email && parsedDiscovery.email.includes("@")) {
                r.email = parsedDiscovery.email;
              } else {
                let cleanDomain = r.website ? r.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : "";
                if (!cleanDomain) {
                  const nameSlug = r.company.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)[0];
                  cleanDomain = `${nameSlug || "enterprise"}.com`;
                }
                r.email = `contact@${cleanDomain}`;
              }
              if (parsedDiscovery.website) {
                r.website = parsedDiscovery.website;
              }
            } catch (discErr) {
              console.error("Gemini email discovery failed:", discErr);
              let cleanDomain = r.website ? r.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : "";
              if (!cleanDomain) {
                const nameSlug = r.company.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)[0];
                cleanDomain = `${nameSlug || "enterprise"}.com`;
              }
              r.email = `contact@${cleanDomain}`;
            }
          }
        }

        // --- STEP B: personalizados EMAIL WRITING ---
        let subjectContent = "";
        let bodyContent = "";

        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MOCK_KEY") {
          // No real API key, simulate local intelligence formatting mapping
          await new Promise(resolve => setTimeout(resolve, 800)); // Sleep to mimic API call
          subjectContent = subjectTemplate
            .replace(/\{\{Company\}\}/g, r.company)
            .replace(/\{\{Industry\}\}/g, r.industry)
            .replace(/\{\{Personalization\}\}/g, r.additionalInfo || "");
          bodyContent = bodyTemplate
            .replace(/\{\{Company\}\}/g, r.company)
            .replace(/\{\{Industry\}\}/g, r.industry)
            .replace(/\{\{Personalization\}\}/g, r.additionalInfo || "");

          r.subject = `[Simulated AI] ` + subjectContent;
          r.body = bodyContent + "\n\n---\nRefined automatically based on target industry: " + r.industry;
          r.status = "ready";
        } else {
          try {
            // Build absolute focus prompt for Gemini to structure JSON output
            const prompt = `
Generate a personalized cold sales email subject line and body copy for this company.

Company Details:
- Name: ${r.company}
- Sector/Industry: ${r.industry}
- Website: ${r.website || "N/A"}
- Extra Mapping Context/Personalization Info: ${r.additionalInfo || "N/A"}

Base Template:
- Subject Draft: ${subjectTemplate}
- Body Draft Template: ${bodyTemplate}
- Communication Tone: ${tone}
- Extra copywriting guidance: ${promptInstruction}

Please fill the base template variables (like {{Company}}, {{Industry}}) and rewrite portions of the body and subject line to make it extremely appealing to a buyer in the "${r.industry}" space. Address typical challenges in their industry. Ensure the final email is cohesive, professionally structured, and matches the tone selection: "${tone}".

You MUST strictly comply with the requested JSON schema. Exclude generic intros/outros.
`;

            const aiResponse = await gClient.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                systemInstruction: "You are an expert sales outreach copywriter. Generate highly engaging personalized B2B emails. Make sure to return valid JSON following the schema precisely.",
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    subject: {
                      type: Type.STRING,
                      description: "The personalized subject line."
                    },
                    body: {
                      type: Type.STRING,
                      description: "The complete personalized email body. Do not include subject inside the body."
                    }
                  },
                  required: ["subject", "body"]
                }
              }
            });

            const parsedText = aiResponse.text || "{}";
            const result = JSON.parse(parsedText);
            
            r.subject = result.subject || subjectTemplate.replace(/\{\{Company\}\}/g, r.company).replace(/\{\{Industry\}\}/g, r.industry);
            r.body = result.body || bodyTemplate.replace(/\{\{Company\}\}/g, r.company).replace(/\{\{Industry\}\}/g, r.industry);
            r.status = "ready";
          } catch (apiErr: any) {
            console.error(`Gemini generation error for recipient ${r.company}`, apiErr);
            r.status = "failed";
            r.error = apiErr.message || "Failed calling Gemini API";
          }
        }

        // Live update db values on each processed contact
        const internalDB = loadDB();
        const activeCamp = internalDB.campaigns.find((c: any) => c.id === campaignId);
        if (activeCamp) {
          const recInDB = activeCamp.recipients.find((rec: any) => rec.id === r.id);
          if (recInDB) {
            recInDB.status = r.status;
            recInDB.subject = r.subject;
            recInDB.body = r.body;
            if (r.error) recInDB.error = r.error;
          }
          
          // Re-calculate stats
          activeCamp.stats.pending = activeCamp.recipients.filter((rec: any) => rec.status === 'pending').length;
          activeCamp.stats.generating = activeCamp.recipients.filter((rec: any) => rec.status === 'generating').length;
          activeCamp.stats.ready = activeCamp.recipients.filter((rec: any) => rec.status === 'ready').length;
          activeCamp.stats.failed = activeCamp.recipients.filter((rec: any) => rec.status === 'failed').length;
          
          saveDB(internalDB);
        }
      }

      // Finish campaign configuration
      const finalDB = loadDB();
      const finalCamp = finalDB.campaigns.find((c: any) => c.id === campaignId);
      if (finalCamp) {
        finalCamp.status = "ready";
        saveDB(finalDB);
      }
      addLog("Generation Succeeded", `Completed dynamic email personalization for "${campaign.name}"!`, 'success');
    } catch (bgErr) {
      console.error("Background text generation loop failed", bgErr);
    }
  })();
});

// 4. Send Email Campaign Route
app.post("/api/campaigns/:id/send", async (req, res) => {
  const campaignId = req.params.id;
  const db = loadDB();
  const campaign = db.campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  const { useSimulation, host, port, secure, user, pass, fromEmail, fromName } = db.settings;

  campaign.status = "sending";
  campaign.recipients.forEach((r: any) => {
    if (r.status === "ready") {
      r.status = "sending";
    }
  });
  saveDB(db);

  addLog("Dispatch Started", `Sending campaign "${campaign.name}" out to recipients. Mode: ${useSimulation ? 'Simulation' : 'SMTP Server'}`, 'info');
  res.json({ message: "Delivery dispatch started", campaignId });

  // Background sending thread
  (async () => {
    try {
      let transporter: nodemailer.Transporter | null = null;
      if (!useSimulation) {
        // Create actual nodemailer SMTP transport
        transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass
          }
        });
      }

      const hostUrl = process.env.APP_URL || "http://localhost:3000";

      for (let r of campaign.recipients) {
        if (r.status !== "sending") continue;

        // Hidden 1x1 GIF tracking pixel HTML code
        const trackingPixelHtml = `
          <br><br>
          <img src="${hostUrl}/api/track/open/${r.id}" alt="" width="1" height="1" style="display:none; width: 1px; height: 1px; border: 0;" />
        `;
        const emailBodyWithPixel = r.body.replace(/\n/g, "<br>") + trackingPixelHtml;

        if (useSimulation) {
          // Sandbox simulation mode
          await new Promise(resolve => setTimeout(resolve, 500)); // fake delay
          r.status = "sent";
        } else {
          // SMTP Mode
          try {
            if (transporter) {
              await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: r.email,
                subject: r.subject,
                html: emailBodyWithPixel,
                text: r.body // fallback text payload
              });
              r.status = "sent";
            } else {
              throw new Error("SMTP Transporter not configured correctly");
            }
          } catch (sendErr: any) {
            console.error(`Failed to send real SMTP to ${r.company} (${r.email})`, sendErr);
            r.status = "failed";
            r.error = sendErr.message || "Failed contacting external SMTP host";
          }
        }

        // Live write status to db
        const loopDB = loadDB();
        const liveCamp = loopDB.campaigns.find((c: any) => c.id === campaignId);
        if (liveCamp) {
          const recInLoop = liveCamp.recipients.find((rec: any) => rec.id === r.id);
          if (recInLoop) {
            recInLoop.status = r.status;
            if (r.error) recInLoop.error = r.error;
          }
          
          liveCamp.stats.sending = liveCamp.recipients.filter((rec: any) => rec.status === 'sending').length;
          liveCamp.stats.sent = liveCamp.recipients.filter((rec: any) => rec.status === 'sent').length;
          liveCamp.stats.failed = liveCamp.recipients.filter((rec: any) => rec.status === 'failed').length;
          saveDB(loopDB);
        }
      }

      // Finish campaign delivery status
      const completedDB = loadDB();
      const compCamp = completedDB.campaigns.find((c: any) => c.id === campaignId);
      if (compCamp) {
        compCamp.status = "completed";
        saveDB(completedDB);
      }
      addLog("Dispatch Succeeded", `Successfully dispatched all active queues for campaign "${campaign.name}"!`, 'success');
    } catch (sendLoopErr) {
      console.error("General sending loop error", sendLoopErr);
    }
  })();
});

// 5. Real-Time Tracking Pixel Route
app.get("/api/track/open/:recipientId", (req, res) => {
  const recipientId = req.params.recipientId as string;
  const db = loadDB();
  
  let found = false;
  let companyName = "Unknown";
  let campaignName = "Unknown";

  for (let campaign of db.campaigns) {
    const recipient = campaign.recipients.find((r: any) => r.id === recipientId);
    if (recipient) {
      found = true;
      companyName = recipient.company;
      campaignName = campaign.name;
      
      if (!recipient.openedAt) {
        recipient.openedAt = new Date().toISOString();
        campaign.stats.opened = campaign.recipients.filter((r: any) => r.openedAt).length;
        saveDB(db);
        addLog("Email Opened", `${companyName} (${recipient.email}) opened campaign "${campaignName}"!`, 'open');
      }
      break;
    }
  }

  // Set No-Cache headers to force browsers to load tracking pixel every time
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Type", "image/gif");
  
  // Return standard 1x1 transparent GIF buffer
  const pixelBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  res.send(Buffer.from(pixelBase64, "base64"));
});

// 6. Real-Time Simulate Reply Callback Action
app.post("/api/track/reply", (req, res) => {
  const { recipientId, replyText } = req.body;
  if (!recipientId || !replyText) {
    return res.status(400).json({ error: "Missing recipientId or replyText parameters" });
  }

  const db = loadDB();
  let found = false;

  for (let campaign of db.campaigns) {
    const recipient = campaign.recipients.find((r: any) => r.id === recipientId);
    if (recipient) {
      found = true;
      recipient.repliedAt = new Date().toISOString();
      recipient.replyContent = replyText;
      
      // If they replied but hadn't yet been marked as opened, mark as opened as well!
      if (!recipient.openedAt) {
        recipient.openedAt = new Date().toISOString();
      }

      campaign.stats.opened = campaign.recipients.filter((r: any) => r.openedAt).length;
      campaign.stats.replied = campaign.recipients.filter((r: any) => r.repliedAt).length;
      
      saveDB(db);
      addLog("Response Received", `${recipient.company} replied: "${replyText.substring(0, 50)}..."`, 'reply');
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ error: "Recipient not found in database records" });
  }

  res.json({ success: true });
});

// 7. Simulated Sandbox Received Console API
app.get("/api/simulation/sent-mails", (req, res) => {
  const db = loadDB();
  const sentRecipients: any[] = [];
  
  db.campaigns.forEach(campaign => {
    campaign.recipients.forEach((rec: any) => {
      if (rec.status === 'sent') {
        sentRecipients.push({
          ...rec,
          campaignName: campaign.name
        });
      }
    });
  });

  // Sort by open/replied states or creation times
  res.json(sentRecipients);
});

// 8. General Analytics Stats Endpoint
app.get("/api/dashboard/stats", (req, res) => {
  const db = loadDB();
  
  let totalCampaigns = db.campaigns.length;
  let totalSent = 0;
  let totalOpened = 0;
  let totalReplied = 0;

  const industryMap: { [key: string]: { sent: number; opened: number; replied: number } } = {};

  db.campaigns.forEach(campaign => {
    campaign.recipients.forEach((r: any) => {
      if (r.status === 'sent') {
        totalSent++;
        const ind = r.industry || "General";
        if (!industryMap[ind]) {
          industryMap[ind] = { sent: 0, opened: 0, replied: 0 };
        }
        industryMap[ind].sent++;
        
        if (r.openedAt) {
          totalOpened++;
          industryMap[ind].opened++;
        }
        if (r.repliedAt) {
          totalReplied++;
          industryMap[ind].replied++;
        }
      }
    });
  });

  const industryStats = Object.keys(industryMap).map(ind => ({
    industry: ind,
    sent: industryMap[ind].sent,
    opened: industryMap[ind].opened,
    replied: industryMap[ind].replied,
  }));

  const openPercentage = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const replyPercentage = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

  res.json({
    totalCampaigns,
    totalSent,
    totalOpened,
    totalReplied,
    openPercentage,
    replyPercentage,
    industryStats,
    activityLogs: db.activityLogs
  });
});

// Start express server with integrated Vite toolchains
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Campaign Manager] Backend server successfully bound to http://localhost:${PORT}`);
  });
}

startServer();
