const puppeteer = require('puppeteer');

//Selectors
const selectors = {
    searchBox: '#twotabsearchtextbox',
    urlLink: ".a-link-normal.s-no-outline",
    titleId: '#productTitle',
    ratingId: '#acrPopover', //use $eval
    customerReview: '#acrCustomerReviewLink',
    priceClass:'.a-price-whole',
    description: '#productDescription',
    footer: '#navFooter',

    //Reviews classes/Id:
    //Review when there is <see more review>
    allReviewsMain: '#cm_cr-review_list div.review',
    //when there is no <see more review>
    allReviewsAlt: '#cm-cr-dp-review-list div.review', 
    authorName: 'div[data-hook="genome-widget"] span.a-profile-name',
    reviewDate: 'span[data-hook="review-date"]',
    reviewTitle: '.review-title-content>span:not([class])',
    reviewBody: '.review-text-content>span',
    seeMoreReviews1:'#reviews-medley-footer a', // or .cr-widget-SeeAllReviews
    seeMoreReviews2: '.cr-widget-SeeAllReviews a'
}

//Web-urls and keywords
const URL = {
    web: 'https://www.amazon.in/',
    keyword: " "
}

//Function to delay Scraping process
function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

 //Get Review Data
 async function getReviewData(page, allReviews) {

    try {
        
        await page.waitForSelector(allReviews);
        const reviewElements = await page.$$(allReviews);
        let reviewData = [];
        let counter = 0;
    
        for(const reviewElement of reviewElements){
    
            if(counter === 10){
                break;
            }
            const reviewAuthor = await reviewElement.$eval(selectors.authorName, element => element.innerText);
            const dateAndLocation = await reviewElement.$eval(selectors.reviewDate, element => element.innerText);
            const reviewTitle = await reviewElement.$eval(selectors.reviewTitle, element => element.innerText);
            const reviewBody = await reviewElement.$eval(selectors.reviewBody, element => element.innerText);
    
            // Add review number
            const reviewNumber = `Review${++counter}`;
            
            reviewData.push({
                reviewNumber: reviewNumber,
                reviewAuthor: reviewAuthor,
                dateAndLocation: dateAndLocation,
                reviewTitle: reviewTitle,
                reviewBody: reviewBody
            });
        }
    
        return reviewData;

    } catch (error) {
        console.error(`Failed to get review data: ${error}`);
        return error;
    }
}

async function callScraper(keyword){

    //Get keyword from client
    if(keyword){
        URL.keyword = keyword;
    }
    else{
        URL.keyword = "smartphones"
    }

    try {
        // Launch a new browser instance
        const browser = await puppeteer.launch({
            headless: false, //Make it true, if you want to run it headless
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    
        // Create a new page
        const page = await browser.newPage();
        //await page.setViewport({ width: 1280, height: 800 });

        await page.goto(URL.web);
        //await delay(3000)

        await page.type(selectors.searchBox, URL.keyword);
        await page.keyboard.press('Enter');
        await page.waitForSelector(".s-pagination-next");
        //await page.waitForSelector(selectors.textClass);

        //To store first 4 products
        let products = [];

        //Store product hrefs of whole page
        const hrefs = await page.$$eval(selectors.urlLink, elements => elements.map(element => element.getAttribute('href')));
        //console.log(hrefs);

        for(let i=0; i<4; i++){
            const href = hrefs[i];
            const page1 = await browser.newPage();
            await page1.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              );
            
            await page1.goto(`${URL.web}${href}`);
            await (3000);

            const title = await page1.$eval(selectors.titleId, element => element.innerText);
            // console.log(title);

            
            const ratingElement = await page1.$(selectors. ratingId);
            const rating = ratingElement ? await page1.$eval(selectors. ratingId, element => element.innerText.split('\n')[1]) : '';

            const customerReviewElement = await page1.$(selectors.customerReview);
            const customerReview = customerReviewElement ? await page1.$eval(selectors.customerReview, element => element.innerText) : '';

            const price = await page1.$eval(selectors.priceClass, element => element.innerText);
            //console.log(price);

            let descriptionSelector = selectors.description ? selectors.description : '#feature-bullets';
            let descriptionElement = await page1.$(descriptionSelector);

            if (!descriptionElement) {
                descriptionSelector = '#feature-bullets';
                descriptionElement = await page1.$(descriptionSelector);
            }
            
            let description = '';
            if (descriptionElement) {
                description = await page1.$eval(descriptionSelector, element => element.innerText);
            //console.log(description);
            }
            //let reviewsData = []; 
            
            const linkElement = await page1.$(selectors.seeMoreReviews1) || await page.$(selectors.seeMoreReviews2);
            if (linkElement) {
                
                //Goes here if ther is <ee more review>
                const link = await page1.evaluate(element => element.getAttribute('href'), linkElement);
                await page1.goto(`${URL.web}${link}`);
                //console.log('reached')
                
                const reviewData = await getReviewData(page1, selectors.allReviewsMain)
                //console.log(reviewData)
                products.push({
                    title: title,
                    rating: rating,
                    customerReview: customerReview,
                    price: price,
                    description: description,
                    reviewsData: reviewData,
                })
                
                
            } else { 
                //Two Cases: 1. when either there is no reviews, 2.less then 8-10 reviews
                const reviewElement = await page1.$(selectors.allReviewsAlt);
                
                //Case 2.
                if(reviewElement){
                    const reviewData = await getReviewData(page1, selectors.allReviewsAlt)
                    //console.log(reviewData)
                    products.push({
                        title: title,
                        rating: rating,
                        customerReview: customerReview,
                        price: price,
                        description: description,
                        reviewsData: reviewData,
                    })
                }
                
                //case 1.
                else{
                    products.push({
                        title: title,
                        rating: rating,
                        customerReview: customerReview,
                        price: price,
                        description: description,
                        reviewsData: '',
                    })

                }
                
            }

            //end of scraping current page
            await page1.close();

        }
        
        //end of scraping process
        await browser.close();
        
        //console.log(products);
        return products;
        
    } catch (error) {
        console.log('An error occurred:', error);
        return error
    }
}

module.exports = callScraper;
