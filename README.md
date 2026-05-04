# Everything in Perspective

A magazine exploring trends and topics through historical context, multiple perspectives, and systemic analysis.

## Setup

```bash
# Install dependencies
npm install

# Build static site
npm run build

# Serve locally
npm run dev
# Or start the server after build:
npm run start
```

Visit `http://localhost:8000`

## Adding Articles

1. Create a `.md` file in `content/articles/` with front matter:

```markdown
---
title: "Article Title"
author: "Author Name"
date: "2026-05-04"
category: "Economics"
tags: ["inflation", "gold"]
description: "Short description for homepage"
---

# Article content in markdown

Your article content here...
```

2. Run `npm run build` to generate static HTML
3. Deploy `docs/` folder to GitHub Pages

## Structure

- `content/articles/` - Article markdown files
- `templates/` - HTML templates
- `js/` - Client-side JavaScript
- `docs/` - Generated static site (deployed)

## Design

- Tailwind CSS (CDN)
- Monocle-inspired aesthetic
- Serif typography (Georgia/Garamond)
- Minimal color palette

## SEO

- Automatic sitemap generation
- Open Graph meta tags
- Article schema markup
- Mobile responsive
- Fast static delivery
