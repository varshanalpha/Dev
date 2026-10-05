// ==========================================================================
// API Client Layer
// Centralized fetch calls, JWT attachment, and error serialization
// ==========================================================================

const API_BASE = '/api';

class ApiClient {
    constructor() {
        this.tokenKey = 'chronicle_jwt_token';
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        if (token) {
            localStorage.setItem(this.tokenKey, token);
        } else {
            localStorage.removeItem(this.tokenKey);
        }
    }

    clearToken() {
        localStorage.removeItem(this.tokenKey);
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = new Error(data.message || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
            throw error;
        }
    }

    // Auth endpoints
    async login(identifier, password) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        });
        if (res.token) {
            this.setToken(res.token);
        }
        return res;
    }

    async register(userData) {
        const res = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (res.token) {
            this.setToken(res.token);
        }
        return res;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async logout() {
        this.clearToken();
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch {
            // Ignore failure on logout endpoint
        }
    }

    // Posts endpoints
    async getPosts(params = {}) {
        const query = new URLSearchParams();
        if (params.search) query.append('search', params.search);
        if (params.category && params.category !== 'All') query.append('category', params.category);
        if (params.author) query.append('author', params.author);
        
        const qs = query.toString() ? `?${query.toString()}` : '';
        return this.request(`/posts${qs}`);
    }

    async getPostById(id) {
        return this.request(`/posts/${id}`);
    }

    async createPost(postData) {
        return this.request('/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    }

    async updatePost(id, postData) {
        return this.request(`/posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });
    }

    async deletePost(id) {
        return this.request(`/posts/${id}`, {
            method: 'DELETE'
        });
    }

    // Comments endpoints
    async getComments(postId) {
        return this.request(`/posts/${postId}/comments`);
    }

    async createComment(postId, content) {
        return this.request(`/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async deleteComment(commentId) {
        return this.request(`/comments/${commentId}`, {
            method: 'DELETE'
        });
    }
}

export const api = new ApiClient();
