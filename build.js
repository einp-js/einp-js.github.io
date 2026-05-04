const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const BASE_URL = process.env.BASE_URL || 'https://everythinginperspective.github.io'; // Set via npm run build -- --baseUrl=xxx

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

// Load templates
const perspectiveTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'perspective.html'), 'utf-8');
const bookTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'book.html'), 'utf-8');
const pageTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'page.html'), 'utf-8');
const homeTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');

// Load languages
const languages = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'languages', 'languages.json'), 'utf-8'));
const languageCodes = languages.map(l => l.code);

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

// Generate sitemap with all content
function generateSitemaps(perspectives, books, pages) {
  let urls = [];

  // Add homepage
  urls.push({
    loc: `${BASE_URL}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0',
  });

  // Add perspectives
  perspectives.forEach(p => {
    urls.push({
      loc: `${BASE_URL}/perspective/${p.slug}/`,
      lastmod: p.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.8',
    });
  });

  // Add books
  books.forEach(b => {
    urls.push({
      loc: `${BASE_URL}/book/${b.slug}/`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'yearly',
      priority: '0.7',
    });
  });

  // Add pages
  pages.forEach(p => {
    urls.push({
      loc: `${BASE_URL}/page/${p.slug}/`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6',
    });
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

// Main build
function build() {
  console.log('🔨 Building site...');
  
  copyAssets();
  copyThemesAndFiles();
  
  const perspectives = parseContent('perspectives');
  const books = parseContent('books');
  const pages = parseContent('pages');

  // Generate content pages
  if (perspectives.length > 0) {
    // Only generate English perspectives with perspective template
    const perspectivesToBuild = perspectives.filter(p => p.language === 'en');
    perspectivesToBuild.forEach(p => {
      const filledTemplate = perspectiveTemplate
        .replace(/{{title}}/g, p.title || 'Untitled')
        .replace(/{{description}}/g, p.description || '')
        .replace(/{{slug}}/g, p.slug)
        .replace(/{{language}}/g, p.language)
        .replace(/{{content}}/g, p.content)
        .replace(/{{author}}/g, p.author || 'Staff')
        .replace(/{{publishedDate}}/g, p.date?.toISOString().split('T')[0] || '')
        .replace(/{{publishedDateFormatted}}/g, p.date?.toLocaleDateString() || '')
        .replace(/{{category}}/g, p.category || '')
        .replace(/{{keywords}}/g, p.keywords || '')
        .replace(/{{image}}/g, p.image || '')
        .replace(/{{imageAlt}}/g, p.imageAlt || p.title || '')
        .replace(/{{imageCaption}}/g, p.imageCaption || '')
        .replace(/{{authorBio}}/g, p.authorBio || '')
        .replace(/{{hreflang}}/g, '')
        .replace(/{{articletags}}/g, '');
      
      const contentPath = path.join(DOCS_DIR, 'perspective', p.slug);
      fs.mkdirSync(contentPath, { recursive: true });
      fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
    });
    console.log(`✅ Built ${perspectivesToBuild.length} perspectives`);
  }
  
  if (books.length > 0) {
    // Generate all books
    books.forEach(b => {
      const filledTemplate = bookTemplate
        .replace(/{{title}}/g, b.title || 'Untitled')
        .replace(/{{description}}/g, b.description || '')
        .replace(/{{slug}}/g, b.slug)
        .replace(/{{language}}/g, b.language)
        .replace(/{{content}}/g, b.content)
        .replace(/{{author}}/g, b.author || 'Staff')
        .replace(/{{publishedDate}}/g, b.date?.toISOString().split('T')[0] || '')
        .replace(/{{publishedDateFormatted}}/g, b.date?.toLocaleDateString() || '')
        .replace(/{{category}}/g, b.category || '')
        .replace(/{{keywords}}/g, b.keywords || '')
        .replace(/{{image}}/g, b.image || '')
        .replace(/{{imageAlt}}/g, b.imageAlt || b.title || '')
        .replace(/{{imageCaption}}/g, b.imageCaption || '')
        .replace(/{{authorBio}}/g, b.authorBio || '')
        .replace(/{{hreflang}}/g, '')
        .replace(/{{articletags}}/g, '');
      
      const contentPath = path.join(DOCS_DIR, 'book', b.slug);
      fs.mkdirSync(contentPath, { recursive: true });
      fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
    });
    console.log(`✅ Built ${books.length} books`);
  }
  
  if (pages.length > 0) {
    // Generate all pages
    pages.forEach(pg => {
      const filledTemplate = pageTemplate
        .replace(/{{title}}/g, pg.title || 'Untitled')
        .replace(/{{description}}/g, pg.description || '')
        .replace(/{{slug}}/g, pg.slug)
        .replace(/{{language}}/g, pg.language)
        .replace(/{{content}}/g, pg.content)
        .replace(/{{author}}/g, pg.author || 'Staff')
        .replace(/{{publishedDate}}/g, pg.date?.toISOString().split('T')[0] || '')
        .replace(/{{publishedDateFormatted}}/g, pg.date?.toLocaleDateString() || '')
        .replace(/{{category}}/g, pg.category || '')
        .replace(/{{keywords}}/g, pg.keywords || '')
        .replace(/{{image}}/g, pg.image || '')
        .replace(/{{imageAlt}}/g, pg.imageAlt || pg.title || '')
        .replace(/{{imageCaption}}/g, pg.imageCaption || '')
        .replace(/{{authorBio}}/g, pg.authorBio || '')
        .replace(/{{hreflang}}/g, '')
        .replace(/{{articletags}}/g, '');
      
      const contentPath = path.join(DOCS_DIR, 'page', pg.slug);
      fs.mkdirSync(contentPath, { recursive: true });
      fs.writeFileSync(path.join(contentPath, 'index.html'), filledTemplate);
    });
    console.log(`✅ Built ${pages.length} pages`);
  }

  // Generate home
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
  generateSitemaps(perspectives, books, pages);

  console.log('✨ Build complete! Serve from ./docs/');
}

build();
