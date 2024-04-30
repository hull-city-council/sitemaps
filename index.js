const axios = require('axios');
const cheerio = require('cheerio');
const xml = require('xml');
const fs = require('fs-extra');


const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchURL(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}: ${error}`);
    return null;
  }
}

async function extractLinks(html) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a').each((i, link) => {
    const href = $(link).attr('href');
    if (href && href.startsWith('/') && href.length > 1) {
      links.add(new URL(href, baseURL).href);
    }
  });
  return links;
}

async function crawlSite(startURL) {
  const visited = new Set();
  const toVisit = [startURL];

  while (toVisit.length > 0) {
    const currentURL = toVisit.pop();
    if (!visited.has(currentURL)) {
      visited.add(currentURL);
      const html = await fetchURL(currentURL);
      if (html) {
        const links = await extractLinks(html);
        links.forEach(link => {
          if (!visited.has(link)) {
            toVisit.push(link);
          }
        });
      }
    }
  }
  return visited;
}

async function generateSitemap(urls) {
  const sitemap = {
    urlset: [
      { _attr: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' } },
      ...Array.from(urls).map(url => ({
        url: [{ loc: url }]
      }))
    ]
  };
  return xml(sitemap, { declaration: true });
}

async function main() {
  const sites = [
    { url: 'https://www.familyhubshull.org.uk', outputFile: './sitemap_familyhubs.xml' },
    { url: 'https://www.livewellhull.org.uk', outputFile: './sitemap_livewellhull.xml' }
  ];

  for (const site of sites) {
    const crawledUrls = await crawlSite(site.url);
    const sitemapXml = await generateSitemap(crawledUrls);
    await fs.writeFile(site.outputFile, sitemapXml);
    console.log(`Sitemap for ${site.url} written successfully to ${site.outputFile}!`);
  }
}

main().catch(error => console.error('Error in main execution:', error));
