const getPostURLs = async (browser, pageName, depth = 12) => {
  const page = await browser.newPage()
  await page.goto(`https://www.facebook.com/${pageName}/posts`, {
    timeout: 60000,
    waitUntil: 'networkidle2',
  })

  await scrollToBottom(page, depth)

  const postAnchors = await page.$$(`a[href^="/${pageName}/post"]`)
  let postURLs = await Promise.all(
    postAnchors.map(
      a => a.getProperty('href').then(h => h.jsonValue())
    )
  )

  postURLs = postURLs
    .filter(url => !url.match(/posts\/\?/)) // Remove links toward the pages index
    .map(url => url.replace(/\?_.+/, '')) // Remove useless URL parameters
    .filter((v, i, s) => s.indexOf(v) === i) // Remove duplicate items

  return postURLs
}

const scrollToBottom = async (page, maxTries = 12) => {
  // console.debug(`[scrollToBottom] with max tries: ${maxTries}`)
  const remainingScrollHeight = await page.evaluate(() => document.body.scrollHeight - (document.documentElement.scrollTop + document.documentElement.clientHeight))
  if (!remainingScrollHeight > 100) return true

  const { PendingXHR } = require('pending-xhr-puppeteer')
  const pendingXHR = new PendingXHR(page)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitFor(3000)
  // console.debug(`[scrollToBottom] Waiting for ${pendingXHR.pendingXhrCount()} pending XHR requests to finish...`)
  await Promise.race([
    pendingXHR.waitForAllXhrFinished(),
    new Promise(resolve => setTimeout(resolve, 30000)),
  ])
  // console.debug(`[scrollToBottom] XHR requests finished`)

  if (maxTries <= 0) return true

  return scrollToBottom(page, maxTries - 1)
}

// ref: https://www.npmjs.com/package/request-promise#crawl-a-webpage-better
const fetchSinglePostText = async ( url ) => {
	const request = require('request-promise');
	const cheerio = require('cheerio');

	postText = await request({
		url: url+'?_fb_noscript=1',// if we don't add _fb_noscript=1 , .userContent does not exist in html
		method: "GET",
		proxy: 'http://127.0.0.1:8888',
		transform: function (body) { return cheerio.load(body); },
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
		}
	}).then(function ($) {
		return $('.userContent').text();
	}).catch( function (e) { console.error(e) } );

	return postText;
}


const test = async () => {
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch({
    // devtools: true,
  })
  const postURLs = await getPostURLs(browser, 'Ninjiatext', 1)//TODO: increase depth in actual crawl

	postURLs.forEach( async (url) => { const postText = await fetchSinglePostText(url)+"\n----------------\n"; console.log(postText); });

  await browser.close()
}

test()
