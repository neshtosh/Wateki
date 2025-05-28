const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper functions for Firestore operations
const firestoreHelper = {
    // Blog Posts
    async getPosts() {
        const snapshot = await db.collection('posts').get();
        const posts = {};
        snapshot.forEach(doc => {
            posts[doc.id] = { id: doc.id, ...doc.data() };
        });
        return posts;
    },

    async getPost(id) {
        const doc = await db.collection('posts').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async createPost(postData) {
        const docRef = await db.collection('posts').add(postData);
        return { id: docRef.id, ...postData };
    },

    async updatePost(id, postData) {
        await db.collection('posts').doc(id).update(postData);
        return { id, ...postData };
    },

    async deletePost(id) {
        await db.collection('posts').doc(id).delete();
        return true;
    },

    // Comments
    async getComments(postId) {
        const snapshot = await db.collection('posts').doc(postId).collection('comments').get();
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        return comments;
    },

    async addComment(postId, commentData) {
        const docRef = await db.collection('posts').doc(postId).collection('comments').add(commentData);
        return { id: docRef.id, ...commentData };
    },

    async deleteComment(postId, commentId) {
        await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
        return true;
    },

    // Contact Messages
    async getMessages() {
        const snapshot = await db.collection('messages').get();
        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        return messages;
    },

    async addMessage(messageData) {
        const docRef = await db.collection('messages').add(messageData);
        return { id: docRef.id, ...messageData };
    },

    async getMessage(id) {
        const doc = await db.collection('messages').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
};

module.exports = { db, firestoreHelper }; 