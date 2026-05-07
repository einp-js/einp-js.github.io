const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');
const { Feed } = require('feed');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const BASE_URL = 'https://everythinginperspective.github.io/everythinginperspective_purejs';
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
const linkedDataDetailTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'linked-data-detail.html'), 'utf-8');
const searchResultsTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'search-results.html'), 'utf-8');
const authorTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'author.html'), 'utf-8');
const categoryTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'category.html'), 'utf-8');
const tagTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'tag.html'), 'utf-8');
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
  const author = {
    "@type": "Person",
    name: item.author || 'Staff',
    url: item.authorUrl || `${BASE_URL}/author/${(item.author || 'Staff').toLowerCase().replace(/\s+/g, '-')}/`
  };
  if (item.authorImage) author.image = item.authorImage;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title || 'Untitled',
    description: item.description || '',
    image: item.image || '',
    datePublished: item.date?.toISOString() || '',
    dateModified: item.dateModified?.toISOString() || item.date?.toISOString() || '',
    author: author,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: BASE_URL + '/logo.png',
        width: 250,
        height: 60
      }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: item.keywords || '',
    articleSection: item.category || 'General'
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

function generateOrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    description: SITE_DESC,
    logo: BASE_URL + '/logo.png',
    sameAs: [
      "https://twitter.com/yourhandle",
      "https://linkedin.com/company/einp"
    ]
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// Fill template with data
function fillTemplate(template, item, extras = {}) {
  let result = template;
  const fields = {
    title: 'Untitled',
    description: '',
    slug: '',
    language: 'en',
    content: '',
    author: 'Staff',
    publishedDate: item.date instanceof Date ? item.date.toISOString().split('T')[0] : '',
    publishedDateFormatted: item.date instanceof Date ? item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
    modifiedDate: item.dateModified instanceof Date ? item.dateModified.toISOString().split('T')[0] : (item.date instanceof Date ? item.date.toISOString().split('T')[0] : ''),
    modifiedDateFormatted: item.dateModified instanceof Date ? item.dateModified.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (item.date instanceof Date ? item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''),
    date: item.date instanceof Date ? item.date.toISOString() : '',
    category: '',
    keywords: '',
    image: item.image || item.cover || '',
    imageAlt: '',
    imageCaption: '',
    authorBio: '',
    cover: item.cover || item.image || '',
    isbn: '',
    pages: '',
    publisher: '',
    publishDate: item.publishDate || (item.date instanceof Date ? item.date.toISOString().split('T')[0] : ''),
    subtitle: '',
    contentType: item.contentType || '',
    year: item.year || '',
    role: item.role || '',
    website: item.website || '',
    twitter: item.twitter || '',
    linkedin: item.linkedin || '',
    code: item.code || '',
    name: item.name || item.title || ''
  };
  Object.keys(fields).forEach(k => {
    const value = item[k] !== undefined && item[k] !== null && item[k] !== '' ? item[k] : fields[k];
    result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(value));
  });
  result = result.replace(/{{hreflang}}/g, extras.hreflang || '');
  result = result.replace(/{{jsonLdSchema}}/g, extras.jsonLd || '');
  result = result.replace(/{{canonicalUrl}}/g, extras.canonical || '');
  result = result.replace(/{{magazineUrl}}/g, extras.magazineUrl || '');
  result = result.replace(/{{authorInfo}}/g, item.author ? `<p class="text-muted text-sm mb-2">By <span class="font-bold"><a href="/author/${(item.author || 'staff').toLowerCase().replace(/\s+/g, '-')}" class="hover:underline">${item.author}</a></span></p>` : '');
  result = result.replace(/{{dateInfo}}/g, item.date instanceof Date ? `<p class="text-muted text-sm">${item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : '');
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
          url: `/everythinginperspective_purejs/magazine/${ct.singular}/${item.slug}/`,
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

// Extract and index entities
function extractEntities(allContent) {
  const authors = {};
  const categories = {};
  const tags = {};
  
  Object.values(allContent).forEach(items => {
    items.forEach(item => {
      if (item.author) {
        const slug = item.author.toLowerCase().replace(/\s+/g, '-');
        if (!authors[slug]) authors[slug] = { name: item.author, items: [], slug };
        authors[slug].items.push(item);
      }
      if (item.category) {
        const slug = item.category.toLowerCase().replace(/\s+/g, '-');
        if (!categories[slug]) categories[slug] = { name: item.category, items: [], slug };
        categories[slug].items.push(item);
      }
      if (item.keywords) {
        (item.keywords || '').split(',').forEach(kw => {
          const tag = kw.trim();
          if (tag) {
            const slug = tag.toLowerCase().replace(/\s+/g, '-');
            if (!tags[slug]) tags[slug] = { name: tag, items: [], slug };
            tags[slug].items.push(item);
          }
        });
      }
    });
  });
  return { authors, categories, tags };
}

// Generate entity pages
function generateEntityPages(entities, allRoutes, totalPages) {
  let pages = totalPages;
  
  console.log('👤 Generating author pages...');
  Object.values(entities.authors).forEach(author => {
    const itemsList = author.items.map(item => `
    <div class="border border-accent p-4 rounded">
      <h3 class="font-serif text-lg font-bold mb-2"><a href="/magazine/${item.contentType}/${item.slug}/" class="hover:underline">${item.title}</a></h3>
      <p class="text-muted text-sm">${item.date?.toLocaleDateString() || ''}</p>
    </div>`).join('');
    
    const page = authorTemplate
      .replace(/{{authorName}}/g, author.name)
      .replace(/{{itemCount}}/g, author.items.length)
      .replace(/{{pluralS}}/g, author.items.length === 1 ? '' : 's')
      .replace(/{{itemsList}}/g, itemsList)
      .replace(/{{canonicalUrl}}/g, `${BASE_URL}/author/${author.slug}/`)
      .replace(/{{jsonLdSchema}}/g, generateBreadcrumbSchema(['author', author.slug]))
      .replace(/{{relatedAuthors}}/g, '');
    
    const authPath = path.join(DOCS_DIR, 'author', author.slug);
    fs.mkdirSync(authPath, { recursive: true });
    fs.writeFileSync(path.join(authPath, 'index.html'), page);
    pages++;
    allRoutes.push({ label: author.name, url: `${BASE_URL}/author/${author.slug}/`, type: 'author', description: `${author.items.length} articles by ${author.name}` });
  });
  
  console.log('🏷️  Generating category pages...');
  Object.values(entities.categories).forEach(category => {
    const itemsList = category.items.map(item => `
    <div class="border border-accent p-4 rounded">
      <h3 class="font-serif text-lg font-bold mb-2"><a href="/magazine/${item.contentType}/${item.slug}/" class="hover:underline">${item.title}</a></h3>
      <p class="text-muted text-sm">${item.date?.toLocaleDateString() || ''}</p>
    </div>`).join('');
    
    const page = categoryTemplate
      .replace(/{{categoryName}}/g, category.name)
      .replace(/{{itemCount}}/g, category.items.length)
      .replace(/{{pluralS}}/g, category.items.length === 1 ? '' : 's')
      .replace(/{{itemsList}}/g, itemsList)
      .replace(/{{canonicalUrl}}/g, `${BASE_URL}/category/${category.slug}/`)
      .replace(/{{jsonLdSchema}}/g, generateBreadcrumbSchema(['category', category.slug]))
      .replace(/{{relatedCategories}}/g, '');
    
    const catPath = path.join(DOCS_DIR, 'category', category.slug);
    fs.mkdirSync(catPath, { recursive: true });
    fs.writeFileSync(path.join(catPath, 'index.html'), page);
    pages++;
    allRoutes.push({ label: category.name, url: `${BASE_URL}/category/${category.slug}/`, type: 'category', description: `${category.items.length} items in ${category.name}` });
  });
  
  console.log('🔖 Generating tag pages...');
  Object.values(entities.tags).forEach(tag => {
    const itemsList = tag.items.map(item => `
    <div class="border border-accent p-4 rounded">
      <h3 class="font-serif text-lg font-bold mb-2"><a href="/magazine/${item.contentType}/${item.slug}/" class="hover:underline">${item.title}</a></h3>
      <p class="text-muted text-sm">${item.date?.toLocaleDateString() || ''}</p>
    </div>`).join('');
    
    const page = tagTemplate
      .replace(/{{tagName}}/g, tag.name)
      .replace(/{{itemCount}}/g, tag.items.length)
      .replace(/{{pluralS}}/g, tag.items.length === 1 ? '' : 's')
      .replace(/{{itemsList}}/g, itemsList)
      .replace(/{{canonicalUrl}}/g, `${BASE_URL}/tag/${tag.slug}/`)
      .replace(/{{jsonLdSchema}}/g, generateBreadcrumbSchema(['tag', tag.slug]))
      .replace(/{{relatedTags}}/g, '');
    
    const tagPath = path.join(DOCS_DIR, 'tag', tag.slug);
    fs.mkdirSync(tagPath, { recursive: true });
    fs.writeFileSync(path.join(tagPath, 'index.html'), page);
    pages++;
    allRoutes.push({ label: `#${tag.name}`, url: `${BASE_URL}/tag/${tag.slug}/`, type: 'tag', description: `${tag.items.length} items tagged #${tag.name}` });
  });
  
  return pages;
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

// Generate RSS feeds
function generateRssFeeds(allContent) {
  // Main feed: all articles and perspectives
  const feed = new Feed({
    title: SITE_NAME,
    description: SITE_DESC,
    id: BASE_URL,
    link: BASE_URL,
    language: 'en',
    favicon: BASE_URL + '/favicon.ico',
    copyright: `${new Date().getFullYear()} Everything in Perspective`
  });

  // Add articles
  (allContent.articles || []).forEach(article => {
    feed.addItem({
      title: article.title || 'Untitled',
      description: article.description || '',
      id: `${BASE_URL}/magazine/article/${article.slug}/`,
      link: `${BASE_URL}/magazine/article/${article.slug}/`,
      content: article.content,
      author: [{ name: article.author || 'Staff' }],
      date: article.date || new Date(),
      category: article.category ? [{ name: article.category }] : [],
      image: article.image || ''
    });
  });

  // Add perspectives
  (allContent.perspectives || []).forEach(perspective => {
    feed.addItem({
      title: perspective.title || 'Untitled',
      description: perspective.description || '',
      id: `${BASE_URL}/magazine/perspective/${perspective.slug}/`,
      link: `${BASE_URL}/magazine/perspective/${perspective.slug}/`,
      content: perspective.content,
      author: [{ name: perspective.author || 'Staff' }],
      date: perspective.date || new Date(),
      category: perspective.category ? [{ name: perspective.category }] : []
    });
  });

  // Write RSS and Atom feeds
  fs.writeFileSync(path.join(DOCS_DIR, 'feed.xml'), feed.rss2());
  fs.writeFileSync(path.join(DOCS_DIR, 'feed.atom'), feed.atom1());
  console.log('📡 Generated RSS/Atom feeds');
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
        const tagNames = (item.keywords || '').split(',').map(tag => tag.trim()).filter(Boolean);
        const authorSlug = (item.author || 'staff').toLowerCase().replace(/\s+/g, '-');
        const categorySlug = (item.category || '').toLowerCase().replace(/\s+/g, '-');
        const relatedByAuthor = item.author ? items.filter(candidate => candidate.slug !== item.slug && candidate.author === item.author).slice(0, 5) : [];
        const relatedByCategory = item.category ? items.filter(candidate => candidate.slug !== item.slug && candidate.category === item.category).slice(0, 5) : [];
        const relatedContentHtml = [...relatedByAuthor, ...relatedByCategory]
          .slice(0, 6)
          .map(related => `<li><a href="/linked-data/${ct.singular}/${related.slug}/">${related.title}</a></li>`)
          .join('');
        const tagsHtml = tagNames.length ? `<div class="relationship-card"><h3>Tags</h3><ul>${tagNames.map(tag => `<li><a href="/tag/${tag.toLowerCase().replace(/\s+/g, '-')}">#${tag}</a></li>`).join('')}</ul></div>` : '<div class="relationship-card"><h3>Tags</h3><p class="text-muted text-sm">No tags listed.</p></div>';
        const authorsSection = item.author ? `<div class="relationship-card"><h3>Author</h3><ul><li><a href="/author/${authorSlug}/">${item.author}</a></li></ul></div>` : '<div class="relationship-card"><h3>Author</h3><p class="text-muted text-sm">No author listed.</p></div>';
        const categoriesSection = item.category ? `<div class="relationship-card"><h3>Category</h3><ul><li><a href="/category/${categorySlug}/">${item.category}</a></li></ul></div>` : '<div class="relationship-card"><h3>Category</h3><p class="text-muted text-sm">No category listed.</p></div>';
        const relatedContentSection = `<div class="relationship-card"><h3>Related ${ct.plural}</h3>${relatedContentHtml ? `<ul>${relatedContentHtml}</ul>` : '<p class="text-muted text-sm">No closely related items yet.</p>'}</div>`;
        const backlinksSection = relatedByAuthor.length || relatedByCategory.length
          ? `<div class="space-y-3">${[...relatedByAuthor, ...relatedByCategory].slice(0, 8).map(related => `<div class="border border-accent p-4 rounded"><a href="/linked-data/${ct.singular}/${related.slug}/" class="font-bold hover:underline">${related.title}</a><p class="text-sm text-muted mt-1">Shared author or category relationship</p></div>`).join('')}</div>`
          : '<p class="text-muted text-sm">No backlinks indexed yet.</p>';
        const frontlinksSection = `<div class="space-y-3">${[
          item.author ? `<div class="border border-accent p-4 rounded"><a href="/author/${authorSlug}/" class="font-bold hover:underline">Author: ${item.author}</a></div>` : '',
          item.category ? `<div class="border border-accent p-4 rounded"><a href="/category/${categorySlug}/" class="font-bold hover:underline">Category: ${item.category}</a></div>` : '',
          ...tagNames.map(tag => `<div class="border border-accent p-4 rounded"><a href="/tag/${tag.toLowerCase().replace(/\s+/g, '-')}" class="font-bold hover:underline">Tag: #${tag}</a></div>`)
        ].filter(Boolean).join('')}</div>`;
        const ldExtras = {
          canonical: `${BASE_URL}/linked-data/${ct.singular}/${item.slug}/`,
          magazineUrl: `${BASE_URL}/magazine/${ct.singular}/${item.slug}/`,
          jsonLd: breadcrumb + jsonLd,
        };
        let linkedDataHtml = fillTemplate(linkedDataDetailTemplate, { ...item, contentType: ct.singular }, ldExtras);
        linkedDataHtml = linkedDataHtml.replace(/{{authorsSection}}/g, authorsSection);
        linkedDataHtml = linkedDataHtml.replace(/{{categoriesSection}}/g, categoriesSection);
        linkedDataHtml = linkedDataHtml.replace(/{{tagsSection}}/g, tagsHtml);
        linkedDataHtml = linkedDataHtml.replace(/{{relatedContentSection}}/g, relatedContentSection);
        linkedDataHtml = linkedDataHtml.replace(/{{backlinksSection}}/g, backlinksSection);
        linkedDataHtml = linkedDataHtml.replace(/{{frontlinksSection}}/g, frontlinksSection);
        linkedDataHtml = linkedDataHtml.replace(/{{authorCount}}/g, item.author ? '1' : '0');
        linkedDataHtml = linkedDataHtml.replace(/{{categoryCount}}/g, item.category ? '1' : '0');
        linkedDataHtml = linkedDataHtml.replace(/{{tagCount}}/g, String(tagNames.length));
        linkedDataHtml = linkedDataHtml.replace(/{{yCategoryPlural}}/g, item.category ? 'y' : 'ies');
        linkedDataHtml = linkedDataHtml.replace(/{{tagPlural}}/g, tagNames.length === 1 ? '' : 's');
        linkedDataHtml = linkedDataHtml.replace(/{{connectionCount}}/g, String((item.author ? 1 : 0) + (item.category ? 1 : 0) + tagNames.length + [...relatedByAuthor, ...relatedByCategory].slice(0, 8).length));
        fs.writeFileSync(path.join(ldPath, 'index.html'), linkedDataHtml);
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
  
  // PHASE 4: Home page
  const perspectives = allContent.perspectives || [];
  const featured = perspectives.slice(0, 3).map(p => `
    <article class="mb-12 pb-12 border-b border-accent">
      <h3 class="font-serif text-2xl font-bold mb-2"><a href="/magazine/perspective/${p.slug}/" class="hover:underline">${p.title}</a></h3>
      <p class="text-muted text-sm mb-4">${p.date?.toLocaleDateString() || ''} • ${p.category || 'General'}</p>
      <a href="/magazine/perspective/${p.slug}/" class="text-primary font-bold hover:underline">Read More →</a>
    </article>`).join('');
  const homeHtml = homeTemplate.replace('{{featured}}', featured);
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), homeHtml);
  totalPages++;
  allRoutes.push({ label: 'Home', url: `${BASE_URL}/`, type: 'home', description: SITE_DESC });

  // PHASE 5: Generate search results page
  console.log('🔍 Generating search page...');
  const searchPage = searchResultsTemplate.replace('{{SEARCH_INDEX_JSON}}', JSON.stringify(searchIndex));
  const searchPath = path.join(DOCS_DIR, 'search');
  fs.mkdirSync(searchPath, { recursive: true });
  fs.writeFileSync(path.join(searchPath, 'index.html'), searchPage);
  totalPages++;
  allRoutes.push({ label: 'Search', url: `${BASE_URL}/search/`, type: 'search', description: 'Search all content' });

  // PHASE 6: Generate entity pages (authors, categories, tags)
  const entities = extractEntities(allContent);
  totalPages = generateEntityPages(entities, allRoutes, totalPages);

  // PHASE 7: Sitemaps
  generateSitemaps(allRoutes);

  // PHASE 8: RSS feeds
  generateRssFeeds(allContent);

  // PHASE 9: Generate static URL redirect pages
  console.log('🔗 Generating URL redirect pages...');
  const redirects = [
    { from: 'mag', to: 'magazine' },
    { from: 'ld', to: 'linked-data' }
  ];
  
  // Redirect collection pages
  redirects.forEach(({ from, to }) => {
    CONTENT_REGISTRY.forEach(ct => {
      // Collection redirect: /mag/articles -> /magazine/articles
      const colRedirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/everythinginperspective_purejs/${to}/${ct.plural}/">
  <link rel="canonical" href="${BASE_URL}/${to}/${ct.plural}/">
  <title>Redirecting...</title>
</head>
<body>Redirecting to <a href="/${to}/${ct.plural}/">${to}/${ct.plural}/</a></body>
</html>`;
      const colRedirPath = path.join(DOCS_DIR, from, ct.plural);
      fs.mkdirSync(colRedirPath, { recursive: true });
      fs.writeFileSync(path.join(colRedirPath, 'index.html'), colRedirectHtml);
      totalPages++;
    });
    
    // Item detail redirects: /mag/article/slug -> /magazine/article/slug
    CONTENT_REGISTRY.forEach(ct => {
      const items = allContent[ct.folder] || [];
      items.forEach(item => {
        const itemRedirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/everythinginperspective_purejs/${to}/${ct.singular}/${item.slug}/">
  <link rel="canonical" href="${BASE_URL}/${to}/${ct.singular}/${item.slug}/">
  <title>Redirecting...</title>
</head>
<body>Redirecting to <a href="/${to}/${ct.singular}/${item.slug}/">${to}/${ct.singular}/${item.slug}/</a></body>
</html>`;
        const itemRedirPath = path.join(DOCS_DIR, from, ct.singular, item.slug);
        fs.mkdirSync(itemRedirPath, { recursive: true });
        fs.writeFileSync(path.join(itemRedirPath, 'index.html'), itemRedirectHtml);
        totalPages++;
      });
    });
  });
  console.log('🔗 Generated ${redirects.length * CONTENT_REGISTRY.length * 2} redirect pages');

  console.timeEnd('Build');
  const htmlFiles = countHtmlFiles(DOCS_DIR);
  console.log(`✨ Build complete! ${totalPages} pages + ${searchIndex.length} searchable items, ${htmlFiles} total HTML files`);
}

build();
