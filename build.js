const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const BASE_URL = process.env.BASE_URL || 'https://everythinginperspective.github.io';

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'config.json'), 'utf-8'));

// Load templates dynamically
const templates = {};
config.contentTypes.forEach(ct => {
  const templatePath = path.join(TEMPLATES_DIR, ct.template);
  if (fs.existsSync(templatePath)) {
    templates[ct.name] = fs.readFileSync(templatePath, 'utf-8');
  } else {
    console.warn(`⚠️  Missing template: ${templatePath}`);
  }
});
const homeTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');

// Load languages
const languages = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'languages', 'languages.json'), 'utf-8'));
const languageCodes = languages.map(l => l.code);

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
  // Copy Google verification file if exists
  const googleFiles = fs.readdirSync('./static').filter(f => f.startsWith('google') && f.endsWith('.html'));
  googleFiles.forEach(file => {
    fs.copyFileSync(path.join('./static', file), path.join(DOCS_DIR, file));
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

// Helper to fill template with item data
function fillTemplate(template, item) {
  return template
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
    .replace(/{{hreflang}}/g, '')
    .replace(/{{articletags}}/g, '');
}

// Main build
function build() {
  console.log('🔨 Building site...');
  
  copyAssets();
  copyThemesAndFiles();
  
  const allContent = {};
  
  // Build all content types from config
  config.contentTypes.forEach(ct => {
    const items = parseContent(ct.name);
    allContent[ct.name] = items;
    
    if (items.length > 0 && templates[ct.name]) {
      // Filter by language if specified in config
      const itemsToBuild = ct.filterLanguage 
        ? items.filter(i => i.language === ct.filterLanguage)
        : items;
      
      itemsToBuild.forEach(item => {
        const filledTemplate = fillTemplate(templates[ct.name], item);
        const contentPath = path.join(DOCS_DIR, ct.urlPath, item.slug);
        fs.mkdirSync(contentPath, { recursive: true });
        fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
      });
      
      console.log(`✅ Built ${itemsToBuild.length} ${ct.name}`);
    }
  });

  // Generate home with featured content
  const perspectives = allContent.perspectives || [];
  const featuredHTML = perspectives.slice(0, 3).map(p => `
    <article class="mb-12 pb-12 border-b border-accent">
      <h3 class="font-serif text-2xl font-bold mb-2">${p.title}</h3>
      <p class="text-muted text-sm mb-4">${p.date?.toLocaleDateString() || ''} • ${p.category || 'General'}</p>
      <p class="text-body mb-4">${p.description || ''}</p>
      <a href="/perspective/${p.slug}/" class="text-primary font-sans font-bold hover:underline">Read More →</a>
    </article>
  `).join('');
  const homeHtml = homeTemplate.replace('{{featured}}', featuredHTML);
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), homeHtml);

  // Generate sitemaps
  generateSitemaps(allContent);

  console.log('✨ Build complete! Serve from ./docs/');
}

build();
