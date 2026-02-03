const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
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

        // Generate sitemap URLs from Jan 2022 until now
        const sitemapUrls = [];
        const currentDate = new Date();
        let year = 2022;
        let month = 1;

        while (year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month <= currentDate.getMonth() + 1)) {
            // Updated format based on investigation: https://www.theverge.com/sitemaps/entries/YYYY/M
            sitemapUrls.push(`https://www.theverge.com/sitemaps/entries/${year}/${month}`);
            
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        // Process RSS feeds first (better titles)
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

        // Process Sitemaps
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
                        // Double check date
                        if (pubDate >= new Date('2022-01-01')) {
                            const exists = articles.some(a => a.link === loc);
                            if (!exists) {
                                // Extract title from URL
                                // e.g. https://www.theverge.com/2024/1/2/12345/some-cool-article-title
                                const parts = loc.split('/').filter(p => p);
                                let slug = parts[parts.length - 1];
                                
                                // Remove ID if present (usually numbers at start of slug? or separate part)
                                // Verge URL pattern: /section/id/slug or /year/month/day/id/slug
                                // We just take the last part and clean it up
                                
                                // Improve formatting: replace dashes with spaces, capitalize words
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

module.exports = { scrapeTheVerge, stopScraping };
