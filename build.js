const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const BASE_URL = process.env.BASE_URL || 'https://everythinginperspective.github.io';

// ============================================================================
// NEW: Content Registry - Auto-discover content types from folder structure
// ============================================================================
const CONTENT_REGISTRY = [
  { folder: 'articles', singular: 'article', plural: 'articles', template: 'article.html' },
  { folder: 'perspectives', singular: 'perspective', plural: 'perspectives', template: 'perspective.html' },
  { folder: 'books', singular: 'book', plural: 'books', template: 'book.html' },
  { folder: 'pages', singular: 'page', plural: 'pages', template: 'page.html' },
  { folder: 'people', singular: 'person', plural: 'people', template: 'person.html' },
  { folder: 'languages', singular: 'language', plural: 'languages', template: 'language.html' },
];

// Load templates dynamically from registry
const templates = {};
CONTENT_REGISTRY.forEach(ct => {
  const templatePath = path.join(TEMPLATES_DIR, ct.template);
  if (fs.existsSync(templatePath)) {
    templates[ct.folder] = fs.readFileSync(templatePath, 'utf-8');
  } else {
    console.warn(`⚠️  Missing template: ${templatePath}`);
  }
});
const homeTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');

// Load languages
const languages = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'languages', 'languages.json'), 'utf-8'));
const languageCodes = languages.map(l => l.code);

// LEGACY: Keep old config for backward compatibility (deprecated)
const config = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'config.json'), 'utf-8'));

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Create necessary subdirectories
['css', 'js', 'images'].forEach(dir => {
  if (!fs.existsSync(path.join(DOCS_DIR, dir))) {
    fs.mkdirSync(path.join(DOCS_DIR, dir), { recursive: true });
  }
});

// Copy static assets
function copyAssets() {
  if (fs.existsSync('./static')) {
    const copy = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(file => {
          copy(path.join(src, file), path.join(dest, file));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    copy('./static', DOCS_DIR);
  }
}

// Copy theme CSS + verification files
function copyThemesAndFiles() {
  if (fs.existsSync('./themes')) {
    if (!fs.existsSync(path.join(DOCS_DIR, 'css'))) {
      fs.mkdirSync(path.join(DOCS_DIR, 'css'), { recursive: true });
    }
    const themeFile = path.join('./themes', 'default.css');
    if (fs.existsSync(themeFile)) {
      fs.copyFileSync(themeFile, path.join(DOCS_DIR, 'css', 'theme.css'));
    }
  }
  // Copy verification & config files (persist across builds)
  const persistFiles = ['ads.txt'];
  const googleFiles = fs.readdirSync('./static').filter(f => f.startsWith('google') && f.endsWith('.html'));
  
  // Copy google verification files
  googleFiles.forEach(file => {
    fs.copyFileSync(path.join('./static', file), path.join(DOCS_DIR, file));
  });
  
  // Copy ads.txt and other persistent files
  persistFiles.forEach(file => {
    if (fs.existsSync(path.join('./static', file))) {
      fs.copyFileSync(path.join('./static', file), path.join(DOCS_DIR, file));
    }
  });
}

// Parse content by type and language
function parseContent(contentType) {
  const contentDir = path.join(CONTENT_DIR, contentType);
  const items = [];

  if (!fs.existsSync(contentDir)) return items;

  fs.readdirSync(contentDir).forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(contentDir, file), 'utf-8');
      const { attributes, body } = fm(content);
      
      // Extract language from filename (e.g., title.en.md -> en)
      const match = file.match(/\.(\w+)\.md$/);
      const language = match ? match[1] : 'en';
      
      const slug = file.replace(/\.(\w+)\.md$/, '');
      const html = marked(body);

      items.push({
        slug,
        language,
        contentType,
        ...attributes,
        content: html,
        date: attributes.date ? new Date(attributes.date) : new Date(),
      });
    }
  });

  return items.sort((a, b) => (b.date || new Date()) - (a.date || new Date()));
}

// Generate pages for content
function generateContent(items, template) {
  items.forEach(item => {
    if (item.language === 'en' && item.contentType === 'perspectives') return; // Skip perspectives (use perspective.html)
    
    const filledTemplate = template
      .replace(/{{title}}/g, item.title || 'Untitled')
      .replace(/{{description}}/g, item.description || '')
      .replace(/{{slug}}/g, item.slug)
      .replace(/{{language}}/g, item.language)
      .replace(/{{content}}/g, item.content)
      .replace(/{{author}}/g, item.author || 'Staff')
      .replace(/{{publishedDate}}/g, item.date?.toISOString().split('T')[0] || '')
      .replace(/{{publishedDateFormatted}}/g, item.date?.toLocaleDateString() || '')
      .replace(/{{category}}/g, item.category || '')
      .replace(/{{keywords}}/g, item.keywords || '')
      .replace(/{{image}}/g, item.image || '')
      .replace(/{{imageAlt}}/g, item.imageAlt || item.title || '')
      .replace(/{{imageCaption}}/g, item.imageCaption || '')
      .replace(/{{authorBio}}/g, item.authorBio || '')
      .replace(/{{hreflang}}/g, '') // Placeholder for multi-lang support
      .replace(/{{articletags}}/g, '');
    
    const contentPath = path.join(DOCS_DIR, item.contentType, item.slug);
    fs.mkdirSync(contentPath, { recursive: true });
    fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
  });
}

// Generate sitemap with all content (dynamic)
function generateSitemaps(allContent) {
  let urls = [];

  // Add homepage
  urls.push({
    loc: `${BASE_URL}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0',
  });

  // Add all content types
  config.contentTypes.forEach(ct => {
    if (allContent[ct.name]) {
      allContent[ct.name].forEach(item => {
        urls.push({
          loc: `${BASE_URL}/${ct.urlPath}/${item.slug}/`,
          lastmod: item.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: ct.changefreq,
          priority: ct.priority.toString(),
        });
      });
    }
  });

  // Generate XML
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write main sitemap + 10 replicas
  fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemapXml);
  for (let i = 1; i <= 10; i++) {
    fs.writeFileSync(path.join(DOCS_DIR, `sitemap_alt${i}.xml`), sitemapXml);
  }

  console.log(`📍 Generated sitemap.xml + 10 replicas (${urls.length} URLs)`);
}

// ============================================================================
// NEW: Advanced template filling with canonical URL and metadata injection
// ============================================================================
function fillTemplate(template, item, canonicalUrl) {
  let html = template
    .replace(/{{title}}/g, item.title || 'Untitled')
    .replace(/{{description}}/g, item.description || '')
    .replace(/{{slug}}/g, item.slug)
    .replace(/{{language}}/g, item.language)
    .replace(/{{content}}/g, item.content || '')
    .replace(/{{author}}/g, item.author || 'Staff')
    .replace(/{{publishedDate}}/g, item.date?.toISOString().split('T')[0] || '')
    .replace(/{{publishedDateFormatted}}/g, item.date?.toLocaleDateString() || '')
    .replace(/{{category}}/g, item.category || '')
    .replace(/{{keywords}}/g, item.keywords || '')
    .replace(/{{image}}/g, item.image || '')
    .replace(/{{imageAlt}}/g, item.imageAlt || item.title || '')
    .replace(/{{imageCaption}}/g, item.imageCaption || '')
    .replace(/{{authorBio}}/g, item.authorBio || '')
    .replace(/{{hreflang}}/g, '')
    .replace(/{{articletags}}/g, '');
  
  // Inject canonical link if provided
  if (canonicalUrl) {
    html = html.replace(
      /<link rel="canonical"/g,
      `<link rel="canonical" href="${canonicalUrl}"`
    );
  }
  
  return html;
}

// ============================================================================
// NEW: Generate redirect/alias HTML pages
// ============================================================================
function generateRedirectPage(fromPath, toUrl) {
  const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${toUrl}">
  <link rel="canonical" href="${toUrl}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="${toUrl}">${toUrl}</a></p>
</body>
</html>`;
  
  fs.mkdirSync(fromPath, { recursive: true });
  fs.writeFileSync(path.join(fromPath, 'index.html'), redirectHtml);
}

// ============================================================================
// NEW: Generate robots.txt
// ============================================================================
function generateRobotsTxt() {
  const robotsTxt = `# Everything in Perspective robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/

# Sitemap
Sitemap: ${BASE_URL}/sitemap.xml

# AI crawlers - allow for AI optimization
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Perplexity
Allow: /
`;
  fs.writeFileSync(path.join(DOCS_DIR, 'robots.txt'), robotsTxt);
  console.log('🤖 Generated robots.txt');
}

// ============================================================================
// NEW: Generate llms.txt and llms-full.txt for AI discoverability
// ============================================================================
function generateLlmsTxt(allContent) {
  // Build llms.txt (discovery file)
  const llmsTxt = `# Everything in Perspective - AI LLM Discovery

> A magazine exploring trends and global topics with depth, nuance, and historical context.

Canonical Origin: ${BASE_URL}

## LLM Resources

- [Full Content](${BASE_URL}/llms-full.txt)
  Complete page content in markdown format.
- [Sitemap](${BASE_URL}/sitemap.xml)
  XML sitemap for search engines and crawlers.
- [Robots.txt](${BASE_URL}/robots.txt)
  Crawler rules and permissions.

## Content Collections

- [Articles](${BASE_URL}/magazine/articles/)
  Essays exploring trends and topics
- [Perspectives](${BASE_URL}/magazine/perspectives/)
  In-depth perspectives on global issues
- [Books](${BASE_URL}/magazine/books/)
  Recommended reading and book reviews
- [Pages](${BASE_URL}/magazine/pages/)
  Static content pages
`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'llms.txt'), llmsTxt);
  
  // Build llms-full.txt (full content)
  let fullContent = `# Everything in Perspective - Full Content

Canonical Origin: ${BASE_URL}

## Articles

`;
  
  const articles = allContent.articles || [];
  articles.forEach(a => {
    fullContent += `### ${a.title}

Source: ${BASE_URL}/magazine/articles/${a.slug}/
Author: ${a.author || 'Staff'}
Published: ${a.date?.toLocaleDateString() || 'Unknown'}

${a.description || ''}

`;
  });
  
  fullContent += `## Perspectives

`;
  const perspectives = allContent.perspectives || [];
  perspectives.forEach(p => {
    fullContent += `### ${p.title}

Source: ${BASE_URL}/magazine/perspectives/${p.slug}/
Author: ${p.author || 'Staff'}
Published: ${p.date?.toLocaleDateString() || 'Unknown'}

${p.description || ''}

`;
  });
  
  fs.writeFileSync(path.join(DOCS_DIR, 'llms-full.txt'), fullContent);
  console.log('🤖 Generated llms.txt and llms-full.txt');
}

// ============================================================================
// NEW: Generate route-level markdown exports for AI consumption
// ============================================================================
function generateMarkdownExports(allContent) {
  // Create markdown export directory
  const mdDir = path.join(DOCS_DIR, '.md');
  if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
  
  // Export each content item as markdown
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    items.forEach(item => {
      const markdown = `# ${item.title}

**Author:** ${item.author || 'Staff'}
**Published:** ${item.date?.toLocaleDateString() || 'Unknown'}
**Type:** ${ct.folder}

## Description

${item.description || ''}

## Content

${item.content || ''}
`;
      
      const mdPath = path.join(mdDir, `${ct.folder}-${item.slug}.md`);
      fs.writeFileSync(mdPath, markdown);
    });
  });
  
  console.log('📝 Generated markdown exports for AI consumption');
}

// ============================================================================
// NEW: Enhanced sitemap generation with magazine & linked-data routes
// ============================================================================
function generateEnhancedSitemaps(allContent) {
  let urls = [];
  const today = new Date().toISOString().split('T')[0];

  // Homepage
  urls.push({ loc: `${BASE_URL}/`, lastmod: today, changefreq: 'daily', priority: '1.0' });

  // Magazine and linked-data item routes + collections
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    
    if (items.length > 0) {
      // Magazine item routes
      items.forEach(item => {
        urls.push({
          loc: `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`,
          lastmod: item.date?.toISOString().split('T')[0] || today,
          changefreq: 'monthly',
          priority: '0.8'
        });
      });
      
      // Linked-data item routes
      items.forEach(item => {
        urls.push({
          loc: `${BASE_URL}/linked-data/${ct.plural}/${item.slug}/`,
          lastmod: item.date?.toISOString().split('T')[0] || today,
          changefreq: 'monthly',
          priority: '0.7'
        });
      });
      
      // Magazine collection
      urls.push({
        loc: `${BASE_URL}/magazine/${ct.plural}/`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.9'
      });
      
      // Linked-data collection
      urls.push({
        loc: `${BASE_URL}/linked-data/${ct.plural}/`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.9'
      });
    }
  });
  
  // Generate XML sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemapXml);
  // Also write replicas for compatibility
  for (let i = 1; i <= 10; i++) {
    fs.writeFileSync(path.join(DOCS_DIR, `sitemap_alt${i}.xml`), sitemapXml);
  }

  console.log(`📍 Generated sitemap with ${urls.length} URLs`);
}

// ============================================================================
// MAIN BUILD FUNCTION - NEW ROUTE ARCHITECTURE
// ============================================================================
function build() {
  console.log('🔨 Building site with new architecture...');
  const buildStart = Date.now();
  
  copyAssets();
  copyThemesAndFiles();
  
  const allContent = {};
  let totalItemsBuilt = 0;
  
  // ========== STEP 1: Parse all content from folders ==========
  CONTENT_REGISTRY.forEach(ct => {
    const items = parseContent(ct.folder);
    allContent[ct.folder] = items;
  });
  
  // ========== STEP 2: Generate magazine view routes ==========
  console.log('\n📰 Generating magazine view routes...');
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    if (items.length > 0 && templates[ct.folder]) {
      items.forEach(item => {
        const canonicalUrl = `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`;
        const filledTemplate = fillTemplate(templates[ct.folder], item, canonicalUrl);
        const contentPath = path.join(DOCS_DIR, 'magazine', ct.plural, item.slug);
        fs.mkdirSync(contentPath, { recursive: true });
        fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
        totalItemsBuilt++;
      });
      console.log(`  ✅ ${items.length} ${ct.folder} → /magazine/${ct.plural}/`);
    }
  });
  
  // ========== STEP 3: Generate linked-data view routes ==========
  console.log('\n🔗 Generating linked-data view routes...');
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    if (items.length > 0 && templates[ct.folder]) {
      items.forEach(item => {
        const canonicalUrl = `${BASE_URL}/linked-data/${ct.plural}/${item.slug}/`;
        const filledTemplate = fillTemplate(templates[ct.folder], item, canonicalUrl);
        const contentPath = path.join(DOCS_DIR, 'linked-data', ct.plural, item.slug);
        fs.mkdirSync(contentPath, { recursive: true });
        fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
        totalItemsBuilt++;
      });
      console.log(`  ✅ ${items.length} ${ct.folder} → /linked-data/${ct.plural}/`);
    }
  });
  
  // ========== STEP 4: Generate collection index pages ==========
  console.log('\n📑 Generating collection index pages...');
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    if (items.length > 0) {
      // Magazine collection
      const magCollectionHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${ct.plural} | Everything in Perspective</title></head>
<body><h1>${ct.plural}</h1>
<ul>
${items.map(i => `<li><a href="/magazine/${ct.plural}/${i.slug}/">${i.title}</a></li>`).join('\n')}
</ul></body></html>
`;
      const magPath = path.join(DOCS_DIR, 'magazine', ct.plural);
      fs.mkdirSync(magPath, { recursive: true });
      fs.writeFileSync(path.join(magPath, 'index.html'), magCollectionHtml);
      
      // Linked-data collection
      const ldCollectionHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${ct.plural} (Linked Data) | Everything in Perspective</title></head>
<body><h1>${ct.plural} - Linked Data View</h1>
<ul>
${items.map(i => `<li><a href="/linked-data/${ct.plural}/${i.slug}/">${i.title}</a></li>`).join('\n')}
</ul></body></html>
`;
      const ldPath = path.join(DOCS_DIR, 'linked-data', ct.plural);
      fs.mkdirSync(ldPath, { recursive: true });
      fs.writeFileSync(path.join(ldPath, 'index.html'), ldCollectionHtml);
    }
  });
  
  // ========== STEP 5: Generate alias and redirect pages ==========
  console.log('\n🔀 Generating alias and redirect pages...');
  let aliasCount = 0;
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    items.forEach(item => {
      // /magazine/{singular}/{slug} → /magazine/{plural}/{slug}
      const sing1 = path.join(DOCS_DIR, 'magazine', ct.singular, item.slug);
      generateRedirectPage(sing1, `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`);
      
      // /{singular}/{slug} → /magazine/{plural}/{slug}
      const sing2 = path.join(DOCS_DIR, ct.singular, item.slug);
      generateRedirectPage(sing2, `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`);
      
      // /{plural}/{slug} → /magazine/{plural}/{slug}
      const plur1 = path.join(DOCS_DIR, ct.plural, item.slug);
      generateRedirectPage(plur1, `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`);
      
      // /mag/{singular}/{slug} → /magazine/{plural}/{slug}
      const mag1 = path.join(DOCS_DIR, 'mag', ct.singular, item.slug);
      generateRedirectPage(mag1, `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`);
      
      // /mag/{plural}/{slug} → /magazine/{plural}/{slug}
      const mag2 = path.join(DOCS_DIR, 'mag', ct.plural, item.slug);
      generateRedirectPage(mag2, `${BASE_URL}/magazine/${ct.plural}/${item.slug}/`);
      
      // /ld/{singular}/{slug} → /linked-data/{plural}/{slug}
      const ld1 = path.join(DOCS_DIR, 'ld', ct.singular, item.slug);
      generateRedirectPage(ld1, `${BASE_URL}/linked-data/${ct.plural}/${item.slug}/`);
      
      // /ld/{plural}/{slug} → /linked-data/{plural}/{slug}
      const ld2 = path.join(DOCS_DIR, 'ld', ct.plural, item.slug);
      generateRedirectPage(ld2, `${BASE_URL}/linked-data/${ct.plural}/${item.slug}/`);
      
      aliasCount += 7;
    });
  });
  
  // Collection aliases
  CONTENT_REGISTRY.forEach(ct => {
    // /magazine/{singular} → /magazine/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, 'magazine', ct.singular),
      `${BASE_URL}/magazine/${ct.plural}/`
    );
    
    // /{singular} → /magazine/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, ct.singular),
      `${BASE_URL}/magazine/${ct.plural}/`
    );
    
    // /{plural} → /magazine/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, ct.plural),
      `${BASE_URL}/magazine/${ct.plural}/`
    );
    
    // /mag/{singular} → /magazine/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, 'mag', ct.singular),
      `${BASE_URL}/magazine/${ct.plural}/`
    );
    
    // /mag/{plural} → /magazine/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, 'mag', ct.plural),
      `${BASE_URL}/magazine/${ct.plural}/`
    );
    
    // /ld/{singular} → /linked-data/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, 'ld', ct.singular),
      `${BASE_URL}/linked-data/${ct.plural}/`
    );
    
    // /ld/{plural} → /linked-data/{plural}
    generateRedirectPage(
      path.join(DOCS_DIR, 'ld', ct.plural),
      `${BASE_URL}/linked-data/${ct.plural}/`
    );
    
    aliasCount += 7;
  });
  
  console.log(`  ✅ Generated ${aliasCount} alias/redirect pages`);
  
  // ========== STEP 6: Generate home page with featured content ==========
  console.log('\n🏠 Generating home page...');
  const perspectives = allContent.perspectives || [];
  const featuredHTML = perspectives.slice(0, 3).map(p => `
    <article class="mb-12 pb-12 border-b border-accent">
      <h3 class="font-serif text-2xl font-bold mb-2">${p.title}</h3>
      <p class="text-muted text-sm mb-4">${p.date?.toLocaleDateString() || ''} • ${p.category || 'General'}</p>
      <p class="text-body mb-4">${p.description || ''}</p>
      <a href="/magazine/perspectives/${p.slug}/" class="text-primary font-sans font-bold hover:underline">Read More →</a>
    </article>
  `).join('');
  const homeHtml = homeTemplate.replace('{{featured}}', featuredHTML);
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), homeHtml);
  console.log('  ✅ Home page generated');
  
  // ========== STEP 7: Generate SEO/AIO assets ==========
  console.log('\n🔍 Generating SEO and AI optimization assets...');
  generateEnhancedSitemaps(allContent);
  generateRobotsTxt();
  generateLlmsTxt(allContent);
  generateMarkdownExports(allContent);
  
  const buildEnd = Date.now();
  const buildTime = ((buildEnd - buildStart) / 1000).toFixed(2);
  
  // Count HTML files
  const countHtmlFiles = (dir) => {
    let count = 0;
    const walk = (d) => {
      fs.readdirSync(d).forEach(file => {
        const filePath = path.join(d, file);
        if (fs.statSync(filePath).isDirectory()) {
          walk(filePath);
        } else if (file === 'index.html') {
          count++;
        }
      });
    };
    walk(dir);
    return count;
  };
  const htmlCount = countHtmlFiles(DOCS_DIR);
  
  console.log(`\n✨ Build complete in ${buildTime}s`);
  console.log(`📊 Generated ${htmlCount} unique HTML files`);
  console.log(`📁 Output directory: ${DOCS_DIR}`);
}

build();
