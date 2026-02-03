let allArticles = [];
let currentPage = 1;
let itemsPerPage = 20;
let checkDataInterval;
let isSyncing = false;

// Guna Direct Cloud Function URL untuk elak masalah 404 rewrite
const API_BASE_URL = "https://us-central1-title-aggregator-2026.cloudfunctions.net/api";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load existing data immediately
    fetchArticles();
});

function startSync() {
    if (isSyncing) return;
    isSyncing = true;

    const loadingContainer = document.getElementById('loading-container');
    const loadingText = document.getElementById('loading-text');
    const syncBtn = document.getElementById('sync-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    syncBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    loadingContainer.style.display = 'block';
    loadingText.textContent = "Checking for new articles in background...";
    
    fetch(`${API_BASE_URL}/scrape`)
        .then(res => res.json())
        .then(data => {
            if (!isSyncing) return;
            console.log(data.message);
            checkDataInterval = setInterval(fetchArticles, 5000);
        });
}

function stopSync() {
    isSyncing = false;
    clearInterval(checkDataInterval);

    const loadingContainer = document.getElementById('loading-container');
    const syncBtn = document.getElementById('sync-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    loadingContainer.style.display = 'none';
    syncBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';

    fetch(`${API_BASE_URL}/stop-scrape`)
        .then(res => res.json())
        .then(data => {
            console.log(data.message);
        });
}

function fetchArticles() {
    fetch(`${API_BASE_URL}/articles`)
        .then(response => response.json())
        .then(data => {
            allArticles = data;
            displayArticles();
            updatePagination();
        });
}

function displayArticles() {
    const tbody = document.getElementById('headlines-body');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const articlesToShow = allArticles.slice(startIndex, endIndex);

    articlesToShow.forEach((article, index) => {
        const row = document.createElement('tr');

        const numCell = document.createElement('td');
        numCell.textContent = startIndex + index + 1;
        row.appendChild(numCell);

        const titleCell = document.createElement('td');
        const link = document.createElement('a');
        link.href = article.link;
        link.textContent = article.title;
        link.target = '_blank';
        titleCell.appendChild(link);
        row.appendChild(titleCell);

        const dateCell = document.createElement('td');
        const date = new Date(article.time);
        dateCell.textContent = date.toLocaleDateString('en-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        row.appendChild(dateCell);

        tbody.appendChild(row);
    });

    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(allArticles.length / itemsPerPage);
    const pageInfo = document.getElementById('page-info');
    pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayArticles();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allArticles.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayArticles();
    }
}
