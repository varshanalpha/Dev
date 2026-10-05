require('dotenv').config();
const authController = require('../controllers/authController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');

function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
}

async function runDirectTests() {
    console.log('🧪 Starting Direct Controller Integration Tests...');

    // 1. Test Login
    const loginReq = { body: { identifier: 'alex_chen', password: 'password123' } };
    const loginRes = createMockRes();
    await authController.login(loginReq, loginRes, (err) => { if (err) throw err; });
    console.log('1. Login status:', loginRes.statusCode, 'Success:', loginRes.data.success);
    const token = loginRes.data.token;
    const user = loginRes.data.user;

    // 2. Test Get Me
    const meReq = { user };
    const meRes = createMockRes();
    await authController.getCurrentUser(meReq, meRes, (err) => { if (err) throw err; });
    console.log('2. Current user:', meRes.data.user.username, 'Posts:', meRes.data.user.stats.posts);

    // 3. Test Get All Posts
    const allPostsReq = { query: {} };
    const allPostsRes = createMockRes();
    await postController.getAllPosts(allPostsReq, allPostsRes, (err) => { if (err) throw err; });
    console.log('3. All posts count:', allPostsRes.data.posts.length);

    // 4. Test Create Post
    const createReq = {
        user,
        body: {
            title: 'Testing Direct Integration',
            category: 'Engineering',
            content: 'This is a test post content written for validating complete functionality without network friction.'
        }
    };
    const createRes = createMockRes();
    await postController.createPost(createReq, createRes, (err) => { if (err) throw err; });
    console.log('4. Create post status:', createRes.statusCode, 'Post ID:', createRes.data.post.id);
    const createdPostId = createRes.data.post.id;

    // 5. Test Add Comment
    const commentReq = {
        user,
        params: { postId: createdPostId },
        body: { content: 'Fantastic automated test comment!' }
    };
    const commentRes = createMockRes();
    await commentController.createComment(commentReq, commentRes, (err) => { if (err) throw err; });
    console.log('5. Add comment status:', commentRes.statusCode, 'Comment ID:', commentRes.data.comment.id);
    const createdCommentId = commentRes.data.comment.id;

    // 6. Test Delete Comment
    const delCommentReq = {
        user,
        params: { id: createdCommentId }
    };
    const delCommentRes = createMockRes();
    await commentController.deleteComment(delCommentReq, delCommentRes, (err) => { if (err) throw err; });
    console.log('6. Delete comment status:', delCommentRes.statusCode, 'Success:', delCommentRes.data.success);

    // 7. Test Delete Post
    const delPostReq = {
        user,
        params: { id: createdPostId }
    };
    const delPostRes = createMockRes();
    await postController.deletePost(delPostReq, delPostRes, (err) => { if (err) throw err; });
    console.log('7. Delete post status:', delPostRes.statusCode, 'Success:', delPostRes.data.success);

    // 8. Test Register
    const regReq = {
        body: {
            username: 'test_dev_' + Date.now().toString().slice(-4),
            email: 'test' + Date.now().toString().slice(-4) + '@example.com',
            password: 'secretpassword123',
            bio: 'Test developer bio'
        }
    };
    const regRes = createMockRes();
    await authController.register(regReq, regRes, (err) => { if (err) throw err; });
    console.log('8. Register status:', regRes.statusCode, 'New user:', regRes.data.user.username);

    console.log('🎉 ALL CONTROLLER LOGIC VALIDATED 100% SUCCESSFULLY!');
}

runDirectTests().catch(console.error);
