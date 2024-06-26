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
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Response error fetching ${url}: ${error}`);
      return null;
    }
    console.error(`Error fetching ${url}: ${error}`);
    return null;
  }
}

function normalizeURL(href, baseURL) {
    const url = new URL(href, baseURL);
    url.search = ''; // Remove query parameters
    url.hash = ''; // Remove fragment identifiers
    return url.href;
  }


  async function extractLinks(html, baseURL) {
    const $ = cheerio.load(html);
    const links = new Set();
    $('a').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        const normalizedHref = normalizeURL(href, baseURL);
        if (normalizedHref.startsWith(baseURL)) {
          links.add(normalizedHref);
        }
      }
    });
    return links;
  }

async function crawlSite(startURL) {
    const visited = new Set();
    const toVisit = new Set([startURL]);
  
    while (toVisit.size > 0) {
      const currentURL = toVisit.values().next().value;
      toVisit.delete(currentURL);
  
      if (!visited.has(currentURL)) {
        visited.add(currentURL);
        const html = await fetchURL(currentURL);
        if (html) {
          const links = await extractLinks(html, startURL);
          links.forEach(link => {
            if (!visited.has(link) && !toVisit.has(link)) {
              toVisit.add(link);
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
    {
      url: 'https://www.hullmuseums.co.uk', outputFile: './hullmuseums_sitemap.xml' 
    },
    { 
      url: 'https://www.familyhubshull.org.uk', outputFile: './familyhubs_sitemap.xml' 
    },
    { 
      url: 'https://www.livewellhull.org.uk', outputFile: './livewellhull_sitemap.xml' 
    },
    { 
      url: 'https://www.workingforhullcitycouncil.org.uk', outputFile: './workingforhullcitycouncil_sitemap.xml'
    },
    { 
      url: 'https://www.travelhull.co.uk', outputFile: './travelhull_sitemap.xml'
    },
    { 
      url: 'https://www.hcandl.co.uk', outputFile: './hcandl_sitemap.xml'
    },
    { 
      url: 'https://www.hullfostering.co.uk', outputFile: './hullfostering_sitemap.xml'
    },
    { 
      url: 'https://hullguildhall.org.uk', outputFile: './hullguildhall_sitemap.xml'
    },
    { 
      url: 'https://www.hull.gov.uk/hulldistrictheating', outputFile: './hulldistrictheating_sitemap.xml'
    },
    { 
      url: 'https://www.weddingsandceremoniesinhull.org.uk', outputFile: './weddingsandceremoniesinhull_sitemap.xml'
    },
    { 
      url: 'https://www.hulltheatres.co.uk/', outputFile: './hulltheatres_sitemap.xml'
    },
    { 
      url: 'https://www.hullwarmhomes.org.uk', outputFile: './hullwarmhomes_sitemap.xml'
    },
    { 
      url: 'https://www.hullcollaborativepartnership.org.uk', outputFile: './hullcollaborativepartnership_sitemap.xml'
    },
    { 
      url: 'https://www.hull.gov.uk/commercialproperty', outputFile: './commercialproperty_sitemap.xml'
    },
    { 
      url: 'https://www.hullbereavementservices.org.uk', outputFile: './hullbereavementservices_sitemap.xml'
    },
    { 
      url: 'https://www.liveithull.co.uk', outputFile: './liveithull_sitemap.xml'
    },
    { 
      url: 'https://www.hulllibraries.co.uk', outputFile: './hulllibraries_sitemap.xml'
    },
    { 
      url: 'https://www.hulladventure.co.uk', outputFile: './hulladventure_sitemap.xml'
    },
    { 
      url: 'https://www.traumainformedhull.org.uk', outputFile: './traumainformedhull_sitemap.xml'
    },
    { 
      url: 'https://hullsendlocaloffer.org.uk', outputFile: './hullsendlocaloffer_sitemap.xml'
    }
  ];

  for (const site of sites) {
    const crawledUrls = await crawlSite(site.url);
    const sitemapXml = await generateSitemap(crawledUrls);
    await fs.writeFile(site.outputFile, sitemapXml);
    console.log(`Sitemap for ${site.url} written successfully to ${site.outputFile}!`);
  }
}

main().catch(error => console.error('Error in main execution:', error));
