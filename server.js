const express = require('express');
const { scrapeTheVerge, stopScraping } = require('./scraper');
const { saveArticle, getAllArticles, checkIfArticleExists } = require('./firebase');
const app = express();
const port = 3000;

app.use(express.static('public'));

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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
