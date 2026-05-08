const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const BASE_URL = 'https://einp-js.github.io/';
const SITE_NAME = 'Everything in Perspective';
const SITE_DESC = 'Essays on trends, context & nuance';

// Content Registry: All supported content types
const CONTENT_REGISTRY = [
  { folder: 'articles', singular: 'article', plural: 'articles', template: 'article.html', description: 'Articles on global trends' },
  { folder: 'perspectives', singular: 'perspective', plural: 'perspectives', template: 'perspective.html', description: 'Contemporary perspectives' },
  { folder: 'books', singular: 'book', plural: 'books', template: 'book.html', description: 'Book reviews' },
  { folder: 'pages', singular: 'page', plural: 'pages', template: 'page.html', description: 'Static pages' },
  { folder: 'people', singular: 'person', plural: 'people', template: 'person.html', description: 'People' },
  { folder: 'languages', singular: 'language', plural: 'languages', template: 'language.html', description: 'Languages' },
];

// Load templates
const templates = {};
CONTENT_REGISTRY.forEach(ct => {
  const tp = path.join(TEMPLATES_DIR, ct.template);
  if (fs.existsSync(tp)) templates[ct.folder] = fs.readFileSync(tp, 'utf-8');
  else console.warn(`⚠️  Missing: ${tp}`);
});
const magazineCollectionTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'magazine-collection.html'), 'utf-8');
const linkedDataCollectionTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'linked-data-collection.html'), 'utf-8');
const homeTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');
const config = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'config.json'), 'utf-8'));

// Ensure directories
['css', 'js', 'images'].forEach(d => {
  if (!fs.existsSync(path.join(DOCS_DIR, d))) fs.mkdirSync(path.join(DOCS_DIR, d), { recursive: true });
});

// Copy static assets
function copyAssets() {
  if (!fs.existsSync('./static')) return;
  const copy = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest);
      fs.readdirSync(src).forEach(f => copy(path.join(src, f), path.join(dest, f)));
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  copy('./static', DOCS_DIR);
}

// Copy theme and verification files
function copyThemesAndFiles() {
  if (fs.existsSync('./themes')) {
    if (!fs.existsSync(path.join(DOCS_DIR, 'css'))) fs.mkdirSync(path.join(DOCS_DIR, 'css'), { recursive: true });
    const themeFile = path.join('./themes', 'default.css');
    if (fs.existsSync(themeFile)) fs.copyFileSync(themeFile, path.join(DOCS_DIR, 'css', 'theme.css'));
  }
  const persistFiles = ['ads.txt'];
  if (!fs.existsSync('./static')) return;
  const googleFiles = fs.readdirSync('./static').filter(f => f.startsWith('google') && f.endsWith('.html'));
  googleFiles.forEach(f => fs.copyFileSync(path.join('./static', f), path.join(DOCS_DIR, f)));
  persistFiles.forEach(f => {
    if (fs.existsSync(path.join('./static', f))) fs.copyFileSync(path.join('./static', f), path.join(DOCS_DIR, f));
  });
}

// Parse content markdown files
function parseContent(contentType) {
  const contentDir = path.join(CONTENT_DIR, contentType);
  const items = [];
  if (!fs.existsSync(contentDir)) return items;
  
  fs.readdirSync(contentDir).forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(contentDir, file), 'utf-8');
      const { attributes, body } = fm(content);
      const match = file.match(/\.(\w+)\.md$/);
      const language = match ? match[1] : 'en';
      const slug = file.replace(/\.\w+\.md$/, '');
      items.push({
        slug, language, contentType,
        ...attributes,
        content: marked(body),
        date: attributes.date ? new Date(attributes.date) : new Date(),
      });
    }
  });
  return items.sort((a, b) => (b.date || new Date()) - (a.date || new Date()));
}

// JSON-LD generators
function generateBreadcrumbSchema(pathArray) {
  const items = pathArray.map((label, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: label,
    item: BASE_URL + '/' + pathArray.slice(0, idx + 1).join('/')
  }));
  return `<script type="application/ld+json">\n${ JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }, null, 2)}\n</script>`;
}

function generateArticleSchema(item, url) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title || 'Untitled',
    description: item.description || '',
    image: item.image || '',
    datePublished: item.date?.toISOString() || '',
    author: { "@type": "Person", name: (item.author || 'Staff') },
    mainEntityOfPage: { "@type": "WebPage", "@id": url }
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// Fill template with data
function fillTemplate(template, item, extras = {}) {
  let result = template;
  const fields = { title: 'Untitled', description: '', slug: '', language: '', content: '', author: 'Staff',
    publishedDate: '', publishedDateFormatted: '', category: '', keywords: '', image: '', imageAlt: '', imageCaption: '', authorBio: '' };
  Object.keys(fields).forEach(k => {
    result = result.replace(new RegExp(`{{${k}}}`, 'g'), item[k] || fields[k]);
  });
  result = result.replace(/{{hreflang}}/g, extras.hreflang || '');
  result = result.replace(/{{jsonLdSchema}}/g, extras.jsonLd || '');
  result = result.replace(/{{canonicalUrl}}/g, extras.canonical || '');
  return result;
}

// Generate robots.txt
function generateRobotsTxt() {
  const robotsTxt = `# Everything in Perspective robots.txt
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${BASE_URL}/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /
`;
  fs.writeFileSync(path.join(DOCS_DIR, 'robots.txt'), robotsTxt);
}

// Generate llms.txt files for AI discovery
function generateLlmsFiles(allRoutes) {
  const llmsSummary = `# Everything in Perspective

> Essays on trends, context & nuance

Canonical Origin: ${BASE_URL}

## LLM Resources

- [Full Content](${BASE_URL}/llms-full.txt)
- [Sitemap](/sitemap.xml)

## Featured Routes

${allRoutes.slice(0, 10).map(r => `- ${r.label}: ${r.url}`).join('\n')}

For complete content, see llms-full.txt
`;
  fs.writeFileSync(path.join(DOCS_DIR, 'llms.txt'), llmsSummary);

  const llmsFullContent = `# Everything in Perspective - Full Index

Canonical Origin: ${BASE_URL}

## All Routes

${allRoutes.map(r => `### ${r.label}\n\nURL: ${r.url}\nType: ${r.type}\nDescription: ${r.description || 'N/A'}\n`).join('\n')}`;
  fs.writeFileSync(path.join(DOCS_DIR, 'llms-full.txt'), llmsFullContent);
}

// Generate search index JSON
function generateSearchIndex(allContent) {
  const searchData = [];
  CONTENT_REGISTRY.forEach(ct => {
    if (allContent[ct.folder]) {
      allContent[ct.folder].forEach(item => {
        searchData.push({
          id: `${ct.singular}-${item.slug}`,
          title: item.title || 'Untitled',
          description: item.description || '',
          type: ct.singular,
          url: `/magazine/${ct.singular}/${item.slug}/`,
          author: item.author || 'Staff',
          date: item.date?.toISOString().split('T')[0] || '',
        });
      });
    }
  });
  if (!fs.existsSync(path.join(DOCS_DIR, 'js'))) fs.mkdirSync(path.join(DOCS_DIR, 'js'), { recursive: true });
  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'search-index.json'), JSON.stringify(searchData, null, 2));
  return searchData;
}

// Generate sitemaps
function generateSitemaps(allRoutes) {
  const urls = allRoutes.map(route => ({
    loc: route.url,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: route.type === 'home' ? 'daily' : 'monthly',
    priority: route.type === 'home' ? '1.0' : '0.8'
  }));

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.join(DOCS_DIR, 'sitemap_full.xml'), sitemapXml);
  for (let i = 1; i <= 10; i++) fs.writeFileSync(path.join(DOCS_DIR, `sitemap_alt${i}.xml`), sitemapXml);
  console.log(`📍 Generated sitemaps (${urls.length} URLs)`);
}

// Count HTML files
function countHtmlFiles(dir) {
  let count = 0;
  function traverse(d) {
    fs.readdirSync(d).forEach(file => {
      const full = path.join(d, file);
      if (fs.statSync(full).isDirectory()) traverse(full);
      else if (file.endsWith('.html')) count++;
    });
  }
  traverse(dir);
  return count;
}

// MAIN BUILD FUNCTION
function build() {
  console.time('Build');
  console.log('🔨 Building site...');
  
  copyAssets();
  copyThemesAndFiles();
  
  const allContent = {};
  let totalPages = 0;
  const allRoutes = [];
  
  // PHASE 1: Build individual content pages (magazine + linked-data views)
  CONTENT_REGISTRY.forEach(ct => {
    const items = parseContent(ct.folder);
    allContent[ct.folder] = items;
    
    if (items.length > 0 && templates[ct.folder]) {
      items.forEach(item => {
        const canonical = `${BASE_URL}/magazine/${ct.singular}/${item.slug}/`;
        const jsonLd = generateArticleSchema(item, canonical);
        const breadcrumb = generateBreadcrumbSchema([ct.plural, item.slug]);
        const extras = { canonical, jsonLd: breadcrumb + jsonLd };
        const filledTemplate = fillTemplate(templates[ct.folder], item, extras);
        
        // Magazine view
        const magPath = path.join(DOCS_DIR, 'magazine', ct.singular, item.slug);
        fs.mkdirSync(magPath, { recursive: true });
        fs.writeFileSync(path.join(magPath, 'index.html'), filledTemplate);
        totalPages++;
        allRoutes.push({ label: `${item.title} (Mag)`, url: canonical, type: ct.singular, description: item.description });

        // Linked-data view
        const ldPath = path.join(DOCS_DIR, 'linked-data', ct.singular, item.slug);
        fs.mkdirSync(ldPath, { recursive: true });
        fs.writeFileSync(path.join(ldPath, 'index.html'), filledTemplate);
        totalPages++;
        allRoutes.push({ label: `${item.title} (LD)`, url: `${BASE_URL}/linked-data/${ct.singular}/${item.slug}/`, type: ct.singular, description: item.description });
      });
      console.log(`✅ ${items.length} ${ct.plural}`);
    }
  });
  
  // PHASE 2: Collection pages (magazine + linked-data)
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    if (items.length === 0) return;

    const itemsGrid = items.map(item => `
    <div class="border border-accent p-4 rounded">
      <h3 class="font-serif text-xl font-bold mb-2"><a href="/magazine/${ct.singular}/${item.slug}/" class="hover:underline">${item.title}</a></h3>
      <p class="text-muted text-sm mb-3">${item.date?.toLocaleDateString() || ''}</p>
      <a href="/magazine/${ct.singular}/${item.slug}/" class="text-primary font-bold hover:underline">Read →</a>
    </div>`).join('');
    
    // Magazine collection
    const magColl = magazineCollectionTemplate
      .replace(/{{collectionTitle}}/g, ct.description || ct.plural)
      .replace(/{{collectionDescription}}/g, `All ${ct.plural}`)
      .replace(/{{itemsGrid}}/g, itemsGrid)
      .replace(/{{breadcrumb}}/g, ct.plural)
      .replace(/{{canonicalUrl}}/g, `${BASE_URL}/magazine/${ct.plural}/`)
      .replace(/{{filterUI}}/g, '')
      .replace(/{{pagination}}/g, '')
      .replace(/{{jsonLdSchema}}/g, generateBreadcrumbSchema(['magazine', ct.plural]));
    
    const magCollPath = path.join(DOCS_DIR, 'magazine', ct.plural);
    fs.mkdirSync(magCollPath, { recursive: true });
    fs.writeFileSync(path.join(magCollPath, 'index.html'), magColl);
    totalPages++;
    allRoutes.push({ label: `${ct.plural} (Mag)`, url: `${BASE_URL}/magazine/${ct.plural}/`, type: 'collection', description: `All ${ct.plural}` });

    // Linked-data collection
    const ldColl = linkedDataCollectionTemplate
      .replace(/{{collectionTitle}}/g, ct.description || ct.plural)
      .replace(/{{collectionDescription}}/g, `Linked data: All ${ct.plural}`)
      .replace(/{{itemsList}}/g, itemsGrid)
      .replace(/{{breadcrumb}}/g, ct.plural)
      .replace(/{{canonicalUrl}}/g, `${BASE_URL}/linked-data/${ct.plural}/`)
      .replace(/{{jsonLdSchema}}/g, generateBreadcrumbSchema(['linked-data', ct.plural]));
    
    const ldCollPath = path.join(DOCS_DIR, 'linked-data', ct.plural);
    fs.mkdirSync(ldCollPath, { recursive: true });
    fs.writeFileSync(path.join(ldCollPath, 'index.html'), ldColl);
    totalPages++;
    allRoutes.push({ label: `${ct.plural} (LD)`, url: `${BASE_URL}/linked-data/${ct.plural}/`, type: 'collection', description: `Linked data: ${ct.plural}` });
  });

  // PHASE 3: SEO/AIO artifacts
  console.log('📝 Generating SEO/AIO artifacts...');
  generateRobotsTxt();
  generateLlmsFiles(allRoutes);
  const searchIndex = generateSearchIndex(allContent);
  
  // PHASE 4: Home page with carousels
  const homeNewTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home-new.html'), 'utf-8');
  let homeHtml = homeNewTemplate;
  
  // Build carousels for each content type
  CONTENT_REGISTRY.forEach(ct => {
    const items = allContent[ct.folder] || [];
    const carouselHtml = items.slice(0, 12).map(item => `
    <div class="carousel-item snap-start flex-shrink-0 w-64 scroll-ml-gutter">
      <div class="card h-full flex flex-col p-md">
        <div class="mb-md flex-grow">
          <p class="text-xs text-muted uppercase tracking-wide mb-sm">${ct.singular}</p>
          <h3 class="font-serif text-lg font-normal mb-md leading-tight"><a href="/magazine/${ct.singular}/${item.slug}/" class="hover:underline">${item.title}</a></h3>
          <p class="text-sm text-muted">${item.description || ''}</p>
        </div>
        <a href="/magazine/${ct.singular}/${item.slug}/" class="text-primary font-bold text-sm hover:underline mt-auto">Read →</a>
      </div>
    </div>`).join('');
    
    homeHtml = homeHtml.replace(`{{${ct.plural}-carousel}}`, carouselHtml);
  });
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), homeHtml);
  totalPages++;
  allRoutes.push({ label: 'Home', url: `${BASE_URL}/`, type: 'home', description: SITE_DESC });

  // PHASE 5: Sitemaps
  generateSitemaps(allRoutes);

  console.timeEnd('Build');
  const htmlFiles = countHtmlFiles(DOCS_DIR);
  console.log(`✨ Build complete! ${totalPages} pages + ${searchIndex.length} searchable items, ${htmlFiles} total HTML files`);
}

build();
