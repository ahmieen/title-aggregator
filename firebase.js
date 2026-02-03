const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBi3gs4fgftQh0XPMRQEuI8fns-149g5bA",
    authDomain: "title-aggregator-2026.firebaseapp.com",
    projectId: "title-aggregator-2026",
    storageBucket: "title-aggregator-2026.firebasestorage.app",
    messagingSenderId: "238464188830",
    appId: "1:238464188830:web:ff2af372595184eeb3d68f",
    measurementId: "G-K3XC5DLFZH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveArticle(article) {
    try {
        const articlesRef = collection(db, 'articles');
        await addDoc(articlesRef, {
            title: article.title,
            link: article.link,
            time: article.time.toISOString()
        });
    } catch (error) {
        console.error('Error saving article:', error);
    }
}

async function getAllArticles() {
    try {
        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('time', 'desc'));
        const snapshot = await getDocs(q);
        const articles = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            articles.push({
                title: data.title,
                link: data.link,
                time: new Date(data.time)
            });
        });
        return articles;
    } catch (error) {
        console.error('Error getting articles:', error);
        return [];
    }
}

async function checkIfArticleExists(link) {
    try {
        const articlesRef = collection(db, 'articles');
        const snapshot = await getDocs(articlesRef);
        let exists = false;
        snapshot.forEach(doc => {
            if (doc.data().link === link) {
                exists = true;
            }
        });
        return exists;
    } catch (error) {
        console.error('Error checking article:', error);
        return false;
    }
}

module.exports = { saveArticle, getAllArticles, checkIfArticleExists };
