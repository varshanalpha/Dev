// ==========================================================================
// Client-Side Hash Router
// ==========================================================================

import { store } from './state.js';
import { api } from './api.js';
import { 
    renderPostCard, 
    renderCommentCard, 
    renderMarkdown, 
    formatDate, 
    escapeHtml, 
    showToast,
    confirmModal 
} from './ui.js';

export class Router {
    constructor() {
        this.viewport = document.getElementById('app-viewport');
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    init() {
        this.handleRoute();
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const parts = hash.split('/').filter(Boolean);

        // Reset scroll position on route change
        window.scrollTo(0, 0);

        if (parts.length === 0 || parts[0] === '') {
            await this.renderHomeView();
        } else if (parts[0] === 'post' && parts[1]) {
            await this.renderPostDetailView(parts[1]);
        } else if (parts[0] === 'category' && parts[1]) {
            store.setActiveCategory(decodeURIComponent(parts[1]));
            await this.renderHomeView();
        } else if (parts[0] === 'author' && parts[1]) {
            await this.renderHomeView({ author: decodeURIComponent(parts[1]) });
        } else {
            await this.renderHomeView();
        }
    }

    // Home / Feed View
    async renderHomeView(options = {}) {
        const { activeCategory, searchQuery } = store.getState();
        const category = options.category || activeCategory;
        const author = options.author || null;

        this.viewport.innerHTML = `
            <div class="container">
                <!-- Hero Header -->
                <section class="hero-section">
                    <div class="hero-glow"></div>
                    <span class="hero-eyebrow">The Engineering & Systems Journal</span>
                    <h1 class="hero-title">Ideas, Architectures, and <span class="text-gradient">Modern Code</span></h1>
                    <p class="hero-subtitle">High-throughput architectures, generative systems, and fluid frontend craftsmanship from developers worldwide.</p>
                </section>

                <!-- Category Filtering -->
                <div class="filter-bar">
                    <div class="category-pills">
                        ${['All', 'Engineering', 'Design', 'AI', 'Architecture', 'DevOps', 'General'].map(cat => `
                            <button class="pill-btn ${cat === category ? 'active' : ''}" data-category="${cat}">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                    <div class="posts-count-indicator" id="posts-count-indicator">
                        Loading stories...
                    </div>
                </div>

                <!-- Feed Grid -->
                <div id="posts-grid" class="posts-grid">
                    <div class="loading-skeleton-grid">
                        <div class="skeleton-card"></div>
                        <div class="skeleton-card"></div>
                        <div class="skeleton-card"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            const data = await api.getPosts({
                category,
                search: searchQuery,
                author
            });

            store.setPosts(data.posts);
            const grid = document.getElementById('posts-grid');
            const countEl = document.getElementById('posts-count-indicator');

            if (countEl) {
                countEl.textContent = `${data.posts.length} ${data.posts.length === 1 ? 'article' : 'articles'} found`;
            }

            if (data.posts.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">✍️</div>
                        <h3>No articles found</h3>
                        <p>${searchQuery ? `No posts matched "${escapeHtml(searchQuery)}"` : 'No stories published in this category yet. Be the first to share one!'}</p>
                        <button class="btn btn-primary btn-sm" id="empty-state-write-btn">
                            Write First Article
                        </button>
                    </div>
                `;
                return;
            }

            grid.innerHTML = data.posts.map(post => renderPostCard(post)).join('');
        } catch (error) {
            console.error('Failed to load posts feed:', error);
            const grid = document.getElementById('posts-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">⚠️</div>
                        <h3>Unable to load posts</h3>
                        <p>${escapeHtml(error.message)}</p>
                        <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    // Single Post Detail View
    async renderPostDetailView(postId) {
        this.viewport.innerHTML = `
            <div class="container">
                <div class="post-detail-wrapper">
                    <a href="#/" class="back-link">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span>Back to all stories</span>
                    </a>

                    <div id="post-detail-content-area">
                        <div class="skeleton-card" style="height: 500px;"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            const data = await api.getPostById(postId);
            const post = data.post;
            store.setActivePost(post);

            const { currentUser } = store.getState();
            const isAuthor = currentUser && currentUser.id === post.author_id;

            const authorActionsHtml = isAuthor ? `
                <div class="post-detail-actions">
                    <button class="btn btn-secondary btn-sm btn-edit-post" data-id="${post.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-post" data-id="${post.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            ` : '';

            const coverHtml = post.cover_image 
                ? `<div class="post-detail-cover">
                     <img src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}">
                   </div>`
                : '';

            const authorAvatar = post.author_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(post.author_name)}`;

            const contentArea = document.getElementById('post-detail-content-area');
            contentArea.innerHTML = `
                <header class="post-detail-header">
                    <div class="post-detail-meta-top">
                        <span class="category-badge" data-cat="${escapeHtml(post.category)}">${escapeHtml(post.category)}</span>
                        <span class="post-card-readtime">• ${post.reading_time || 1} min read</span>
                        <span class="post-card-readtime">• Published ${formatDate(post.created_at)}</span>
                    </div>

                    <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>

                    <div class="post-detail-author-row">
                        <div class="author-detail-left">
                            <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(post.author_name)}" class="author-detail-avatar">
                            <div>
                                <div class="author-detail-name">${escapeHtml(post.author_name)}</div>
                                <div class="author-detail-bio">${escapeHtml(post.author_bio || 'Member of Chronicle Publication')}</div>
                            </div>
                        </div>
                        ${authorActionsHtml}
                    </div>
                </header>

                ${coverHtml}

                <article class="post-detail-content markdown-body">
                    ${renderMarkdown(post.content)}
                </article>

                <!-- Comments Section -->
                <section class="comments-section" id="comments-section">
                    <div class="comments-header">
                        <h2 class="comments-title">
                            Discussion 
                            <span class="comments-count-pill" id="comments-count-pill">${post.comments ? post.comments.length : 0}</span>
                        </h2>
                    </div>

                    <!-- Comment Input Box -->
                    ${currentUser ? `
                        <div class="comment-form-card">
                            <div class="comment-form-author">
                                <img src="${escapeHtml(currentUser.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + currentUser.username)}" class="comment-author-avatar">
                                <span style="font-size: 0.88rem; font-weight: 600;">Commenting as ${escapeHtml(currentUser.username)}</span>
                            </div>
                            <form id="add-comment-form">
                                <textarea id="comment-content-input" class="comment-form-textarea" placeholder="What are your thoughts on this architecture or approach? (Markdown supported)" required></textarea>
                                <div class="comment-form-footer">
                                    <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-comment">
                                        <span>Post Comment</span>
                                        <span class="btn-spinner hidden"></span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    ` : `
                        <div class="comment-auth-cta">
                            <p><strong>Join the discussion</strong></p>
                            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.2rem;">Sign in or create an account to share your feedback and join the conversation.</p>
                            <button class="btn btn-primary btn-sm" id="cta-login-btn">Sign In to Comment</button>
                        </div>
                    `}

                    <!-- Comments List -->
                    <div class="comments-list" id="comments-list">
                        ${post.comments && post.comments.length > 0 
                            ? post.comments.map(c => renderCommentCard(c)).join('')
                            : `<div class="empty-state" id="no-comments-msg" style="padding: 2.5rem 1rem;">
                                 <p style="margin: 0; color: var(--text-muted);">No comments yet. Start the conversation!</p>
                               </div>`
                        }
                    </div>
                </section>
            `;

            // Setup comment submission handler
            const commentForm = document.getElementById('add-comment-form');
            if (commentForm) {
                commentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const input = document.getElementById('comment-content-input');
                    const submitBtn = document.getElementById('btn-submit-comment');
                    const content = input.value.trim();
                    if (!content) return;

                    submitBtn.disabled = true;
                    submitBtn.querySelector('.btn-spinner').classList.remove('hidden');

                    try {
                        const res = await api.createComment(post.id, content);
                        input.value = '';
                        showToast('Comment posted!', 'success');

                        // Optimistically append comment
                        const list = document.getElementById('comments-list');
                        const noMsg = document.getElementById('no-comments-msg');
                        if (noMsg) noMsg.remove();

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = renderCommentCard(res.comment);
                        list.appendChild(tempDiv.firstElementChild);

                        // Update count
                        const countPill = document.getElementById('comments-count-pill');
                        if (countPill) {
                            countPill.textContent = Number(countPill.textContent) + 1;
                        }
                    } catch (err) {
                        showToast(err.message || 'Failed to post comment', 'error');
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.querySelector('.btn-spinner').classList.add('hidden');
                    }
                });
            }

            const ctaBtn = document.getElementById('cta-login-btn');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', () => {
                    const authModal = document.getElementById('auth-modal');
                    authModal.classList.remove('hidden');
                });
            }

        } catch (error) {
            console.error('Failed to load post detail:', error);
            const contentArea = document.getElementById('post-detail-content-area');
            if (contentArea) {
                contentArea.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <h3>Story not found</h3>
                        <p>${escapeHtml(error.message)}</p>
                        <a href="#/" class="btn btn-primary btn-sm">Return to Feed</a>
                    </div>
                `;
            }
        }
    }
}

export const router = new Router();
