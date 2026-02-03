const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));

admin.initializeApp();
const db = admin.firestore();
const parser = new Parser();

let isScrapingActive = false;

function stopScraping() {
    isScrapingActive = false;
    console.log('Scraping stopping requested...');
}

async function scrapeTheVerge() {
    isScrapingActive = true;
    const articles = [];
    
    try {
        const rssUrls = [
            'https://www.theverge.com/rss/index.xml',
            'https://www.theverge.com/tech/rss/index.xml',
            'https://www.theverge.com/reviews/rss/index.xml',
            'https://www.theverge.com/science/rss/index.xml',
            'https://www.theverge.com/entertainment/rss/index.xml',
            'https://www.theverge.com/policy/rss/index.xml',
            'https://www.theverge.com/apple/rss/index.xml',
            'https://www.theverge.com/google/rss/index.xml',
            'https://www.theverge.com/microsoft/rss/index.xml',
            'https://www.theverge.com/samsung/rss/index.xml',
            'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml'
        ];

        const sitemapUrls = [];
        const currentDate = new Date();
        let year = 2022;
        let month = 1;

        while (year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month <= currentDate.getMonth() + 1)) {
            sitemapUrls.push(`https://www.theverge.com/sitemaps/entries/${year}/${month}`);
            
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        console.log('Fetching RSS feeds...');
        for (const url of rssUrls) {
            if (!isScrapingActive) break;
            try {
                const feed = await parser.parseURL(url);
                feed.items.forEach(item => {
                    const title = item.title;
                    const link = item.link;
                    const time = item.pubDate;

                    if (title && link && time) {
                        const pubDate = new Date(time);
                        if (pubDate >= new Date('2022-01-01')) {
                            const exists = articles.some(a => a.link === link);
                            if (!exists) {
                                articles.push({
                                    title,
                                    link,
                                    time: pubDate
                                });
                            }
                        }
                    }
                });
            } catch (err) {
                console.log('Error fetching RSS:', url);
            }
        }

        console.log(`Fetching ${sitemapUrls.length} monthly sitemaps...`);
        for (const url of sitemapUrls) {
            if (!isScrapingActive) {
                console.log('Scraping stopped by user.');
                break;
            }

            try {
                console.log(`Processing sitemap: ${url}`);
                const { data } = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                
                const $ = cheerio.load(data, { xmlMode: true });
                
                $('url').each((i, el) => {
                    const loc = $(el).find('loc').text();
                    const lastmod = $(el).find('lastmod').text();
                    
                    if (loc && lastmod) {
                        const pubDate = new Date(lastmod);
                        if (pubDate >= new Date('2022-01-01')) {
                            const exists = articles.some(a => a.link === loc);
                            if (!exists) {
                                const parts = loc.split('/').filter(p => p);
                                let slug = parts[parts.length - 1];
                                
                                let cleanTitle = slug.split('-').map(word => {
                                    return word.charAt(0).toUpperCase() + word.slice(1);
                                }).join(' ');

                                articles.push({
                                    title: cleanTitle,
                                    link: loc,
                                    time: pubDate
                                });
                            }
                        }
                    }
                });
            } catch (err) {
                console.log(`Error fetching sitemap ${url}: ${err.message}`);
            }
        }

        articles.sort((a, b) => b.time - a.time);
        console.log(`Total articles found: ${articles.length}`);
        return articles;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function saveArticle(article) {
    try {
        await db.collection('articles').add({
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
        const snapshot = await db.collection('articles').orderBy('time', 'desc').get();
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
        const snapshot = await db.collection('articles').get();
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


app.get('/articles', async (req, res) => {
    const allArticles = await getAllArticles();
    res.json(allArticles);
});

app.get('/stop-scrape', (req, res) => {
    stopScraping();
    res.json({ message: "Scraping stopped.", status: "stopped" });
});

app.get('/scrape', async (req, res) => {
    scrapeTheVerge().then(async (newArticles) => {
        console.log('Scraping finished. Found ' + newArticles.length + ' potential new articles.');
        for (const article of newArticles) {
            const exists = await checkIfArticleExists(article.link);
            if (!exists) {
                await saveArticle(article);
                console.log('Saved new article:', article.title);
            }
        }
    }).catch(err => console.error('Background scraping error:', err));

    res.json({ message: "Scraping started in background...", status: "processing" });
});

exports.api = functions.https.onRequest(app);
