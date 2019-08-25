const puppeteer = require('puppeteer');

const sleep = async (ms) => {
	return new Promise((res, rej) => {
		setTimeout(() => {
			res();
		}, ms)
	});
}

(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto('https://www.facebook.com/Ninjiatext/posts/', {
		waitUntil: 'networkidle2'
	});
	posts = await page.$$('a[href^="/Ninjiatext/post"]');
	photos = await page.$$('a[href^="/Ninjiatext/photo"]');
	videos = await page.$$('a[href^="/Ninjiatext/video"]');
	posts.forEach( async function (post) {
		try {
		const propertyHandle = await post.getProperty('value');
		const propertyValue = await propertyHandle.jsonValue();

		console.log(propertyValue);
		} catch (e) {
			console.error(e);
		}
	});
	/*
	posts.forEach( function (post) {
	c = await page.evaluate(post => post.href
	}
	*/
	await browser.close();
})();
