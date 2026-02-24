import { storage } from "./storage";

interface ScrapedLead {
  name: string;
  website?: string;
  description?: string;
}

export async function scrapeLeads(query: string, workspaceId?: number): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = await response.text();

    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const titles: string[] = [];
    const urls: string[] = [];
    const snippets: string[] = [];

    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      if (title && url) {
        titles.push(title);
        let cleanUrl = url;
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          cleanUrl = decodeURIComponent(uddgMatch[1]);
        }
        urls.push(cleanUrl);
      }
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    for (let i = 0; i < Math.min(titles.length, 15); i++) {
      const title = titles[i];
      const url = urls[i] || "";
      const snippet = snippets[i] || "";

      if (url.includes("duckduckgo.com") || url.includes("google.com") || url.includes("wikipedia.org")) continue;
      if (!title) continue;

      leads.push({
        name: title.slice(0, 100),
        website: url,
        description: snippet.slice(0, 300),
      });
    }

    await storage.createLog({
      action: "[ZENO] Lead Scouting Complete",
      details: `Found ${leads.length} leads for "${query}"`,
      source: "scraper",
      workspaceId,
    });
  } catch (error: any) {
    console.error("Lead scraping error:", error);
    await storage.createLog({
      action: "[ZENO] Scraping Failed",
      details: error.message,
      source: "scraper",
      workspaceId,
    });
  }

  return leads;
}

export async function scrapeAndSaveLeads(query: string, workspaceId?: number): Promise<number> {
  const scraped = await scrapeLeads(query, workspaceId);
  let saved = 0;

  for (const lead of scraped) {
    try {
      await storage.createBusinessLead({
        name: lead.name,
        website: lead.website,
        notes: lead.description,
        source: "scraper",
        status: "new",
        score: 0,
        workspaceId,
      });
      saved++;
    } catch (err) {
      // skip duplicates
    }
  }

  return saved;
}
