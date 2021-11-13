import { launch, Page } from 'puppeteer'
import { schedule } from 'node-cron'

// check environment variables
const cronExpression = process.env.CRON_EXPRESSION
if (cronExpression == null) {
    throw new Error('cront expression ($CRON_EXPRESSION) is not defined in the environment variable.')
}
if (process.env.LINE_TOKEN == null) {
    throw new Error('LINE access token ($LINE_TOKEN) is not defined in the environment variable.')
}
const lineUserId = process.env.LINE_USERID
if (lineUserId == null) {
    throw new Error('LINE user id ($LINE_USERID) is not defined in the environment variable.')
}
const jwestId = process.env.JWEST_ID
if (jwestId == null) {
    throw new Error('J-WEST id ($JWEST_ID) is not defined in the environment variable.')
}
const jwestPassword = process.env.JWEST_PASSWORD
if (jwestPassword == null) {
    throw new Error('J-WEST password ($JWEST_PASSWORD) is not defined in the environment variable.')
}

/**
 * Scrap e5489 and send notifications to LINE as needed
 */
const crawl = async () => {
    const browser = await launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await login(page)

    await browser.close()
}

/**
 * Login to the e5489.
 * @param page Puppeteer page object
 */
const login = async (page: Page) => {
    await page.goto('https://www.jr-odekake.net/goyoyaku/e5489/login.html')
    await page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] })

    await page.type('form[name="login2Form"] input[name="id"]', jwestId)
    await page.type('form[name="login2Form"] input[name="password"]', jwestPassword)

    await page.evaluate(() => {
        const submitButton = document.querySelector(
            'form[name="login2Form"] input[id="formHiddenSubmitJSButton"]'
        ) as HTMLInputElement
        submitButton.click()
    })
    await page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] })

    await page
        .frames()
        .find((f) => f.url().indexOf('https://clubj.jr-odekake.net/shared/pc/login_comp_body.do') != -1)
        ?.evaluate(() => {
            const confirmButton = document.querySelector('div#submitBtn a') as HTMLAnchorElement
            confirmButton.click()
        })
    await page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] })
}

// perform checks regularly
schedule(cronExpression, crawl)
