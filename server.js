const fs = require('fs');
const HtmlExtractor = require('html-extract-js');
const https = require('https');
const request = require('request');
const rp = require('request-promise');


 

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/:period/:symbolId', function(req, res) {
    rp('https://finance.yahoo.com/quote/' + req.params.symbolId +'/financials?ltr=1')
    .then((htmlString) => {
		let extractor = HtmlExtractor.load(htmlString, {charset: 'UTF-8'});
		let test = extractor.$.html();
		let mtch = test.match('\{"context".*\:\{.*\:.*\}\}');
		let stringToConvert = mtch[0].toString();
		let json = JSON.parse(stringToConvert.replace(/[\u0019]/g, '')); 
		let data = {};
		if (req.params.period === 'q') {
			 data = json.context.dispatcher.stores.QuoteSummaryStore.incomeStatementHistoryQuarterly;
		}
		else{
			 data = json.context.dispatcher.stores.QuoteSummaryStore.incomeStatementHistory;
		}
	res.send({data});
    })
    .catch((err) => {
       console.error(err);
    });   
});



// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
