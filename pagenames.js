const dynamicCrawl = async () => {
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch({
    // devtools: true,
  })
  const page = await browser.newPage()
  await page.goto("http://page.board.tw/", {
    timeout: 60000,
    waitUntil: 'networkidle2',
  })


  await browser.close()
}

const staticCrawl = async () => {
	const request = require('request-promise-native');
	const cheerio = require('cheerio');

	let category_links = await request({
		url: "http://page.board.tw/",
		method: "GET",
		transform: function (body) { return cheerio.load(body); },
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
		}
	}).then(function ($) {
		let table_cells = $('table tbody td:nth-child(2) a');
		let ret = [];

		for ( i=0; i<=table_cells.length; i++ ) {
			try {
				ret.push(table_cells[i].attribs['href']);
			} catch (e) {}
		}

		return ret;
	});

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	let pagenames = [];
	await Promise.all(
		category_links.map( async (url) => {
			sleep(Math.random() * 50000);
			//console.log(url);
			let fbpage_links = await request({
				url: "http://page.board.tw"+url,
				method: "GET",
				transform: function (body) { return cheerio.load(body); },
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
				}
			}).then( function ($) {
				let a_els = $('table tbody td:nth-child(3) a');
				let ret = [];
				for ( i=0; i<=a_els.length; i++ ) {
					try {
						ret.push(a_els[i].attribs['href']);
						console.log(a_els[i].attribs['href']);
					} catch (e) {}
				}
				return ret;
			});
		})
	);
}

staticCrawl();
