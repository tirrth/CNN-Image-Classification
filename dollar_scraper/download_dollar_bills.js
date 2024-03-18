const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const puppeteer = require('puppeteer')
// const { setTimeout } = require('node:timers/promises')

const downloadImage = async (url, path, number) => {
    try {
        const response = await fetch(url)
        const buffer = await response.buffer()
        fs.writeFile(path, buffer, () => console.log(`Downloaded ${number}: ${path}`))
    } catch (err) {
        console.log(err.message)
    }
}

const initBrowser = async (headless = true) => {
    const browser = await puppeteer.launch({
        headless,
        args: [
            `--window-size=1480,1024`,
            `--use-fake-ui-for-media-stream`,
            `--enable-features=NetworkService`,
        ],
        defaultViewport: {
            width: 1480,
            height: 1024
        }
    })
    return browser
}

// const collectAndDownloadImages = async (browser, searchTerm, numImages, saveDir) => {
//     if (!fs.existsSync(saveDir)) {
//         fs.mkdirSync(saveDir, { recursive: true })
//     }

//     const page = await browser.newPage()
//     // await page.setViewport({ width: 1920, height: 1080 })
//     await page.goto(`https://www.google.com/search?hl=en&tbm=isch&q=${searchTerm}`)

//     let collectedImages = 0
//     while (collectedImages < numImages) {
//         const thumbnails = await page.$$('img.Q4LuWd')
//         for (const thumb of thumbnails.slice(collectedImages, numImages)) {
//             // await page.evaluate((element) => {
//             //     element.scrollIntoView({ block: 'center', inline: 'center' })
//             // }, thumb)
//             await thumb.click()

//             let src
//             try {
//                 const imgSelector = 'img.iPVvYb'
//                 await page.waitForSelector(imgSelector, { visible: true, timeout: 10000 }).catch(() => {
//                     throw new Error('Full resolution image not found')
//                 })

//                 src = await page.evaluate((sel) => {
//                     const image = document.querySelector(sel)
//                     return image ? image.src : ''
//                 }, imgSelector)

//                 // Check if src is valid and not a placeholder or error indicator
//                 if (!src) {
//                     throw new Error('Invalid image src')
//                 }

//             } catch (error) {
//                 console.log(`${error.message}, trying to download lower resolution`)
//                 src = await thumb.evaluate(el => el.src) // Fallback to the thumbnail src
//             }

//             // Validate src before proceeding
//             if (src && src.startsWith('http')) {
//                 collectedImages += 1
//                 const filename = path.join(saveDir, `image_${collectedImages}.jpg`)
//                 await downloadImage(src, filename, collectedImages)
//                 if (collectedImages === numImages) {
//                     return
//                 }
//             }

//             // await new Promise(resolve => setTimeout(resolve, 1000))
//         }

//         // // Check for and click the 'Show more results' button if not enough images were collected.
//         // if (collectedImages < numImages) {
//         //     const moreResultsButton = await page.$('input[value=\'Show more results\']')
//         //     if (moreResultsButton) {
//         //         await moreResultsButton.click()
//         //         await setTimeout(2000)
//         //     } else {
//         //         await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
//         //         await setTimeout(2000)
//         //     }
//         // }
//     }
// }

const collectAndDownloadImages = async (browser, searchTerm, numImages, saveDir) => {
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?hl=en&tbm=isch&q=${searchTerm}`);

    let collectedImages = 0;
    while (collectedImages < numImages) {
        const thumbnails = await page.$$('img.Q4LuWd');
        for (const thumb of thumbnails.slice(collectedImages, numImages)) {
            // Use page.evaluate to scroll into view and click in the same context
            await page.evaluate(async (element) => {
                // Scroll the thumbnail into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                // Simulate a click on the thumbnail
                element.click();
                // return fullResImgSrc;
            }, thumb);

            let src
            try {
                const imgSelector = 'img.iPVvYb'
                await page.waitForSelector(imgSelector, { visible: true, timeout: 15000 }).catch(() => {
                    throw new Error('Full resolution image not found')
                })

                src = await page.evaluate((sel) => {
                    const image = document.querySelector(sel)
                    return image ? image.src : ''
                }, imgSelector)

                // Check if src is valid and not a placeholder or error indicator
                if (!src) {
                    throw new Error('Invalid image src')
                }

            } catch (error) {
                console.log(`${error.message}, trying to download lower resolution`)
                src = await thumb.evaluate(el => el.src) // Fallback to the thumbnail src
            }

            // Validate src before proceeding
            if (src && src.startsWith('http')) {
                collectedImages += 1
                const filename = path.join(saveDir, `image_${collectedImages}.jpg`)
                await downloadImage(src, filename, collectedImages)
                if (collectedImages === numImages) {
                    return
                }
            }

            // // Validate src before proceeding
            // if (result && result.startsWith('http')) {
            //     collectedImages += 1;
            //     const filename = path.join(saveDir, `image_${collectedImages}.jpg`);
            //     await downloadImage(result, filename, collectedImages);
            //     if (collectedImages === numImages) {
            //         return;
            //     }
            // } else {
            //     console.log(`Skipping image due to invalid src`);
            // }
        }

        // // Scroll to trigger loading of more thumbnails if needed
        // await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        // await page.waitForTimeout(2000);
    }
};


const main = async () => {
    try {
        const browser = await initBrowser(false)
        const datasetDir = path.join(process.cwd(), 'images/dataset')

        const terms = ['United States five dollar note']
        for (const term of terms) {
            console.log(`Collecting images for: ${term}`)
            const termDir = path.join(datasetDir, term.replace(/ /g, '_'))
            await collectAndDownloadImages(browser, term, 2000, termDir)
        }

        await browser.close()
    } catch (error) {
        console.error('An error occurred:', error)
        process.exit(1) // Exit with an error status code
    }
}

main().catch(error => {
    console.error(error)
    process.exit(1) // Exit with an error status code if there's an unhandled exception
})
