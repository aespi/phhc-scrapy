var express = require('express');
const bodyParser = require('body-parser')
var app = express();
const scrape = require('./tryme')
const moment = require('moment')
// const CsvParser = require("json2csv").Parser;
const { convertArrayToCSV } = require('convert-array-to-csv');
const reqHeader = ['Writ No', 'Petitioner Name', 'FIR No','Police Station','Court Room','Sr No','Category' ,'Name of I/O','I/O Contact']

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
// use res.render to load up an ejs view file

// index page
app.get('/', function(req, res) {
  res.render('pages/index');
});

// about page
app.post('/give-me-some', async function(req, res) {
    let scrapedData = await scrape.start(encodeURIComponent(moment(req.body.date).format('DD/MM/YYYY')));

    const csvFromArrayOfArrays = convertArrayToCSV(scrapedData, {
        header:reqHeader,
        separator: ','
      });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=data.csv");
    res.status(200).end(csvFromArrayOfArrays);
});

app.listen(8080);
console.log('Server is listening on port 8080');