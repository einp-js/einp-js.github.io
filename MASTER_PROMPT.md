# Everything in Perspective: Master Content & Workflow Prompt

## Vision

Create a magazine for readers who want to understand trending topics with **FIRST, RIGHT, and COMPLETE** analysis. The publication should:
- Break on trending topics while they're hot (FIRST)
- Provide rigorous, accurate analysis (RIGHT)
- Offer complete context that other outlets miss (COMPLETE)
- Target **mass appeal** but with **depth** (not dumbed down)
- Explain **why and so what**, not just what
- Include historical context, multiple perspectives, systemic analysis

**Not**: Surface-level takes, hot takes, engagement bait, or recycled narratives.

---

## Content Strategy

### Topic Selection
- Source from high-volume keyword data (CSV analysis of search intent)
- Target keywords with 50M+ monthly searches (global relevance)
- Analyze competitive landscape: search volume alone is insufficient
  - Check who ranks on page 1 for the keyword
  - Identify gaps in existing coverage (thin coverage = opportunity)
  - Prioritize topics where quality coverage is missing, not just popular topics
- Consider both English and non-English keywords
  - Vietnamese (xổ số, translate): 222M+ searches
  - French (météo, programs): 211M+ searches
  - German (übersetzer): 42M+ searches
  - Chinese (翻譯, 天氣): 25M+ searches
  - Portuguese, Spanish: also supported
- Audience: Global, with strong consideration for non-Western markets

### Content Organization

**Folder structure:**
- `/content/perspectives/` — Reserve for perspective-type content (currently: ChatGPT in Perspective only)
- `/content/articles/` — Full-length essays and analysis pieces
- `/content/pages/` — Static pages (About, FAQ, Contact, Privacy, Terms, Cookies)

**File naming:** `title-slug.en.md` (English language indicator required)

### Writing Approach

**Depth requirements:**
- Minimum 1,500 words (typical: 1,800-2,300 words)
- Include data, research, statistics with proper context
- Provide historical precedent/analogy where relevant
- Analyze systemic causes, not just surface symptoms
- Include multiple perspectives (not one-sided)
- Explain both benefits AND costs/risks

**Structure:**
- Strong opening that establishes the paradox/tension
- Clear heading hierarchy (h2 → h3, no skipping levels)
- Primary keyword in first 100 words
- Numbered or bulleted data presentation for readability
- "So What" section at end (practical implications for different audiences)
- Internal links to related content where relevant

**Tone:**
- Accessible (no jargon; explain technical terms)
- Rigorous (back claims with data)
- Balanced (acknowledge complexity and uncertainty)
- Analytical (explain why things are the way they are)
- Not preachy (respect reader intelligence)

---

## SEO Optimization (Content Level)

### Frontmatter (Required)
```yaml
---
title: "Full Title: Subtitle Clarifying the Angle"
author: "Staff"
date: "YYYY-MM-DD"
category: "[Economics|Technology|Culture|Environment|Finance|Psychology]"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
description: "160 chars max. Compelling summary of what readers will learn."
keywords: "primary-keyword, secondary-keyword, tertiary-keyword, long-tail-phrase"
image: "/images/article-slug-hero.jpg"
imageAlt: "Descriptive alt text for primary image"
imageCaption: "Caption describing what the image shows and why it matters"
---
```

**Image fields (all required):**
- `image` — Path to primary hero image (used on home page, article widgets, social share)
- `imageAlt` — Accessibility alt text (describes image for screen readers, <125 chars)
- `imageCaption` — Caption explaining image context (appears below image in article)

### SEO Elements
- **Title:** Include primary keyword, under 70 characters if possible
- **Description:** 155-160 characters, includes primary keyword, compelling
- **Keywords:** Primary keyword first, then secondary/long-tail variants
- **Heading hierarchy:** H2 for major sections, H3 for subsections
  - Never skip levels (don't go H2 → H4)
  - All headings should be keyword-relevant where natural
- **First paragraph:** Include primary keyword in first 100 words
- **Internal links:** Link to related articles/pages (use relative URLs: `/article/slug/`)
- **Content structure:** Use lists, tables, data visualizations (markdown)
- **Readability:** Short paragraphs, white space, scannable structure

### GEO Optimization
- Consider global audience impact in examples
- Include geographic-specific data (US, India, China, Europe, Africa, etc.)
- Acknowledge regional differences where relevant
- Use examples from multiple continents
- Be aware that non-English keyword searches indicate demand from those regions

### AIO (Answer Engine Optimization) for LLMs
- Structure content so AI can extract answers clearly
- Use Q&A implicit structure (heading = question, text = answer)
- Bullet points for key facts/data
- Clear sections that answer specific questions
- Avoid narrative bloat; be direct
- Include data in extractable formats (tables, lists)
- Make it easy for AI to cite specific facts

### Image Integration (NEW REQUIREMENT)

**Image sourcing:**
- Use Composio CLI all-images integration (already installed, out-of-the-box)
- Command: `composio search images "[search term]"` to find relevant images
- Or: `composio generate image "[prompt]"` for AI-generated images
- Or: Use existing images from `/images/` folder
- All images stored in `/static/images/` (copied to `/docs/images/` on build)

**Image usage in articles:**

1. **Primary image (frontmatter):** Hero image for home page/widgets
   ```yaml
   image: "/images/article-slug-hero.jpg"
   imageAlt: "Brief description for accessibility"
   imageCaption: "Caption explaining context"
   ```

2. **Inline images (markdown):** Reference images in article body
   ```markdown
   ![Alt text](/images/image-filename.jpg "Optional caption")
   
   [Infographic: Key Insights](/images/article-slug-infographic.png)
   ```

3. **Infographics:** Create visual summaries when data is complex
   - Use Composio to generate or find infographic images
   - Reference as inline image with descriptive caption
   - Helpful for: data visualization, timelines, comparisons, hierarchies

**Image guidelines:**
- Primary image (hero): 1200x630px minimum (16:9 aspect ratio for social share)
- Inline images: 800x600px minimum, maintain aspect ratio
- Format: JPG for photographs, PNG for infographics/diagrams
- Alt text: Descriptive, <125 characters, includes key context
- Captions: Explain what image shows and why it matters for the topic
- File naming: `article-slug-hero.jpg`, `article-slug-infographic.png` (lowercase, hyphens)

**Workflow for images:**
1. Identify where images add value to article
2. Use Composio to find/generate appropriate images
3. Save to `/static/images/` with descriptive filename
4. Reference in frontmatter (primary image)
5. Reference inline with markdown image syntax
6. Include alt text and captions
7. Build will copy images to `/docs/images/` automatically

---

## Workflow (CRITICAL)

**Required sequence:**
1. **Edit** — Write/modify content files in `/content/articles/` (markdown)
2. **Commit** — Stage changes: `git add [files]` → `git commit -m "[message]"`
3. **BUILD FIRST** — Run build: `npm run build` (generates static site to `/docs/`)
4. **Push** — Push everything to remote: `git push origin main`

**Violation of this order breaks the site deployment.**

### Command Reference
- **Never** use custom commands. Always check `package.json` for available scripts.
- **Python:** Use `python` not `python3`
- **Build:** `npm run build` (reads build.js, generates /docs/)
- **Dev server:** `npm run dev` (builds + serves locally on port 8000)

### Git Workflow
- Write files in content folder
- Stage files with `git add`
- Commit with meaningful message (include `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`)
- Build with `npm run build` (BEFORE push)
- Push with `git push origin main`
- Do NOT commit /docs/ folder separately (it's build output; push after build includes it)

---

## Technical Infrastructure

### Build System
- Uses `build.js` (Node.js script)
- Reads content types from `/content/config.json`
- Generates static HTML to `/docs/` folder
- Creates sitemaps (main + 10 replicas)
- Processes markdown → HTML using `marked` library
- Extracts frontmatter using `front-matter` library

### Config (config.json)
- Defines content types: perspectives, articles, pages, (books, etc.)
- Each type has: name, template, urlPath, priority, changefreq, featured flag
- When adding new content type: add entry to config.json BEFORE content

### Templates
- Located in `/templates/` folder
- Article template: `article.html`
- Perspective template: `perspective.html`
- Page template: `page.html`
- Home template: `home.html`
- Templates use `{{placeholder}}` syntax for variable replacement

### Languages
- Supported languages defined in `/content/languages/languages.json`
- Currently: en, fr, de, es, it, pt, nl, zh, ja, ar
- Note: Vietnamese (vi) is missing—should be added
- File naming includes language: `title.en.md`, `title.fr.md`, etc.

---

## Quality Checklist (Before Submitting)

### Content Quality
- [ ] Minimum 1,500 words (substantial depth)
- [ ] Primary keyword appears in first 100 words
- [ ] At least 3 data points/statistics cited
- [ ] Heading hierarchy is correct (H2 → H3, no skipping)
- [ ] "So What" section addresses implications for 3+ audience types
- [ ] Multiple perspectives presented (not one-sided)
- [ ] Historical context or analogy included
- [ ] Systemic analysis (why things are the way they are)
- [ ] Primary hero image identified (1200x630px, 16:9 ratio)
- [ ] Image alt text written (descriptive, <125 chars)
- [ ] Image caption written (explains context and relevance)
- [ ] Inline images/infographics added where they enhance understanding
- [ ] All images sourced via Composio or existing `/images/` folder

### SEO/GEO/AIO Quality
- [ ] Frontmatter complete and accurate
- [ ] Description under 160 characters
- [ ] Keywords relevant to content and high-volume
- [ ] Internal links included (3+ to related articles/pages)
- [ ] Geographic diversity in examples
- [ ] Content scannable (lists, tables, short paragraphs)
- [ ] Key facts extractable by LLMs

### Technical Quality
- [ ] File named correctly: `slug-title.en.md`
- [ ] Located in correct folder: `/content/articles/`
- [ ] No syntax errors in frontmatter (YAML)
- [ ] Markdown is valid (no broken formatting)
- [ ] Links use correct format (relative URLs starting with `/`)

---

## Workflow Checklist (Before Each Push)

1. [ ] Content written in `/content/articles/` with frontmatter
2. [ ] `git status` shows new/modified files
3. [ ] `git add` stages content files
4. [ ] `git commit -m "..."` with meaningful message
5. [ ] `npm run build` completes successfully (shows checkmarks, no errors)
6. [ ] `/docs/` folder is updated (check modification time)
7. [ ] `git status` shows clean working tree
8. [ ] `git push origin main` succeeds
9. [ ] GitHub repo shows latest commit
10. [ ] Sitemap updated and accessible

---

## Known Constraints & Requirements

### Writing Constraints
- Write full essays (1,500-2,300+ words), not summaries
- Target mass appeal but maintain analytical depth
- Data-driven (cite research, not opinion)
- No speculation without evidence
- Acknowledge limitations and uncertainty
- Multi-perspective (show opposing views)

### Technical Constraints
- Use `python` not `python3` for any Python commands
- Never use custom build commands; always check `package.json`
- Always `npm run build` BEFORE `git push`
- File format: Markdown (.md), not HTML or other formats
- Language must be specified in filename (.en.md for English)

### Content Constraints
- All articles to `/content/articles/`
- All perspectives (rare) to `/content/perspectives/`
- All static pages to `/content/pages/`
- No content to other folders without prior discussion
- Topic selection based on keyword data + competitive analysis
- Don't optimize for pure SEO tricks; write for readers first

---

## Publishing Metrics (As of May 6, 2026)

**Current state:**
- 1 perspective (ChatGPT in Perspective)
- 12 articles (see list below)
- 6 pages (About, FAQ, Contact, Privacy, Terms, Cookies)
- 20 URLs in sitemap

**Articles published:**
1. Satta King: Economic Desperation
2. Gold: Inflation Hedge
3. Restaurant Culture: Post-Pandemic
4. Translation: Globalization
5. Cricket: Global Obsession
6. E-Commerce: Amazon/Flipkart Dominance
7. Weather: Climate Data Literacy
8. Streaming: Entertainment Wars
9. Instagram: Mental Health
10. Gemini: AI Competition Landscape
11. Google Maps: Privacy & Urban Planning
12. (1 artifact from build)

---

## Future Enhancements (Not Yet Implemented)

- [ ] Add Vietnamese (vi) to languages.json
- [ ] Create translations of key articles for multiple languages
- [ ] Competitive analysis on each keyword (who ranks, what's the gap)
- [ ] Author profiles and bios
- [ ] Comment system or reader interaction
- [ ] Newsletter integration
- [ ] RSS feed generation
- [ ] Search functionality on site
- [ ] Related articles recommendations
- [ ] Reading time estimates
- [ ] Social share buttons
- [ ] Email subscription integration

---

## Red Flags / Things to Avoid

- ❌ Publishing thin content (<1,200 words) without strategic reason
- ❌ Writing without data/research citations
- ❌ Following SEO best practices over reader quality
- ❌ One-sided takes without acknowledging opposing views
- ❌ Pushing build output before building (edit → commit → push → build order is WRONG)
- ❌ Using `python3` instead of `python`
- ❌ Creating custom build commands instead of checking package.json
- ❌ Committing content without building first
- ❌ Skipping heading hierarchy levels (H2 → H4)
- ❌ Including primary keyword too late in article (should be in first 100 words)
- ❌ Writing for search engines instead of readers
- ❌ Ignoring competitive landscape (assuming high search volume = opportunity)
- ❌ Forgetting "So What" section (implications for readers)
- ❌ Using jargon without explanation
- ❌ Publishing without complete frontmatter

---

## Questions for Future AI

Before starting work, always verify:
1. What's the current article count? (Check `/docs/` or run build)
2. What topics have competitive analysis been done for? (Look for research notes)
3. What's the latest commit? (Run `git log --oneline -5`)
4. Are there uncommitted changes? (Run `git status`)
5. Does the build succeed? (Run `npm run build`)
6. Is the workflow properly understood? (edit > commit > build > push)

---

## Communication Style Notes

- User prefers terse responses with no unnecessary summaries
- User wants direct answers, not explanations of what was done
- User wants verification and accountability (will ask "did you do X?")
- User values efficiency and wants to move fast
- User cares about technical correctness over feelings
- User wants requirements consolidated, not scattered
- User will correct you if you deviate; listen and adjust

---

**Last Updated:** May 6, 2026  
**By:** Claude Haiku 4.5  
**Status:** Complete and ready for next AI agent
