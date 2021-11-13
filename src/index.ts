import { launch } from 'puppeteer'
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
    // const page = await browser.newPage()
    await browser.close()
}

// perform checks regularly
schedule(cronExpression, crawl)
