import { launch, Page } from 'puppeteer'
import { schedule } from 'node-cron'
import { VacancyResult } from './vacancy-result'

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
    const context = await browser.createIncognitoBrowserContext()
    const page = await context.newPage()
    page.setViewport({ width: 1920, height: 1080 })

    if (!(await login(page))) {
        await browser.close()
        console.log('e5489 login failed.')
        return
    }

    await checkVacancy(page)

    await browser.close()
}

/**
 * Login to the e5489.
 * @param page Puppeteer page object
 * @returns true if login succeeds, false if it fails.
 */
const login = async (page: Page): Promise<boolean> => {
    await page.goto('https://www.jr-odekake.net/goyoyaku/e5489/login.html', { waitUntil: 'networkidle2' })

    await page.type('form[name="login2Form"] input[name="id"]', jwestId)
    await page.type('form[name="login2Form"] input[name="password"]', jwestPassword)

    await Promise.all([
        page.evaluate(() => {
            const submitButton = document.querySelector(
                'form[name="login2Form"] input[id="formHiddenSubmitJSButton"]'
            ) as HTMLInputElement
            submitButton.click()
        }),
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    ])

    const loginError = await page.$('div#contents div.errorBox')
    if (loginError != null) {
        return false
    }

    await Promise.all([
        page
            .frames()
            .find((f) => f.url().indexOf('https://clubj.jr-odekake.net/shared/pc/login_comp_body.do') != -1)
            ?.evaluate(() => {
                const confirmButton = document.querySelector('div#submitBtn a') as HTMLAnchorElement
                confirmButton.click()
            }),
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    ])

    return true
}

/**
 * Check vacancy information
 * @param page E5489 logged in page object
 */
const checkVacancy = async (page: Page): Promise<VacancyResult> => {
    await page.goto('https://e5489.jr-odekake.net/e5489/cspc/CBTopMenuPC', { waitUntil: 'networkidle2' })

    await Promise.all([
        page.$eval('form[name="formTrainEntry"]', (form) => (form as HTMLFormElement).submit()),
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    ])

    // TODO: make it changeble
    await page.type('form[name="formMain"] input[name="inputDepartStName"]', '東京')
    await page.type('form[name="formMain"] input[name="inputArriveStName"]', '米子')
    await page.select('form[name="formMain"] select#boarding-date', '20211119')
    await page.select('form[name="formMain"] select[name="inputHour"]', '21')
    await page.select('form[name="formMain"] select[name="inputMinute"]', '50')
    await page.click('form[name="formMain"] input[name="inputSearchType"][value="1"]') // 「一度も乗り換えしない」

    await Promise.all([
        page.click('form[name="formMain"] button.decide-button'),
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    ])

    // confirmation
    await Promise.all([
        page.click('button.decide-button'),
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    ])

    const hasVacancy = await page.evaluate(() => {
        const results = document.querySelectorAll('table.seat-availability tbody tr td')
        results.forEach((result) => {
            if (result.querySelector('img') == null) {
                return true
            }
        })

        return false
    })

    const screenShot = await page.screenshot()

    return { hasVacancy: hasVacancy, screenShot: screenShot }
}

// perform checks regularly
schedule(cronExpression, crawl)
