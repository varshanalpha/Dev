const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Posts routes
router.get('/', postController.getAllPosts);
router.get('/:id', optionalAuth, postController.getPostById);
router.post('/', requireAuth, postController.createPost);
router.put('/:id', requireAuth, postController.updatePost);
router.delete('/:id', requireAuth, postController.deletePost);

// Nested comment routes on posts
router.get('/:postId/comments', commentController.getCommentsByPost);
router.post('/:postId/comments', requireAuth, commentController.createComment);

module.exports = router;
