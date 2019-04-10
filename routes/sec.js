const express = require('express');       
const router = express.Router();
const rp = require('request-promise');
const htmlExtractor = require('html-extract-js');
const parseXbrl = require('parse-xbrl-10k');


const financialCalaculator = require('./calculate/financialCalaculator');
const repository = require('./repository/repositoryFactory');
const getDirName = require('path').dirname;
const config = {log:false, fs:true};

repository.registerRepositry("fs");

router.get('/:symbolId/:maxYear?', function(req, res) {


	let now = new Date(),
		symbolId = req.params.symbolId,
		max_year_param = req.params.maxYear ? req.params.maxYear : now.getFullYear(),
		max_year = parseInt(max_year_param) < now.getFullYear() ? max_year_param : now.getFullYear(),
		min_year = max_year - 10,
		merged_result = [],
		promise_arr = [],
		currentYear = max_year, month = 12, search_params ='', monthCount = 18;
	
	//url validation:
	if (!symbolId){
		res.send("please send symbol");
		return;
	}

	while (currentYear >= min_year && currentYear <= max_year){
		search_params = '&Find=Search&owner=exclude&action=getcompany&type=10-K&owner=exclude&count=1';
		promise_arr.push(new Promise(function(resolve,reject){
			get_sec_document(currentYear, symbolId, search_params, '10-K', resolve,reject)
		}));
		
		currentYear--;
	} 
	while (month >= 1 && monthCount >= 1){
		search_params = '&Find=Search&owner=exclude&action=getcompany&type=10-Q&owner=exclude&count=1&dateb=' + max_year + (month<10 ? '0' + month : month) + '31' + '&datea=' + max_year + (month<10 ? '0' + month : month) +'01';
		promise_arr.push(new Promise(function(resolve,reject){	
			get_sec_document(max_year, symbolId, search_params, '10-Q', resolve,reject);
		}))
		month--;
		if (month == 0){
			month = 12;
			max_year = max_year -1;
		}
		monthCount--;
	}

	
	Promise.all(promise_arr).then(function(responses) {
		for(let response of responses){
			if ((response.parsed_10k) && (Object.keys(response.parsed_10k).length !== 0)){
				let json_result;
				if (response.parsed_10k.value){
					json_result = response.parsed_10k.value();
				}
				else{
					json_result = response.parsed_10k
				}
				merged_result.push(json_result);
				if (response.fs_url){
					let split_url = response.fs_url.split('/');
					let fileName = split_url[split_url.length-1];
					fileName = fileName.replace('.xml','.json');
					repository.create(fileName,json_result);
				}
			}
		}
		return new Promise(function(resolve,reject){ 

			let relation_test_arr = evaluateReportAfterExtrapolation(merged_result, "Revenues", "NetIncomeLoss")
		
			resolve(relation_test_arr);
	  	})
	}).then(function(financialCalculationsResult){
		res.send( {merged_result,  financialCalculationsResult});
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
	
	function get_sec_document(year, symbolId, search_params, type, resolve, reject){
		let fs_url;

		
		rp('http://www.sec.gov/cgi-bin/browse-edgar?CIK=' + symbolId + search_params)
		.then((htmlString) => build_url(htmlString, year, type))
		.then((url) => rp(url))
		.then((htmlString) => {
				let extractor = htmlExtractor.load(htmlString, {charset: 'UTF-8'});
				let html = extractor.$("#main-content").html();
				let regex = /\/Archives\/edgar\/data\/[0-9]+\/[0-9]+\/[\w]+-[0-9]+\.xml/g;
				let tenKurl =  	regex.exec(html);
				if (!tenKurl){
					log("no document in this year:" + year);
					resolve({});
				}
				let url = 'https://www.sec.gov' + tenKurl[0];
				log(url);
				return url;
			})
		.then((url) =>{
			fs_url = url;
			//check if file exsits on files system
			let split_url = fs_url.split('/');
			let fileName = split_url[split_url.length-1];
			fileName = fileName.replace('.xml','.json');
			return {fileName, url};
		})
		.then((result) => {
			return repository.isExists('./fs/', result.fileName)})
		.then((file) => {
				if (file.size > 0) {
					var contents = repository.get(file.name);
					if (contents){
						resolve({parsed_10k: JSON.parse(contents)})
					}
					else{
						return rp(fs_url);
					}
				}
				return rp(fs_url);
		})	
		.then((htmlString) => {
				let parsed_10k = parseXbrl.parseStr(htmlString);
				if(parsed_10k){
					resolve({fs_url, parsed_10k}); 
				}
		
		}).catch((err) => {
			log(err + " year:" + year);
			resolve({})
		});   	
	 
	}
	
})
function evaluateReportAfterExtrapolation(merged_result, field1, field2) {
	let extrapolation1 = financialCalaculator.linear_extrapolation(merged_result, field1);
	let extrapolation2 = financialCalaculator.linear_extrapolation(merged_result, field2);
	return extrapolation1.map((elm, index) => {
		if (elm.fiscalYear === extrapolation2[index].fiscalYear) {
			return {"value": elm[field1] - extrapolation2[index][field2], "fiscalYear": elm.fiscalYear};
		}
		else {
			for (j = 0; j < extrapolation2.length; j++) {
				if (elm.fiscalYear === extrapolation2[j].fiscalYear) {
					return {"value": elm[field1] - extrapolation2[index][field2], "fiscalYear": elm.fiscalYear};
				}
			}
		}
	});
}

function log(msg){
	if (config.log){
		console.log(msg);
	}
	
}

var accessNumberWrapper = {
	regExpMap: new Map(),
	get(year){
		return this.regExpMap.get(year);
	},
	set(){
		this.regExpMap.set('2003',/([0][\d]+)-04-([\d]+)/);
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
