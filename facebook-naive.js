const htmlToText = require('html-to-text')
const yargs = require('yargs');

const htmlToTextOptions = { ignoreHref: true }

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
  console.debug(`[scrollToBottom] with max tries: ${maxTries}`)
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
// ref: https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g
const fetchSinglePost = async ( url, retries = 3 ) => {
	const request = require('request-promise-native');
	const cheerio = require('cheerio');

	let postData;
	while ( !postData && retries > 0 ) {
		postData = await request({
			url: url+'?_fb_noscript=1',// if we don't add _fb_noscript=1 , .userContent does not exist in html
			method: "GET",
			proxy: 'http://127.0.0.1:8888',
			transform: function (body) { return cheerio.load(body); },
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
			}
		}).then(function ($) {
      let time
      try {
        time = $('.userContentWrapper [data-utime]')[0].attribs['data-utime']
      } catch (e) {
        time = `[Error]: ${e}`
      }

      let text
      try {
        text = htmlToText.fromString($('.userContent').toString(), htmlToTextOptions)
      } catch (e) {
		  console.error(e);
		  console.debug($);
        text = `[Error]: ${e}`
      }

      return {
        time,
        text,
      }
		}).catch( function (e) { console.error(e.options.url + ' failed with ' + e.message + ' , retries=' + retries); retries -= 1; return ''; } );
	}
	console.log(url+"\n-\n"+ postData.text+"\n----------------\n");

	return postData;
}


const fullCrawl = async () => {
  const puppeteer = require('puppeteer')
	const { putPage, getPage } = require('./ethercalc-client');
  const browser = await puppeteer.launch({
    // devtools: true,
  })
	var padname = argv['pagename'];
	debugger;
  const postURLs = await getPostURLs(browser, padname, argv['scroll-depth'])

	let dataarr = await getPage(padname);
	await Promise.all(
		postURLs.map( async (url) => {
			const postData = await fetchSinglePost(url);
			console.log(url+"\n-\n"+ postData.text+"\n----------------\n");
			let index = dataarr.findIndex( (e) => { return e.url === url;} );
			if ( index === -1 ) {
				dataarr.push({url: url, ...postData });
				console.debug('New post: '+ url);
			} else {
				Object.assign(dataarr[index], postData);
				console.debug('Post updated: '+url);
			}
		})
	);

	console.log('Fetched '+dataarr.length+' posts');
	//console.log(dataarr);

	putPage(padname, dataarr);
  await browser.close()
}

const argv = yargs
	.command(['full', '$0'], 'Crawl a facebook page for posts, and upload them.', () => {}, (argv) => { fullCrawl(); })
	.option('scroll-depth', {
		alias: 'd',
		description: 'How many times to scroll to bottom to get post links. Larger depth will obtain more old posts.',
		type: 'number',
		default: 1,
	})
	.option('pagename', {
		alias: 'n',
		description: 'Which facebook page to crawl.',
		type: 'string',
		default: 'Ninjiatext',
	})
	.command('single <url>', 'Fetch a single post and only show it on screen.', () => {}, (argv) => { fetchSinglePost(argv['url']) })
	.help()
	.alias('help', 'h')
	.argv;
