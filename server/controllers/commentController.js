const { queryAll, queryOne, execute } = require('../config/db');

// GET /api/posts/:postId/comments - Get all comments for a post
exports.getCommentsByPost = async (req, res, next) => {
    try {
        const { postId } = req.params;

        const postExists = queryOne('SELECT id FROM posts WHERE id = ?', [postId]);
        if (!postExists) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

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
            [postId]
        );

        return res.status(200).json({
            success: true,
            count: comments.length,
            comments
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/posts/:postId/comments - Add a new comment (Authenticated)
exports.createComment = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment content cannot be empty.'
            });
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Comment is too long (maximum 2,000 characters).'
            });
        }

        const post = queryOne('SELECT id FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        const result = execute(
            `INSERT INTO comments (post_id, author_id, content)
             VALUES (?, ?, ?)`,
            [postId, req.user.id, trimmedContent]
        );

        const newComment = queryOne(
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
            WHERE c.id = ?`,
            [result.lastInsertRowid]
        );

        return res.status(201).json({
            success: true,
            message: 'Comment added successfully!',
            comment: newComment
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/comments/:id - Delete comment (Commenter only, or post author)
exports.deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const comment = queryOne(
            `SELECT c.*, p.author_id AS post_author_id 
             FROM comments c
             JOIN posts p ON c.post_id = p.id
             WHERE c.id = ?`,
            [id]
        );

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found.'
            });
        }

        // Author check: User must be comment creator OR the post author
        const isCommentAuthor = comment.author_id === req.user.id;
        const isPostAuthor = comment.post_author_id === req.user.id;

        if (!isCommentAuthor && !isPostAuthor) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. You can only delete your own comments.'
            });
        }

        execute('DELETE FROM comments WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: 'Comment deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
