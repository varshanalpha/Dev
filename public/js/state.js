// ==========================================================================
// Application State Management
// ==========================================================================

class StateStore {
    constructor() {
        this.state = {
            currentUser: null,
            posts: [],
            activeCategory: 'All',
            searchQuery: '',
            activePost: null,
            theme: localStorage.getItem('chronicle_theme') || 'dark'
        };
        this.listeners = new Set();
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(changedKeys) {
        for (const listener of this.listeners) {
            listener(this.state, changedKeys);
        }
    }

    setCurrentUser(user) {
        this.state.currentUser = user;
        this.notify(['currentUser']);
    }

    setPosts(posts) {
        this.state.posts = posts;
        this.notify(['posts']);
    }

    setActiveCategory(category) {
        this.state.activeCategory = category;
        this.notify(['activeCategory']);
    }

    setSearchQuery(query) {
        this.state.searchQuery = query;
        this.notify(['searchQuery']);
    }

    setActivePost(post) {
        this.state.activePost = post;
        this.notify(['activePost']);
    }

    setTheme(theme) {
        this.state.theme = theme;
        localStorage.setItem('chronicle_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        this.notify(['theme']);
    }

    isAuthenticated() {
        return !!this.state.currentUser;
    }
}

export const store = new StateStore();
