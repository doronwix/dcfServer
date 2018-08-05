const express = require('express');       
const router = express.Router();
const rp = require('request-promise');
const htmlExtractor = require('html-extract-js');
const parseXbrl = require('parse-xbrl-10k');

router.get('/:maxYear/:symbolId', function(req, res) {

	let now = new Date();
	let symbolId = req.params.symbolId,
	max_year = req.params.maxYear;
	max_year = parseInt(max_year) < now.getFullYear() ? max_year : now.getFullYear();

	if (!max_year){
		res.send("please send maximum year to review");
		return;
	}

	let min_year = max_year - 10;

	var merged_result = [];
	
	if (!symbolId){
		res.send("please send symbol");
		return;
	}


	
	promise_arr = [];
	let currentYear = max_year;
	
	while (currentYear >= min_year && currentYear <= max_year){

		promise_arr.push(new Promise(function(resolve,reject){
			get_document(currentYear, symbolId, '10-K', resolve,reject)
		}))
		
		currentYear--;
	}
	promise_arr.push(new Promise(function(resolve,reject){
		get_document(max_year, symbolId, '10-Q', resolve,reject);
	}))
	
	
	Promise.all(promise_arr).then(function(values) {
		for(let value of values){
			if ((value) && (Object.keys(value).length !== 0)){
				merged_result.push(value);
			}
		}		
		res.send({merged_result})
	  });
	function build_url(htmlString, year, type){

		let extractor = htmlExtractor.load(htmlString, {charset: 'UTF-8'});
		let extractedText = extractor.$(".companyName").text();
		let regex= /[0]\d+/g
		let currentCik = parseFloat(regex.exec(extractedText)[0]);

		let extractedAcccess = extractor.$("tr:contains(" + type + "):not(:contains(" + type + "/A))");
		accessNumberWrapper.set();
		let accessNumber = accessNumberWrapper.get(year.toString()).exec(extractedAcccess)[0].replace(/-/g,"");

		return 'https://www.sec.gov/Archives/edgar/data/'+ currentCik + '/' + accessNumber;
	} 
	
	function get_document(year, symbolId,  type, resolve, reject){
		let search_params = '&Find=Search&owner=exclude&action=getcompany&type=' + type + '&owner=exclude&count=20';
		rp('http://www.sec.gov/cgi-bin/browse-edgar?CIK=' + symbolId + search_params)
		.then((htmlString) => build_url(htmlString, year, type))
		.then((url) => rp(url))
		.then((htmlString) => {
				let extractor = htmlExtractor.load(htmlString, {charset: 'UTF-8'});
				let html = extractor.$("#main-content").html();
				let regex = /\/Archives\/edgar\/data\/[0-9]+\/[0-9]+\/[\w]+-[0-9]+\.xml/g;
				let tenKurl =  	regex.exec(html);
				if (!tenKurl){
					console.log("no document in this year:" + year);
					resolve({});
				}
				let url = 'https://www.sec.gov' + tenKurl[0];
				console.log(url);
				return url;
			})
		.then((url) => rp(url))
		.then((htmlString) => {
				let parsed_10k = parseXbrl.parseStr(htmlString);
				if(parsed_10k){
					resolve(parsed_10k); 
				}
		
		}).catch((err) => {
			console.error(err + " year:" + year);
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
		this.regExpMap.set('2004',/([0][\d]+)-04-([\d]+)/);
		this.regExpMap.set('2205',/([0][\d]+)-05-([\d]+)/);
		this.regExpMap.set('2006',/([0][\d]+)-06-([\d]+)/);
		this.regExpMap.set('2007',/([0][\d]+)-07-([\d]+)/);
		this.regExpMap.set('2008',/([0][\d]+)-08-([\d]+)/);
		this.regExpMap.set('2009',/([0][\d]+)-09-([\d]+)/);
		this.regExpMap.set('2010',/([0][\d]+)-10-([\d]+)/);
		this.regExpMap.set('2011',/([0][\d]+)-11-([\d]+)/);
		this.regExpMap.set('2012',/([0][\d]+)-12-([\d]+)/);
		this.regExpMap.set('2013',/([0][\d]+)-13-([\d]+)/);
		this.regExpMap.set('2014',/([0][\d]+)-14-([\d]+)/);
		this.regExpMap.set('2015',/([0][\d]+)-15-([\d]+)/);
		this.regExpMap.set('2016',/([0][\d]+)-16-([\d]+)/);
		this.regExpMap.set('2017',/([0][\d]+)-17-([\d]+)/);
		this.regExpMap.set('2018',/([0][\d]+)-18-([\d]+)/);		
		this.regExpMap.set('2019',/([0][\d]+)-19-([\d]+)/);
		this.regExpMap.set('2020',/([0][\d]+)-20-([\d]+)/);
	}	

}

module.exports = router;
