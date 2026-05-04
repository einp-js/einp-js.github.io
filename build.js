const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const DOCS_DIR = './docs';
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';

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
const layoutTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');
const articleTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'article.html'), 'utf-8');
const homeTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');

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

// Parse all articles
function parseArticles() {
  const articlesDir = path.join(CONTENT_DIR, 'articles');
  const articles = [];

  if (!fs.existsSync(articlesDir)) return articles;

  fs.readdirSync(articlesDir).forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
      const { attributes, body } = fm(content);
      const slug = file.replace('.md', '');
      const html = marked(body);

      articles.push({
        slug,
        ...attributes,
        content: html,
        date: new Date(attributes.date),
      });
    }
  });

  return articles.sort((a, b) => b.date - a.date);
}

// Generate article pages
function generateArticles(articles) {
  articles.forEach(article => {
    const html = articleTemplate
      .replace('{{title}}', article.title || 'Untitled')
      .replace('{{author}}', article.author || 'Staff')
      .replace('{{date}}', article.date.toLocaleDateString())
      .replace('{{category}}', article.category || 'General')
      .replace('{{content}}', article.content)
      .replace('{{description}}', article.description || '');

    const articlePath = path.join(DOCS_DIR, 'perspective', article.slug);
    fs.mkdirSync(articlePath, { recursive: true });
    fs.writeFileSync(path.join(articlePath, 'index.html'), html);
  });
}

// Generate homepage with featured articles
function generateHome(articles) {
  const featured = articles.slice(0, 3);
  let featuredHTML = featured.map(a => `
    <article class="mb-12 pb-12 border-b border-primary">
      <h3 class="font-serif text-heading mb-2">${a.title}</h3>
      <p class="text-muted text-caption mb-4">${a.date.toLocaleDateString()} • ${a.category}</p>
      <p class="text-body mb-4">${a.description}</p>
      <a href="/perspective/${a.slug}/" class="text-primary font-sans font-bold hover:underline">Read More →</a>
    </article>
  `).join('');

  const html = homeTemplate.replace('{{featured}}', featuredHTML);
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
}

// Generate article metadata JSON for client-side search
function generateMetadata(articles) {
  const metadata = articles.map(a => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    tags: a.tags || [],
    author: a.author,
    date: a.date.toISOString(),
    description: a.description,
  }));

  fs.writeFileSync(
    path.join(DOCS_DIR, 'js', 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
}

// Main build
function build() {
  console.log('🔨 Building site...');
  
  copyAssets();
  const articles = parseArticles();
  
  if (articles.length > 0) {
    generateArticles(articles);
    generateHome(articles);
    generateMetadata(articles);
    console.log(`✅ Built ${articles.length} articles`);
  } else {
    console.warn('⚠️  No articles found in content/articles/');
  }

  console.log('✨ Build complete! Serve from ./docs/');
}

build();
