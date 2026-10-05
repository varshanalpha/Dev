const { queryAll, queryOne, execute } = require('../config/db');

// Helper to generate a clean URL slug
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
}

// Calculate estimated reading time in minutes
function calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// GET /api/posts - Get all posts with author and comment metrics
exports.getAllPosts = async (req, res, next) => {
    try {
        const { search, category, author, limit = 50, offset = 0 } = req.query;

        let sql = `
            SELECT 
                p.id,
                p.title,
                p.slug,
                p.content,
                p.excerpt,
                p.category,
                p.cover_image,
                p.reading_time,
                p.author_id,
                p.created_at,
                p.updated_at,
                u.username AS author_name,
                u.avatar_url AS author_avatar,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (search) {
            sql += ` AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)`;
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (category && category !== 'All') {
            sql += ` AND p.category = ?`;
            params.push(category);
        }

        if (author) {
            sql += ` AND (u.username = ? OR p.author_id = ?)`;
            params.push(author, author);
        }

        sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        const posts = queryAll(sql, params);

        return res.status(200).json({
            success: true,
            count: posts.length,
            posts
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/posts/:id - Get single post by ID or Slug
exports.getPostById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Try searching by numeric ID or by unique slug
        const isNumeric = /^\d+$/.test(id);
        const sql = `
            SELECT 
                p.id,
                p.title,
                p.slug,
                p.content,
                p.excerpt,
                p.category,
                p.cover_image,
                p.reading_time,
                p.author_id,
                p.created_at,
                p.updated_at,
                u.username AS author_name,
                u.avatar_url AS author_avatar,
                u.bio AS author_bio,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}
        `;

        const post = queryOne(sql, [isNumeric ? Number(id) : id]);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        // Fetch associated comments with author details
        const comments = queryAll(
            `SELECT 
                c.id,
                c.post_id,
                c.content,
                c.created_at,
                c.author_id,
                u.username AS author_name,
                u.avatar_url AS author_avatar
            FROM comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC`,
            [post.id]
        );

        return res.status(200).json({
            success: true,
            post: {
                ...post,
                comments
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/posts - Create a new post
exports.createPost = async (req, res, next) => {
    try {
        const { title, content, category, cover_image, excerpt } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post title is required.'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post content is required.'
            });
        }

        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();

        // Create base slug
        let baseSlug = slugify(trimmedTitle);
        if (!baseSlug) baseSlug = 'post';

        // Ensure unique slug
        let slug = baseSlug;
        let counter = 1;
        while (queryOne('SELECT id FROM posts WHERE slug = ?', [slug])) {
            slug = `${baseSlug}-${Date.now().toString().slice(-4)}-${counter}`;
            counter++;
        }

        // Generate excerpt if not provided
        const finalExcerpt = excerpt && excerpt.trim()
            ? excerpt.trim()
            : trimmedContent.replace(/[#*`>]/g, '').slice(0, 160) + (trimmedContent.length > 160 ? '...' : '');

        const readingTime = calculateReadingTime(trimmedContent);
        const postCategory = (category && category.trim()) || 'General';
        const cover = (cover_image && cover_image.trim()) || '';

        const result = execute(
            `INSERT INTO posts (title, slug, content, excerpt, category, cover_image, reading_time, author_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [trimmedTitle, slug, trimmedContent, finalExcerpt, postCategory, cover, readingTime, req.user.id]
        );

        const newPost = queryOne(
            `SELECT p.*, u.username as author_name, u.avatar_url as author_avatar
             FROM posts p
             JOIN users u ON p.author_id = u.id
             WHERE p.id = ?`,
            [result.lastInsertRowid]
        );

        return res.status(201).json({
            success: true,
            message: 'Post created successfully!',
            post: newPost
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/posts/:id - Update an existing post (Author only)
exports.updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, category, cover_image, excerpt } = req.body;

        const existingPost = queryOne('SELECT * FROM posts WHERE id = ?', [id]);
        if (!existingPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        // Author check
        if (existingPost.author_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. You can only edit your own posts.'
            });
        }

        const updatedTitle = title !== undefined ? title.trim() : existingPost.title;
        const updatedContent = content !== undefined ? content.trim() : existingPost.content;

        if (!updatedTitle) {
            return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
        }
        if (!updatedContent) {
            return res.status(400).json({ success: false, message: 'Content cannot be empty.' });
        }

        const updatedExcerpt = excerpt !== undefined
            ? excerpt.trim()
            : existingPost.excerpt;

        const updatedCategory = category !== undefined ? category.trim() : existingPost.category;
        const updatedCover = cover_image !== undefined ? cover_image.trim() : existingPost.cover_image;
        const readingTime = calculateReadingTime(updatedContent);

        execute(
            `UPDATE posts 
             SET title = ?, content = ?, excerpt = ?, category = ?, cover_image = ?, reading_time = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [updatedTitle, updatedContent, updatedExcerpt, updatedCategory, updatedCover, readingTime, id]
        );

        const updatedPost = queryOne(
            `SELECT p.*, u.username as author_name, u.avatar_url as author_avatar
             FROM posts p
             JOIN users u ON p.author_id = u.id
             WHERE p.id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Post updated successfully!',
            post: updatedPost
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/posts/:id - Delete a post (Author only)
exports.deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existingPost = queryOne('SELECT * FROM posts WHERE id = ?', [id]);
        if (!existingPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        // Author check
        if (existingPost.author_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. You can only delete your own posts.'
            });
        }

        // Delete post (comments cascade delete automatically due to SQLite FK constraint)
        execute('DELETE FROM posts WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: 'Post deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
