// Load article metadata for search/filtering
let articles = [];

async function loadMetadata() {
  try {
    const response = await fetch('/js/metadata.json');
    articles = await response.json();
  } catch (error) {
    console.log('Metadata not available yet');
  }
}

// Simple search function (can upgrade to Fuse.js later)
function searchArticles(query) {
  return articles.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase()) ||
    a.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );
}

// Filter by category
function filterByCategory(category) {
  return articles.filter(a => a.category === category);
}

// Get related articles based on category/tags
function getRelatedArticles(currentSlug, category, tags) {
  return articles
    .filter(a => a.slug !== currentSlug && (a.category === category || a.tags.some(t => tags.includes(t))))
    .slice(0, 2);
}

// Render related articles on article pages
function renderRelatedArticles() {
  const container = document.getElementById('related-articles');
  if (!container) return;

  // Extract current article metadata from page
  const title = document.querySelector('h1')?.textContent || '';
  const categoryEl = document.querySelector('[class*="category"]');
  const category = categoryEl?.textContent || '';
  
  // Find current article
  const current = articles.find(a => a.title === title);
  if (!current) return;

  const related = getRelatedArticles(current.slug, current.category, current.tags);
  
  container.innerHTML = related.map(a => `
    <div class="border border-accent p-6 hover:bg-light transition">
      <h3 class="font-serif font-bold mb-2"><a href="/perspective/${a.slug}/">${a.title}</a></h3>
      <p class="text-muted text-sm mb-4">${new Date(a.date).toLocaleDateString()}</p>
      <p class="text-sm">${a.description}</p>
    </div>
  `).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMetadata().then(() => {
    renderRelatedArticles();
  });
});
