const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const htmlExtractor = require("html-extract-js");
const parseXbrl = require("parse-xbrl-10k");
const utils = require("./utils");

const financialCalaculator = require("./calculate/financialCalaculator");
const repository = require("./repository/repositoryFactory");
const getDirName = require("path").dirname;
const config = { log: false, fs: true };

repository.registerRepositry("fs");

router.get("/:symbolId/:maxYear?", function(req, res) {
  let now = new Date(),
    symbolId = req.params.symbolId,
    max_year_param = req.params.maxYear
      ? req.params.maxYear
      : now.getFullYear(),
    max_year =
      parseInt(max_year_param) < now.getFullYear()
        ? max_year_param + 1
        : now.getFullYear() + 1,
    min_year = max_year - 10,
    merged_result = [],
    promise_arr = [],
    currentYear = max_year,
    month = 12,
    search_params = "",
    monthCount = 18;

  //url validation:
  if (!symbolId) {
    res.send("please send symbol");
    return;
  }

  let getPromise = (year, type, search_params) => {
    return new Promise(function(resolve, reject) {
      get_sec_document(year, symbolId, search_params, type, resolve, reject);
    });
  };
  //prepare regex for scrapping access number
  let regexToYear = {};
  for (c_year = min_year; c_year  < max_year; c_year++) {
    let year_dec = (c_year + "").substring(2, 4);
    regexToYear[c_year] = new RegExp(
      "([0][\\d]+)-" + year_dec + "-([\\d]+)",
      "g"
    );
  }
  let accessNumberMapRegex = utils.objToStrMap(regexToYear);
  //get 10-K for 10 years
  while (currentYear >= min_year && currentYear <= max_year) {
    search_params =
      "&Find=Search&owner=exclude&action=getcompany&type=10-K&owner=exclude&count=1";
    promise_arr.push(getPromise(currentYear, "10-K", search_params));

    currentYear--;
  }

  //get 10-Q for the last year
  let tenQlastYear = max_year - 1;
  while (month >= 1 && monthCount >= 1) {
    search_params =
      "&Find=Search&owner=exclude&action=getcompany&type=10-Q&owner=exclude&count=1&dateb=" +
      tenQlastYear +
      (month < 10 ? "0" + month : month) +
      "31" +
      "&datea=" +
      tenQlastYear +
      (month < 10 ? "0" + month : month) +
      "01";
    promise_arr.push(getPromise(tenQlastYear, "10-Q", search_params));
    month--;
    if (month == 0) {
      month = 12;
      tenQlastYear = tenQlastYear - 1;
    }
    monthCount--;
  }

  //after all is fetched buildjson to return
  Promise.all(promise_arr)
    .then(function(responses) {
      for (let response of responses) {
        if (
          response.parsed_10k &&
          Object.keys(response.parsed_10k).length !== 0
        ) {
          let json_result;
          if (response.parsed_10k.value) {
            json_result = response.parsed_10k.value();
          } else {
            json_result = response.parsed_10k;
          }
          merged_result.push(json_result);
          if (response.fs_url) {
            let split_url = response.fs_url.split("/");
            let fileName = split_url[split_url.length - 1];
            fileName = fileName.replace(".xml", ".json");
            repository.create(fileName, json_result);
          }
        }
      }
      return new Promise(function(resolve, reject) {
        //extrapolate a dcf relation
        let relation_test_arr = evaluateReportAfterExtrapolation(
          merged_result,
          "Revenues",
          "NetIncomeLoss"
        );

        let additional = calculatedColumns(
          merged_result
        );

        resolve(relation_test_arr);
      });
    })
    .then(function(financialCalculationsResult) {
      //send final result to client
      res.send({ merged_result, financialCalculationsResult });
    }).catch(err=>{
      log(err)
    });

  //scrap sec web site and extract url to document
  function get_xk_url(htmlString, year, type) {
    let extractor = htmlExtractor.load(htmlString, { charset: "UTF-8" });
    let extractedText = extractor.$(".companyName").text();
    let regex = /[0]\d+/g;
    let currentCik = parseFloat(regex.exec(extractedText)[0]);

    let extractedAcccess = extractor.$(
      "tr:contains(" + type + "):not(:contains(" + type + "/A))"
    );

    let accessNumber = accessNumberMapRegex
      .get(year.toString())
      .exec(extractedAcccess)[0]
      .replace(/-/g, "");

    return (
      "https://www.sec.gov/Archives/edgar/data/" +
      currentCik +
      "/" +
      accessNumber
    );
  }

  //get xml from sec and scrap its data
  function get_sec_document(
    year,
    symbolId,
    search_params,
    type,
    resolve,
    reject
  ) {
    let fs_url;

    rp(
      "http://www.sec.gov/cgi-bin/browse-edgar?CIK=" + symbolId + search_params
    )
      .then(htmlString => {
        let url = get_xk_url(htmlString, year, type);
        return url;
      })
      .then(url => rp(url))
      .then(htmlString => {
        let extractor = htmlExtractor.load(htmlString, { charset: "UTF-8" });
        let html = extractor.$("#main-content").html();
        let regex = /\/Archives\/edgar\/data\/[0-9]+\/[0-9]+\/[\w]+-[0-9]+\.xml/g;
        let tenKurl = regex.exec(html);
        if (!tenKurl) {
          log("no document in this year:" + year);
          resolve({});
        }
        let url = "https://www.sec.gov" + tenKurl[0];
        log(url);
        return url;
      })
      .then(url => {
        fs_url = url;
        //check if file exsits on files system
        let split_url = fs_url.split("/");
        let fileName = split_url[split_url.length - 1];
        fileName = fileName.replace(".xml", ".json");
        return { fileName, url };
      })
      .then(result => {
        return repository.isExists("./fs/", result.fileName);
      })
      .then(file => {
        if (file.size > 0) {
          var contents = repository.get(file.name);
          if (contents) {
            resolve({ parsed_10k: JSON.parse(contents) });
          } else {
            return rp(fs_url);
          }
        }
        else{
          return rp(fs_url);
        }
      })
      .then(htmlString => {
        if(htmlString){
          let parsed_10k = parseXbrl.parseStr(htmlString);
          if (parsed_10k) {
            resolve({ fs_url, parsed_10k });
          }
        }
        else{
          resolve({});
        }
      })
      .catch(err => {
        log(err + " year:" + year);
        resolve({});
      });
  }
});

function calculatedColumns(data){
  let operating_Margin_sum = 0,
      operating_Margin_avrg = 0,
      counter = 0,
      factor = 1;
  data.map((elm, index) => {   
    if (elm.OperatingIncome > 0 && elm.Revenues > 0){
      factor = 1;
      if (elm.DocumentType === "10-Q"){
        factor = 0.25
      }
      operating_Margin_sum = operating_Margin_sum + Math.ceil( elm.OperatingIncome / elm.Revenues * factor * 100)/100;
      counter++;
    }
  });
  if (counter>0){
    operating_Margin_avrg = Math.round(operating_Margin_sum / counter * 100) / 100;
  }
    
  return operating_Margin_avrg;
  
}

function evaluateReportAfterExtrapolation(data, field1, field2, oper='-') {

  var operators = {
    '+': function(a, b) { return a + b },
    '-': function(a, b) { return a - b },
    '*': function(a, b) { return a * b },
    ':': function(a, b) { return a / b }
  }; 

  let extrapolation1 = financialCalaculator.linear_extrapolation(
    data,
    field1
  );
  let extrapolation2 = financialCalaculator.linear_extrapolation(
    data,
    field2
  );
  
  //trying to match the data even if years to extrapolate are different for the 2 fields
  return extrapolation1.map((elm, index) => {
   
      if (elm.fiscalYear === extrapolation2[index].fiscalYear) {
        return {
          value: operators[oper](elm[field1], extrapolation2[index][field2]),
          fiscalYear: elm.fiscalYear
        };
      } else {
        for (j = 0; j < extrapolation2.length; j++) {
          if (elm.fiscalYear === extrapolation2[j].fiscalYear) {
            return {
              value: operators[oper](elm[field1],extrapolation2[index][field2]),
              fiscalYear: elm.fiscalYear
            };
          }
        }
      }
    }

  );
}

function log(msg) {
  if (config.log) {
    console.log(msg);
  }
}

module.exports = router;
