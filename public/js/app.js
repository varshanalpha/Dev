// ==========================================================================
// Main Application Coordinator
// Event listeners, Modals, Forms, Themes, and Lifecycle
// ==========================================================================

import { store } from './state.js';
import { api } from './api.js';
import { router } from './router.js';
import { 
    renderNavAuth, 
    showToast, 
    confirmModal, 
    handleConfirmResponse, 
    renderMarkdown 
} from './ui.js';

// Cover Image Presets for rapid authoring
const COVER_PRESETS = {
    tech: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&h=600&q=80',
    design: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&h=600&q=80',
    ai: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=600&q=80',
    code: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&h=600&q=80'
};

// Initialize Application
async function initApp() {
    // 1. Initialize Theme
    const savedTheme = localStorage.getItem('chronicle_theme') || 'dark';
    store.setTheme(savedTheme);

    // 2. Validate current auth session
    if (api.getToken()) {
        try {
            const meRes = await api.getMe();
            store.setCurrentUser(meRes.user);
        } catch {
            api.clearToken();
            store.setCurrentUser(null);
        }
    } else {
        store.setCurrentUser(null);
    }

    renderNavAuth();

    // 3. React to state changes
    store.subscribe((state, changedKeys) => {
        if (changedKeys.includes('currentUser')) {
            renderNavAuth();
        }
    });

    // 4. Register Event Listeners
    setupNavListeners();
    setupAuthModalListeners();
    setupEditorModalListeners();
    setupGlobalClickDelegation();
    setupSearchListeners();
    setupReadingProgressBar();

    // 5. Initialize Router
    router.init();
}

// Reading Progress Bar
function setupReadingProgressBar() {
    const bar = document.getElementById('reading-progress-bar');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (bar) bar.style.width = `${progress}%`;
    }, { passive: true });
}

// Theme Switcher & Nav
function setupNavListeners() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = store.getState().theme;
            const next = current === 'dark' ? 'light' : 'dark';
            store.setTheme(next);
        });
    }

    // Delegated click for dynamic nav elements
    const authNav = document.getElementById('auth-nav-container');
    authNav.addEventListener('click', (e) => {
        const openLogin = e.target.closest('#btn-open-login');
        const openRegister = e.target.closest('#btn-open-register');
        const openCreate = e.target.closest('#btn-open-create-post');
        const logoutBtn = e.target.closest('#btn-logout');

        if (openLogin) openAuthModal('login');
        if (openRegister) openAuthModal('register');
        if (openCreate) openEditorModal();
        if (logoutBtn) handleLogout();
    });
}

// Global delegated clicks for category pills, post editing, deletion
function setupGlobalClickDelegation() {
    document.addEventListener('click', async (e) => {
        // Category pill click
        const pill = e.target.closest('.pill-btn');
        if (pill) {
            const category = pill.getAttribute('data-category');
            store.setActiveCategory(category);
            document.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            router.renderHomeView({ category });
            return;
        }

        // Empty state write article
        const emptyWriteBtn = e.target.closest('#empty-state-write-btn');
        if (emptyWriteBtn) {
            if (!store.isAuthenticated()) {
                openAuthModal('login');
            } else {
                openEditorModal();
            }
            return;
        }

        // Edit Post Button
        const editPostBtn = e.target.closest('.btn-edit-post');
        if (editPostBtn) {
            const postId = editPostBtn.getAttribute('data-id');
            await handleOpenEditPost(postId);
            return;
        }

        // Delete Post Button
        const deletePostBtn = e.target.closest('.btn-delete-post');
        if (deletePostBtn) {
            const postId = deletePostBtn.getAttribute('data-id');
            await handleDeletePost(postId);
            return;
        }

        // Delete Comment Button
        const deleteCommentBtn = e.target.closest('.btn-delete-comment');
        if (deleteCommentBtn) {
            const commentId = deleteCommentBtn.getAttribute('data-id');
            await handleDeleteComment(commentId);
            return;
        }

        // Confirmation modal buttons
        const confirmCancel = e.target.closest('#confirm-cancel-btn');
        const confirmAction = e.target.closest('#confirm-action-btn');
        if (confirmCancel) handleConfirmResponse(false);
        if (confirmAction) handleConfirmResponse(true);

        // Footer quick demo logins
        const footerDemo = e.target.closest('.footer-demo-btn');
        if (footerDemo) {
            const email = footerDemo.getAttribute('data-email');
            await handleDirectLogin(email, 'password123');
        }
    });
}

// Search debounce
function setupSearchListeners() {
    const searchInput = document.getElementById('global-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    let debounceTimer = null;

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            store.setSearchQuery(val);
            if (window.location.hash !== '#/' && !window.location.hash.startsWith('#/category')) {
                window.location.hash = '#/';
            } else {
                router.renderHomeView();
            }
        }, 300);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        store.setSearchQuery('');
        router.renderHomeView();
    });
}

// Auth Modal
function openAuthModal(initialTab = 'login') {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');
    switchAuthTab(initialTab);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('hidden');
}

function switchAuthTab(tab) {
    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error-msg');
    const regError = document.getElementById('register-error-msg');

    loginError.classList.add('hidden');
    regError.classList.add('hidden');

    if (tab === 'login') {
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
    } else {
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function setupAuthModalListeners() {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-modal-close');
    const loginTabBtn = document.getElementById('tab-login-btn');
    const regTabBtn = document.getElementById('tab-register-btn');

    closeBtn.addEventListener('click', closeAuthModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
    });

    loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    regTabBtn.addEventListener('click', () => switchAuthTab('register'));

    // Demo chip autofill
    document.querySelectorAll('.demo-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const username = chip.getAttribute('data-fill');
            document.getElementById('login-identifier').value = username;
            document.getElementById('login-password').value = 'password123';
        });
    });

    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error-msg');
        const submitBtn = document.getElementById('login-submit-btn');

        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-spinner').classList.remove('hidden');

        try {
            const data = await api.login(identifier, password);
            store.setCurrentUser(data.user);
            showToast(`Welcome back, ${data.user.username}!`, 'success');
            closeAuthModal();
            router.handleRoute(); // Refresh current view with updated auth state
        } catch (err) {
            errorEl.textContent = err.message || 'Login failed. Please check credentials.';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-spinner').classList.add('hidden');
        }
    });

    // Register Form Submit
    const regForm = document.getElementById('register-form');
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const bio = document.getElementById('reg-bio').value.trim();
        const errorEl = document.getElementById('register-error-msg');
        const submitBtn = document.getElementById('register-submit-btn');

        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-spinner').classList.remove('hidden');

        try {
            const data = await api.register({ username, email, password, bio });
            store.setCurrentUser(data.user);
            showToast(`Account created! Welcome, ${data.user.username}!`, 'success');
            closeAuthModal();
            router.handleRoute();
        } catch (err) {
            errorEl.textContent = err.message || 'Registration failed.';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-spinner').classList.add('hidden');
        }
    });
}

async function handleDirectLogin(identifier, password) {
    try {
        const data = await api.login(identifier, password);
        store.setCurrentUser(data.user);
        showToast(`Signed in as ${data.user.username}`, 'success');
        router.handleRoute();
    } catch (err) {
        showToast(err.message || 'Login failed', 'error');
    }
}

async function handleLogout() {
    await api.logout();
    store.setCurrentUser(null);
    showToast('Signed out successfully.', 'info');
    router.handleRoute();
}

// Post Editor Modal (Create & Edit)
function openEditorModal(post = null) {
    if (!store.isAuthenticated()) {
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('editor-modal');
    const modalTitle = document.getElementById('editor-modal-title');
    const submitText = document.getElementById('editor-submit-text');
    const idInput = document.getElementById('editor-post-id');
    const titleInput = document.getElementById('editor-title');
    const catInput = document.getElementById('editor-category');
    const coverInput = document.getElementById('editor-cover');
    const excerptInput = document.getElementById('editor-excerpt');
    const contentInput = document.getElementById('editor-content');
    const errorEl = document.getElementById('editor-error-msg');

    errorEl.classList.add('hidden');
    switchEditorMode('edit');

    if (post) {
        modalTitle.textContent = 'Edit Article';
        submitText.textContent = 'Save Changes';
        idInput.value = post.id;
        titleInput.value = post.title || '';
        catInput.value = post.category || 'Engineering';
        coverInput.value = post.cover_image || '';
        excerptInput.value = post.excerpt || '';
        contentInput.value = post.content || '';
    } else {
        modalTitle.textContent = 'Write New Story';
        submitText.textContent = 'Publish Article';
        idInput.value = '';
        titleInput.value = '';
        catInput.value = 'Engineering';
        coverInput.value = '';
        excerptInput.value = '';
        contentInput.value = '';
    }

    modal.classList.remove('hidden');
}

function closeEditorModal() {
    const modal = document.getElementById('editor-modal');
    modal.classList.add('hidden');
}

function switchEditorMode(mode) {
    const btnEdit = document.getElementById('btn-edit-mode');
    const btnPrev = document.getElementById('btn-preview-mode');
    const textarea = document.getElementById('editor-content');
    const preview = document.getElementById('editor-preview-container');

    if (mode === 'edit') {
        btnEdit.classList.add('active');
        btnPrev.classList.remove('active');
        textarea.classList.remove('hidden');
        preview.classList.add('hidden');
    } else {
        btnPrev.classList.add('active');
        btnEdit.classList.remove('active');
        preview.innerHTML = renderMarkdown(textarea.value);
        textarea.classList.add('hidden');
        preview.classList.remove('hidden');
    }
}

function setupEditorModalListeners() {
    const modal = document.getElementById('editor-modal');
    const closeBtn = document.getElementById('editor-modal-close');
    const cancelBtn = document.getElementById('editor-cancel-btn');
    const form = document.getElementById('post-editor-form');

    closeBtn.addEventListener('click', closeEditorModal);
    cancelBtn.addEventListener('click', closeEditorModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditorModal();
    });

    // Preset cover buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-preset');
            const url = COVER_PRESETS[key];
            if (url) {
                document.getElementById('editor-cover').value = url;
            }
        });
    });

    // Markdown view toggle
    document.getElementById('btn-edit-mode').addEventListener('click', () => switchEditorMode('edit'));
    document.getElementById('btn-preview-mode').addEventListener('click', () => switchEditorMode('preview'));

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editor-post-id').value;
        const title = document.getElementById('editor-title').value.trim();
        const category = document.getElementById('editor-category').value;
        const cover_image = document.getElementById('editor-cover').value.trim();
        const excerpt = document.getElementById('editor-excerpt').value.trim();
        const content = document.getElementById('editor-content').value.trim();
        const errorEl = document.getElementById('editor-error-msg');
        const submitBtn = document.getElementById('editor-submit-btn');

        if (!title || !content) {
            errorEl.textContent = 'Title and content are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-spinner').classList.remove('hidden');

        try {
            if (id) {
                // Update
                const res = await api.updatePost(id, { title, category, cover_image, excerpt, content });
                showToast('Article updated successfully!', 'success');
                closeEditorModal();
                window.location.hash = `#/post/${res.post.id}`;
                router.renderPostDetailView(res.post.id);
            } else {
                // Create
                const res = await api.createPost({ title, category, cover_image, excerpt, content });
                showToast('Article published successfully!', 'success');
                closeEditorModal();
                window.location.hash = `#/post/${res.post.id}`;
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Failed to save post.';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-spinner').classList.add('hidden');
        }
    });
}

async function handleOpenEditPost(postId) {
    try {
        const data = await api.getPostById(postId);
        openEditorModal(data.post);
    } catch (err) {
        showToast(err.message || 'Unable to open post for editing', 'error');
    }
}

async function handleDeletePost(postId) {
    const confirmed = await confirmModal(
        'Delete this article?',
        'Are you sure you want to permanently delete this post and all of its comments? This action cannot be reversed.',
        'Delete Forever',
        true
    );

    if (!confirmed) return;

    try {
        await api.deletePost(postId);
        showToast('Article deleted successfully.', 'success');
        
        // If viewing deleted post, redirect to home
        if (window.location.hash.includes(`/post/${postId}`)) {
            window.location.hash = '#/';
        } else {
            router.renderHomeView();
        }
    } catch (err) {
        showToast(err.message || 'Failed to delete post.', 'error');
    }
}

async function handleDeleteComment(commentId) {
    const confirmed = await confirmModal(
        'Delete this comment?',
        'Are you sure you want to remove your comment from this discussion?',
        'Delete',
        true
    );

    if (!confirmed) return;

    try {
        await api.deleteComment(commentId);
        showToast('Comment deleted.', 'success');

        const commentEl = document.getElementById(`comment-${commentId}`);
        if (commentEl) {
            commentEl.remove();
        }

        const countPill = document.getElementById('comments-count-pill');
        if (countPill) {
            countPill.textContent = Math.max(0, Number(countPill.textContent) - 1);
        }
    } catch (err) {
        showToast(err.message || 'Failed to delete comment.', 'error');
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
