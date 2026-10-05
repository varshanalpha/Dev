// ==========================================================================
// UI Rendering Engine & Helper Utilities
// ==========================================================================

import { store } from './state.js';

// Safe HTML Escape
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format relative date or calendar date
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Lightweight, safe Markdown to HTML parser
export function renderMarkdown(content) {
    if (!content) return '';

    let html = escapeHtml(content);

    // Code blocks ```code```
    html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bold and Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraphs (double line breaks)
    const paragraphs = html.split(/\n\s*\n/);
    return paragraphs
        .map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<ul')) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
}

// Toast Notifications
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-text">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastExit 0.25s forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
    }, duration);
}

// Confirmation Modal Dialog
let confirmResolve = null;

export function confirmModal(title, message, confirmBtnText = 'Delete', isDanger = true) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-action-btn');

        titleEl.textContent = title;
        msgEl.textContent = message;
        actionBtn.querySelector('span:first-child').textContent = confirmBtnText;

        if (isDanger) {
            actionBtn.className = 'btn btn-danger';
        } else {
            actionBtn.className = 'btn btn-primary';
        }

        modal.classList.remove('hidden');
    });
}

export function handleConfirmResponse(confirmed) {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('hidden');
    if (confirmResolve) {
        confirmResolve(confirmed);
        confirmResolve = null;
    }
}

// Render Navigation Auth Elements
export function renderNavAuth() {
    const container = document.getElementById('auth-nav-container');
    const { currentUser } = store.getState();

    if (currentUser) {
        container.innerHTML = `
            <button id="btn-open-create-post" class="btn btn-primary btn-sm" title="Write a new article">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Write Story</span>
            </button>
            <div class="user-nav-profile" title="Signed in as ${escapeHtml(currentUser.username)}">
                <img src="${escapeHtml(currentUser.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + currentUser.username)}" 
                     alt="${escapeHtml(currentUser.username)}" 
                     class="nav-user-avatar">
                <span class="nav-user-name">${escapeHtml(currentUser.username)}</span>
            </div>
            <button id="btn-logout" class="btn btn-ghost btn-sm" title="Sign out of account">
                Sign Out
            </button>
        `;
    } else {
        container.innerHTML = `
            <button id="btn-open-login" class="btn btn-ghost btn-sm">
                Sign In
            </button>
            <button id="btn-open-register" class="btn btn-primary btn-sm">
                Get Started
            </button>
        `;
    }
}

// Render Post Card HTML
export function renderPostCard(post) {
    const { currentUser } = store.getState();
    const isAuthor = currentUser && currentUser.id === post.author_id;

    const coverHtml = post.cover_image 
        ? `<a href="#/post/${post.id}" class="post-card-cover-link">
             <img src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}" class="post-card-img" loading="lazy">
           </a>`
        : '';

    const authorAvatar = post.author_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(post.author_name)}`;

    const authorActionsHtml = isAuthor ? `
        <div class="author-quick-actions">
            <button class="btn btn-ghost btn-sm btn-edit-post" data-id="${post.id}" title="Edit this post">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-delete-post" data-id="${post.id}" title="Delete this post">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    ` : '';

    return `
        <article class="post-card" data-post-id="${post.id}">
            ${coverHtml}
            <div class="post-card-body">
                <div class="post-card-meta">
                    <span class="category-badge" data-cat="${escapeHtml(post.category)}">${escapeHtml(post.category)}</span>
                    <span class="post-card-readtime">${post.reading_time || 1} min read</span>
                </div>
                
                <h3 class="post-card-title">
                    <a href="#/post/${post.id}">${escapeHtml(post.title)}</a>
                </h3>

                <p class="post-card-excerpt">
                    ${escapeHtml(post.excerpt || '')}
                </p>

                <div class="post-card-footer">
                    <a href="#/author/${encodeURIComponent(post.author_name)}" class="post-author-link">
                        <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(post.author_name)}" class="post-author-avatar">
                        <div class="post-author-info">
                            <span class="post-author-name">${escapeHtml(post.author_name)}</span>
                            <span class="post-date">${formatDate(post.created_at)}</span>
                        </div>
                    </a>

                    <div class="post-metrics">
                        <span class="metric-item" title="${post.comment_count} comments">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            ${post.comment_count}
                        </span>
                        ${authorActionsHtml}
                    </div>
                </div>
            </div>
        </article>
    `;
}

// Render Single Comment Card HTML
export function renderCommentCard(comment) {
    const { currentUser } = store.getState();
    const isCommentAuthor = currentUser && currentUser.id === comment.author_id;

    const authorAvatar = comment.author_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(comment.author_name)}`;

    const deleteBtnHtml = isCommentAuthor ? `
        <button class="comment-delete-btn btn-delete-comment" data-id="${comment.id}" title="Delete comment">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
        </button>
    ` : '';

    return `
        <div class="comment-card" id="comment-${comment.id}">
            <div class="comment-header">
                <div class="comment-author-meta">
                    <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(comment.author_name)}" class="comment-author-avatar">
                    <div>
                        <span class="comment-user-name">${escapeHtml(comment.author_name)}</span>
                        <span class="comment-time"> • ${formatDate(comment.created_at)}</span>
                    </div>
                </div>
                ${deleteBtnHtml}
            </div>
            <div class="comment-body">${escapeHtml(comment.content)}</div>
        </div>
    `;
}
