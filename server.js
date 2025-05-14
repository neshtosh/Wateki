const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { firestoreHelper } = require('./firebase-config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Session configuration
app.use(cookieParser());
app.use(session({
    secret: 'your-super-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // In a real application, you would validate against a database
    // For demo purposes, we're using hardcoded credentials
    if (username === 'admin' && password === 'admin123') {
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    res.json({ isAuthenticated: req.session.isAuthenticated || false });
});

// Protect admin routes
app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-message.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-message.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send initial posts to the new client
    firestoreHelper.getPosts().then(posts => {
        console.log('Sending initial posts to client:', posts);
    ws.send(JSON.stringify({
        type: 'posts_updated',
            posts: posts
    }));
    });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);

            switch (data.type) {
                case 'get_comments':
                    console.log('Fetching comments for post:', data.postId);
                    const comments = await firestoreHelper.getComments(data.postId);
                    console.log('Retrieved comments:', comments);
                    ws.send(JSON.stringify({
                        type: 'comments',
                        postId: data.postId,
                        comments: comments
                    }));
                    break;

                case 'new_comment':
                    console.log('Adding new comment:', data);
                    const newComment = {
                        author: data.author,
                        content: data.content,
                        date: new Date().toISOString(),
                        parentId: data.parentId || null
                    };
                    const savedComment = await firestoreHelper.addComment(data.postId, newComment);
                    console.log('Successfully saved comment:', savedComment);
                    const updatedComments = await firestoreHelper.getComments(data.postId);
                    // Broadcast the new comment to all clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'new_comment',
                                postId: data.postId,
                                comments: updatedComments
                            }));
                        }
                    });
                    break;

                case 'save_post':
                    console.log('Saving post:', data.post);
                    const postData = {
                        ...data.post,
                        date: new Date().toISOString()
                    };
                    let savedPost;
                    if (data.post.id) {
                        savedPost = await firestoreHelper.updatePost(data.post.id, postData);
                        console.log('Successfully updated post:', savedPost);
                    } else {
                        savedPost = await firestoreHelper.createPost(postData);
                        console.log('Successfully created post:', savedPost);
                    }
                    const updatedPosts = await firestoreHelper.getPosts();
                    // Broadcast the updated posts to all clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'posts_updated',
                                posts: updatedPosts
                            }));
                        }
                    });
                    break;
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    ws.on('error', function(error) {
        console.error('WebSocket error:', error);
    });

    ws.on('close', function() {
        console.log('Client disconnected');
    });
});

// API endpoints
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await firestoreHelper.getPosts();
        res.json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await firestoreHelper.getPost(req.params.id);
    if (post) {
        res.json(post);
    } else {
        res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error getting post:', error);
        res.status(500).json({ error: 'Failed to get post' });
    }
});

app.get('/api/posts/:id/comments', async (req, res) => {
    try {
        const comments = await firestoreHelper.getComments(req.params.id);
    res.json(comments);
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

app.delete('/api/posts/:postId/comments/:commentId', requireAuth, async (req, res) => {
    try {
    const { postId, commentId } = req.params;
        await firestoreHelper.deleteComment(postId, commentId);
        const updatedComments = await firestoreHelper.getComments(postId);
    // Broadcast the updated comments to all clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'comments',
                postId: postId,
                    comments: updatedComments
            }));
        }
    });
    res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

app.post('/api/posts', requireAuth, async (req, res) => {
    try {
        console.log('Creating new post with data:', req.body);
        const postData = {
            ...req.body,
            date: new Date().toISOString()
        };
        const newPost = await firestoreHelper.createPost(postData);
        console.log('Successfully created post:', newPost);
        const updatedPosts = await firestoreHelper.getPosts();
        // Broadcast the update to all WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'posts_updated',
                    posts: updatedPosts
                }));
            }
        });
        res.json(newPost);
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ error: 'Failed to save post' });
    }
});

app.put('/api/posts/:id', requireAuth, async (req, res) => {
    try {
    const postId = req.params.id;
        const postData = {
            ...req.body,
            date: new Date().toISOString()
        };
        await firestoreHelper.updatePost(postId, postData);
        const updatedPosts = await firestoreHelper.getPosts();
        // Broadcast the update to all WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'posts_updated',
                    posts: updatedPosts
                }));
            }
        });
        res.json({ id: postId, ...postData });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
        const messageData = {
        name,
        email,
        subject,
        message,
        date: new Date().toISOString()
    };
        await firestoreHelper.addMessage(messageData);
    res.json({ success: true });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

app.get('/api/contact', async (req, res) => {
    try {
        const messages = await firestoreHelper.getMessages();
        res.json(messages);
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

app.get('/api/contact/:id', async (req, res) => {
    try {
        const message = await firestoreHelper.getMessage(req.params.id);
        if (message) {
            res.json(message);
    } else {
        res.status(404).json({ error: 'Message not found' });
        }
    } catch (error) {
        console.error('Error getting message:', error);
        res.status(500).json({ error: 'Failed to get message' });
    }
});

// Delete a post by ID
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        await firestoreHelper.deletePost(postId);
        const updatedPosts = await firestoreHelper.getPosts();
        // Broadcast the update to all WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'posts_updated',
                    posts: updatedPosts
                }));
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Search posts by title or content
app.get('/api/posts/search', async (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase();
        if (!q) return res.json({});
        const posts = await firestoreHelper.getPosts();
        const filtered = Object.values(posts).filter(post =>
            (post.title && post.title.toLowerCase().includes(q)) ||
            (post.content && post.content.toLowerCase().includes(q))
        );
        // Return as an object with id as key (like getPosts)
        const result = {};
        filtered.forEach(post => { result[post.id] = post; });
        res.json(result);
    } catch (error) {
        console.error('Error searching posts:', error);
        res.status(500).json({ error: 'Failed to search posts' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
}); 