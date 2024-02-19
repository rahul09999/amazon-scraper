const express = require('express');
const callScrapper = require('./scrapper');
const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.get('/scraper', async (req, res) => {
    try {
        const keyword = req.body.keyword;
        const data = await callScrapper(keyword);
        res.status(200).json(data);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "There is some issue while scrapping data",
        })
    
    }

});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
