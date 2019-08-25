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


const test = async () => {
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch({
    // devtools: true,
  })
  const postURLs = await getPostURLs(browser, 'Ninjiatext', 8)

  console.log(postURLs)

  await browser.close()
}

test()
