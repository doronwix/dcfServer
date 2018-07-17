const express = require('express');       
const router = express.Router();
const rp = require('request-promise');
const htmlExtractor = require('html-extract-js');
const parseXbrl = require('parse-xbrl-10k');

router.get('/:type/:symbolId', function(req, res) {

	let type = req.params.type,
    symbolId = req.params.symbolId;

	var merged_result = [];
	
	if (!symbolId){
		res.send("please send symbol");
		return;
	}
	let min_year = 2008, max_year = 2018,
	promise_arr = [], now = new Date(), year;
	year = now.getFullYear();
	
	while (year > min_year && year <= max_year){

		promise_arr.push(new Promise(function(resolve,reject){
			getDocument(year, symbolId, resolve,reject)
		}))
		
		year--;
	}
	Promise.all(promise_arr).then(function(values) {
		for(let value of values){
			if ((value) && (Object.keys(value).length !== 0)){
				merged_result.push(value);
			}
		}		
		res.send({merged_result})
	  });
	
	function getDocument(current_year, symbolId,  resolve, reject){
		
		rp('http://www.sec.gov/cgi-bin/browse-edgar?CIK=' + symbolId + '&Find=Search&owner=exclude&action=getcompany&type=10-k&owner=exclude&count=20')
			.then((htmlString) => {
				let year =  parseFloat(current_year.toString().slice(2,4)) + 1;
				year = year <10 ? "0" + year : year;
				let extractor = htmlExtractor.load(htmlString, {charset: 'UTF-8'});
				let extractedText = extractor.$(".companyName").text();
				let regex= /[0]\d+/g
				let currentCik = parseFloat(regex.exec(extractedText)[0]);
				let extractedAcccess = extractor.$("tr:contains('10-K'):not(:contains(10-K/A))");
				accessNumberWrapper.set();
				let accessNumber = accessNumberWrapper.get(year.toString()).exec(extractedAcccess)[0].replace(/-/g,"");

				let url = 'https://www.sec.gov/Archives/edgar/data/'+ currentCik + '/' + accessNumber;
				console.log(url);
				rp(url).then((htmlString) => {
						let extractor = htmlExtractor.load(htmlString, {charset: 'UTF-8'});
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

module.exports = router;