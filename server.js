
////https://radiant-wave-47361.herokuapp.com/
const fs = require('fs');
const HtmlExtractor = require('html-extract-js');
const https = require('https');
const request = require('request');
const rp = require('request-promise');
const parseXbrl = require('parse-xbrl-10k');


 

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var tenKurl = [];

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
		let data = json.context.dispatcher.stores.QuoteSummaryStore;
	    let filteredData = {};

		if (req.params.period === 'q') {
			filteredData['balanceSheetHistory'] = data['balanceSheetHistoryQuarterly'].balanceSheetStatements;
			filteredData['cashflowStatementHistory'] = data['cashflowStatementHistoryQuarterly'].cashflowStatements;
			filteredData['incomeStatementHistory'] = data['incomeStatementHistoryQuarterly'].incomeStatementHistory;
		}
		else{	
			filteredData['balanceSheetHistory'] = data['balanceSheetHistory'].balanceSheetStatements;
			filteredData['cashflowStatementHistory'] = data['cashflowStatementHistory'].cashflowStatements;
			filteredData['incomeStatementHistory'] = data['incomeStatementHistory'].incomeStatementHistory;	
		}
		var balance = filteredData['balanceSheetHistory'].map(function(tdo,index,arr){
			return transpose(tdo,index,arr);
		});
		var cashFlow = filteredData['cashflowStatementHistory'].map(function(tdo,index,arr){
			return transpose(tdo,index,arr);
		});
		var incomeStatement = filteredData['incomeStatementHistory'].map(function(tdo,index,arr){
			return transpose(tdo,index,arr);
		});

		res.send({balance,cashFlow,incomeStatement});

		function transpose(tdo,index,arr){
			let endDate = null;
			for(let key in tdo){
				if (key === "endDate"){
					endDate = tdo[key].fmt;
				}

				tdo[key] =  tdo[key].raw;
			}
			return {endDate, tdo}
		 }			

    })
    .catch((err) => {
       console.error(err);
    });   
});
router.get('/sec/:symbolId', function(req, res) {

});

router.get('/sec/:year/:symbolId', function(req, res) {

	requested_year = req.params.year,
	symbolId = req.params.symbolId;

	var merged_result = [];
	
	if (!requested_year){
		res.send("please send year");
		return;
	}
	if (!symbolId){
		res.send("please send symbol");
		return;
	}
	var year = requested_year - 10; // first year loop is 10 years before requested year
	var promise_arr = [], i=0;
	//while (year < requested_year){

/* 		promise1 = new Promise(function(resolve,reject){
			getDocument(2015, resolve,reject)
		})
		promise2 = new Promise(function(resolve,reject){
			getDocument(2014, resolve,reject)
		}) */
		
		//year++;
	//}
	while (year < requested_year){

		promise_arr.push(new Promise(function(resolve,reject){
			getDocument(year, resolve,reject)
		}))
		
		year++; 
	}
	Promise.all(promise_arr).then(function(values) {
		for(let value of values){
			if ((value) && (Object.keys(value).length !== 0)){
				merged_result.push(value);
			}
		}		
		res.send({merged_result})
	  });
	
	function getDocument(current_year, resolve, reject){
		
		rp('http://www.sec.gov/cgi-bin/browse-edgar?CIK=' + symbolId + '&Find=Search&owner=exclude&action=getcompany&type=10-k&owner=exclude&count=20')
			.then((htmlString) => {
				let year =  parseFloat(current_year.toString().slice(2,4)) + 1;
				year = year <10 ? "0" + year : year;
				let extractor = HtmlExtractor.load(htmlString, {charset: 'UTF-8'});
				let extractedText = extractor.$(".companyName").text();
				let regex= /[0]\d+/g
				let currentCik = parseFloat(regex.exec(extractedText)[0]);
				let extractedAcccess = extractor.$("tr:contains('10-K'):not(:contains(10-K/A))");
				accessNumberWrapper.set();
				let accessNumber = accessNumberWrapper.get(year.toString()).exec(extractedAcccess)[0].replace(/-/g,"");

				let url = 'https://www.sec.gov/Archives/edgar/data/'+ currentCik + '/' + accessNumber;
				console.log(url);
				rp(url).then((htmlString) => {
						let extractor = HtmlExtractor.load(htmlString, {charset: 'UTF-8'});
						let html = extractor.$("#main-content").html();
						let regex = /\/Archives\/edgar\/data\/[0-9]+\/[0-9]+\/[\w]+-[0-9]+\.xml/g;
						let tenKurl =  	regex.exec(html);
						if (!tenKurl){
							console.log("no document in this year:" + current_year);
							resolve({});
						}
						let url = 'https://www.sec.gov' + tenKurl[0];
						console.log(url);
						rp(url).then((htmlString) => {
							let parsed_10k = parseXbrl.parseStr(htmlString);
							if(parsed_10k){
								resolve(parsed_10k); 
							}
				
					}).catch((err) => {
						console.error(err + " year:" + current_year);
						resolve({})
					});
 

				})
  
	})
	.catch((err) => {
		//res.send('url: https://www.sec.gov' + tenKurl[0] + 'error:' + err);
		console.error(err + " year:" + current_year);
		resolve({})
	 });   	
	 
	}
	
});

var accessNumberWrapper = {
	regExpMap: new Map(),
	get(year){
		return this.regExpMap.get(year);
	},
	set(){
		this.regExpMap.set('04',/([0][\d]+)-04-([\d]+)/);
		this.regExpMap.set('05',/([0][\d]+)-05-([\d]+)/);
		this.regExpMap.set('06',/([0][\d]+)-06-([\d]+)/);
		this.regExpMap.set('07',/([0][\d]+)-07-([\d]+)/);
		this.regExpMap.set('08',/([0][\d]+)-08-([\d]+)/);
		this.regExpMap.set('09',/([0][\d]+)-09-([\d]+)/);
		this.regExpMap.set('10',/([0][\d]+)-10-([\d]+)/);
		this.regExpMap.set('11',/([0][\d]+)-11-([\d]+)/);
		this.regExpMap.set('12',/([0][\d]+)-12-([\d]+)/);
		this.regExpMap.set('13',/([0][\d]+)-13-([\d]+)/);
		this.regExpMap.set('14',/([0][\d]+)-14-([\d]+)/);
		this.regExpMap.set('15',/([0][\d]+)-15-([\d]+)/);
		this.regExpMap.set('16',/([0][\d]+)-16-([\d]+)/);
		this.regExpMap.set('17',/([0][\d]+)-17-([\d]+)/);
		this.regExpMap.set('18',/([0][\d]+)-18-([\d]+)/);		
		this.regExpMap.set('19',/([0][\d]+)-19-([\d]+)/);
		this.regExpMap.set('20',/([0][\d]+)-20-([\d]+)/);
	}	

}




// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);