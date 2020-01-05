const htmlToText = require('html-to-text')
const yargs = require('yargs');

const htmlToTextOptions = { ignoreHref: true }

const getPostURLs = async (browser, pageName, depth = 12) => {
  const page = await browser.newPage()
  await page.goto(`https://www.facebook.com/${pageName}/posts`, {
    timeout: 60000,
    waitUntil: 'networkidle2',
  }).then(console.log(`Loaded facebook page ${pageName}`));

  await scrollToBottom(page, depth)

	let postAnchors = [];
	postAnchors = await page.$$(`a[href^="/${pageName}/post"]`);
	let permalinkType = false;
	if ( postAnchors.length === 0 ) {
		postAnchors = await page.$$('a[href^="/permalink.php?story_fbid="]');
		permalinkType = true;
	}

	let postURLs = [];
	postURLs = await Promise.all(
		postAnchors.map(
			a => a.getProperty('href').then(h => h.jsonValue())
		)
	)

	if ( permalinkType ) {
		const mod_url = require('url');
		postURLs = postURLs.map( url => {
			let urlobj = new mod_url.URL(url);
			for (const name of urlobj.searchParams.keys() ) {
				if ( name !== 'story_fbid' && name !== 'id' ) urlobj.searchParams.delete(name);
			}
			console.log('========'+urlobj.toString());
			return urlobj.toString();
		});
	} else {
		postURLs = postURLs
			.filter(url => !url.match(/posts\/\?/)) // Remove links toward the pages index
			.map(url => url.replace(/\?_.+/, '')) // Remove useless URL parameters
			.filter((v, i, s) => s.indexOf(v) === i) // Remove duplicate items
	}

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
			url: url.includes('?') ? url+'&_fb_noscript=1' : url+'?_fb_noscript=1',// if we don't add _fb_noscript=1 , .userContent does not exist in html
			method: "GET",
			proxy: 'http://127.0.0.1:8888',
			timeout: 30000,
			transform: function (body) { return cheerio.load(body); },
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.5'
			}
		}).then(function ($) {
			let posttime
				try {
					posttime = $('.userContentWrapper [data-utime]')[0].attribs['data-utime']
				} catch (e) {
					posttime = `[Error]: ${e}`
						//console.debug($.html());
				}

			let text
				try {
					text = htmlToText.fromString($('.userContent').toString(), htmlToTextOptions)
				} catch (e) {
					console.error(e);
					//console.debug($.html());
					text = `[Error]: ${e}`
				}

			let attachment_element_str = '.userContent + div';
			let attachment_link, attachment_img, attachment_img_alt, attachment_title, attachment_brief;
			if ( $(attachment_element_str+' a').length > 0 ) {
				try { attachment_link = $(attachment_element_str+' a')[0].attribs['href'];
				} catch (e) { console.debug(e); }
				try { attachment_img = $(attachment_element_str+' img')[0].attribs['src'];
					attachment_img_alt = $(attachment_element_str+' img')[0].attribs['aria-label'];
				} catch (e) { console.debug(e); }
				try { attachment_title_ = $(attachment_element_str+' a');
					let i;
					for (i=0; i<attachment_title_.length; i++) {
						if ( attachment_title_.eq(i).text() !== '') break;
					}
					attachment_title = attachment_title_.eq(i).text();
					attachment_brief = attachment_title_.eq(i).parent().next().text();
				} catch (e) { console.debug(e); }
			}

			let crawled_time = Math.floor(Date.now() / 1000);

			return {
				posttime,
				text,
				crawled_time,
				attachment_link,
				attachment_img,
				attachment_img_alt,
				attachment_title,
				attachment_brief,
			}
		}).catch( function (e) { console.error(e.options.url + ' failed with ' + e.message + ' , retries=' + retries); retries -= 1; return ''; } );
	}
	console.log(url+"\n-\n"+ postData.text+"\n----------------\n");

	return postData;
}

function isASCII(str) {
	return /^[\x00-\x7F]*$/.test(str);
}

// Tracks Promise.all progress https://stackoverflow.com/a/42342373
function allProgress(proms, progress_cb) {
	let d = 0;
	progress_cb(0);
	for (const p of proms) {
		p.then(()=> {
			d ++;
			progress_cb( (d * 100) / proms.length );
		});
	}
	return Promise.all(proms);
}

function init() {
  const puppeteer = require('puppeteer')
	  console.log("Initializing browser")
  const browser = puppeteer.launch({
    // devtools: true,
  })
  return browser
}

const fullCrawl = async (browser, pagename, scrolldepth) => {
	const { putPage, getPage } = require('./ethercalc-client');
	var padname = pagename;
	if ( ! isASCII(padname) ) {// if ASCII name not set, use numeric name
		padname = padname.match(/\d+$/);
	}
  const postURLs = await getPostURLs(browser, padname, scrolldepth)

	try {
		var dataarr = await getPage(padname);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
	await allProgress(
		postURLs.map( async (url) => {
			const postData = await fetchSinglePost(url);
			// merge existing rows and new rows
			let index = dataarr.findIndex( (e) => { return e.url === url;} );
			if ( index === -1 ) {
				dataarr.push({url: url, ...postData });
				console.debug('New post: '+ url);
			} else {
				Object.assign(dataarr[index], postData);
				console.debug('Post updated: '+url);
			}
		}),
		(p) => {
			console.log(`Fetch single post progress: ${p.toFixed(2)}%`);
		}
	);

	console.log('Fetched '+dataarr.length+' posts');
	//console.log(dataarr);

	try {
		// fix missing keys for old objects
		if ( Object.keys(dataarr[0]).length < Object.keys(dataarr[dataarr.length-1]).length ) {
			dataarr.forEach( row => {
				Object.keys(dataarr[dataarr.length-1]).forEach( key => {
					if ( !(key in row) ) row[key] = "";
				});
			});
		}
	debugger;
		putPage(padname, dataarr);
	} catch (e) { console.error(e); process.exit(1); }
	console.debug('putPage complete, waiting browser close');
  await browser.close()
}

async function getPagePostFreq(pagename) {
	const { putPage, getPage } = require('./ethercalc-client');
	let data = await getPage(pagename);
	if ( data.length === 0 ) throw Error("This page has not been crawled!");
	// filter out different crawls of the same post by assuming 
	// no different posts will have the same posttime
	// and sort big to small
	const uniq_time = [...new Set(data.map( post => post.posttime ))].map(a => Number.parseInt(a) ).sort((a,b) => b - a).filter( a => Number.isInteger(a) );
	let time_diff = [];
	for ( i=0; i<uniq_time.length-1; i++ ) {
		time_diff.push(uniq_time[i]-uniq_time[i+1]);
	}
	console.debug(time_diff);
	const average_between_post = time_diff.reduce((a, v) => a+v) / time_diff.length;

	console.log('Average post frequency (second): '+average_between_post);
}

const argv = yargs
	.command(['full', '$0'], 'Crawl a facebook page for posts, and upload them.', () => {},
			(argv) => {
				init().then(
						browser => {
							fullCrawl(browser, argv['pagename'], argv['scroll-depth']);
						}
						);
			})
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
	.command('postfreq <pagename>', 'Calculate post frequency for crawled page', () => {}, (argv) => { getPagePostFreq(argv['pagename']) })
	.command('verify <pagename>', 'Verify crawled data on Ethercalc', () => {}, (argv) => { const { verifyPage } = require('./ethercalc-client'); verifyPage(argv['pagename']); })
	.help()
	.alias('help', 'h')
	.argv;
