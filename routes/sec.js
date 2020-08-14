const express = require("express");
const path = require("path");
const router = express.Router();
const axios = require("axios");
const htmlExtractor = require("html-extract-js");
const parseXbrl = require("parse-xbrl-10k");
const utils = require("./utils");

const {
  Worker,
  MessageChannel,
  MessagePort,
  isMainThread,
  parentPort,
} = require("worker_threads");

const extrapolate = require("./calculate/extrapolate");
const repository = require("./repository/repositoryFactory");
const getDirName = require("path").dirname;
const config = { log: true, fs: true, setWorker: false };
repository.registerRepositry("fs");

router.get("/:symbolId/:maxYear?/:numOfYears?/:docType?", function (req, res) {
  let _currentYear = new Date().getFullYear(),
    _symbolId = req.params.symbolId
      ? req.params.symbolId
      : res.send("please send symbol"),
    _maxYear = req.params.maxYear ? parseInt(req.params.maxYear) : _currentYear,
    _numOfYears = req.params.numOfYears ? parseInt(req.params.numOfYears) : 10,
    _docType = req.params.docType ? req.params.docType : 10,
    max_year = _maxYear < _currentYear ? _maxYear + 1 : _currentYear,
    min_year = max_year - _numOfYears,
    financialData = [],
    currentYear = max_year,
    search_params = "",
    mapYearToRegEx = () => {
      let regexToYear = {};
      for (c_year = min_year; c_year < max_year + 1; c_year++) {
        let year_dec = (c_year + "").substring(2, 4);
        regexToYear[c_year] = new RegExp(
          "([0][\\d]+)-" + year_dec + "-([\\d]+)",
          "g"
        );
      }
      return utils.objToStrMap(regexToYear);
    },
    accessNumberMapRegex = mapYearToRegEx();

  //get 10-K for 10 years

  function flow() {
    let promise_arr = [],
      month = 12,
      monthCount = 18,
      tenQlastYear = max_year - 1;
    wrap = (year, type, search_params) => {
      return new Promise(function (resolve, reject) {
        get_sec_document(year, _symbolId, search_params, type, resolve, reject);
      });
    };
    while (currentYear >= min_year && currentYear <= max_year) {
      search_params =
        "&Find=Search&owner=exclude&action=getcompany&type=10-K&owner=exclude&count=1";
      promise_arr.push(wrap(currentYear, "10-K", search_params));

      currentYear--;
    }
    //get 10-Q for the last year

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
      promise_arr.push(wrap(tenQlastYear, "10-Q", search_params));
      month--;
      if (month == 0) {
        month = 12;
        tenQlastYear = tenQlastYear - 1;
      }
      monthCount--;
    }
    return promise_arr;
  }

  //after all is fetched buildjson to return
  Promise.allSettled(flow())
    .then(function (responses) {
      for (let response of responses) {
        if (
          response.status == "fulfilled" &&
          response.value &&
          response.value.data &&
          Object.keys(response.value.data).length !== 0
        ) {
          financialData.push(response.value.data);
          if (response.value.url) {
            let splitted = response.value.url.split("/");
            let fileName = splitted[splitted.length - 1];
            repository.create(
              fileName.replace(".xml", ".json"),
              response.value.data
            );
          }
        }
      }

      let extrapolations = {};
      //extrapolate a dcf relation
      if (financialData.length === 0) {
        res.send({ financialData, extrapolations, averages: {} });
        return;
      }
      let revenuesExtrapolated = extrapolate.extrapolate(
        financialData,
        "Revenues"
      );

      if (revenuesExtrapolated.length > 0) {
        extrapolations.revenuesExtrapolated = revenuesExtrapolated;
      }

      //let all = extrapolate.extrapolateAll(financialData);

      let netIncomeExtrapolated = extrapolate.extrapolate(
        financialData,
        "NetIncomeLoss"
      );

      if (netIncomeExtrapolated.length > 0) {
        extrapolations.netIncomeExtrapolated = netIncomeExtrapolated;
      }

      let liabilities = extrapolate.extrapolate(financialData, "Liabilities");

      if (liabilities.length > 0) {
        extrapolations.liabilities = liabilities;
      }

      let averages = addCalculatedAverages(financialData);

      res.send({ financialData, extrapolations, averages });
    })
    .catch((err) => {
      return res.status(400).json({ err: err.toString() });
    });

  //scrap sec web site and extract url to document
  function get_xk_url(htmlString, year, type) {
    let extractor = htmlExtractor.load(htmlString, { charset: "UTF-8" }),
      extractedText = extractor.$(".companyName").text(),
      regex = /[0]\d+/g,
      currentCik = parseFloat(regex.exec(extractedText)[0]),
      extractedAccess = extractor.$(
        "tr:contains(" + type + "):not(:contains(" + type + "/A))"
      ),
      accessNumber = accessNumberMapRegex
        .get(year.toString())
        .exec(extractedAccess);

    if (accessNumber) {
      accessNumber = accessNumber[0].replace(/-/g, "");
      return (
        "https://www.sec.gov/Archives/edgar/data/" +
        currentCik +
        "/" +
        accessNumber
      );
    } else {
      return "";
    }
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
    axios
      .get(
        "http://www.sec.gov/cgi-bin/browse-edgar?CIK=" +
          symbolId +
          search_params
      )
      .then((response) => {
        let url = get_xk_url(response.data, year, type);
        if (url) {
          return axios.get(url);
        } else {
          throw new Error("no available document" + year + "," + type);
        }
      })
      .then((response) => {
        let extractor = htmlExtractor.load(response.data, { charset: "UTF-8" }),
          html = extractor.$("#main-content").html(),
          regex = /\/Archives\/edgar\/data\/[0-9]+\/[0-9]+\/[\w]+-[0-9]+\.xml/g;
        return regex.exec(html);
      })
      .then((securl) => {
        let url = "https://www.sec.gov" + securl[0];
        //check if file exsits on files system
        let split_url = url.split("/");
        let fileName = split_url[split_url.length - 1];
        fileName = fileName.replace(".xml", ".json");
        return repository.isExists("./fs/", fileName, url);
      })
      .then((result) => {
        if (result && result.result.name) {
          let json = JSON.parse(repository.get(result.result.name));
          return { url: result.extraData, json };
        } else {
          return axios.get(result.extraData);
        }
      })
      .then((response) => {
        if (response && response.json) {
          return resolve({ url: response.url, data: response.json });
        }
        let dataRequest = { data: response.data, url: response.config.url };
        if (config.setWorker) {
          const worker = new Worker(
            path.resolve(__dirname, "./parseXbrlworker.js"),
            {
              workerData: dataRequest,
            }
          );

          worker.on("message", (message) => {
            return resolve(message);
          });
          worker.on("error", (message) => {
            console.log("Worker exit: ", message);
          });
          worker.on("exit", (code) => {
            if (code !== 0)
              return reject(new Error(`Worker stopped with exit code ${code}`));
          });
        } else {
          parseXbrl.parseStr(dataRequest.data).then((data) => {
            return resolve({ data, url: dataRequest.url });
          });
        }
      })
      .catch((err) => {
        log(err + "," + year + "," + type);
        reject(err);
      });
  }
});

function addCalculatedAverages(data) {
  let operating_Margin_sum = (workingCapital_sum = 0),
    operating_Margin_avrg = (workingCapital_avrg = 0),
    counter_opm = (counter_wc = 0),
    factor = 1;
  data.map((elm, index) => {
    if (elm.OperatingIncome > 0 && elm.Revenues > 0) {
      factor = 1;
      if (elm.DocumentType === "10-Q") {
        factor = 0.25;
      }
      operating_Margin_sum =
        operating_Margin_sum +
        Math.ceil((elm.OperatingIncome / elm.Revenues) * factor * 100) / 100;
      counter_opm++;
    }
    if (elm.WorkingCapital > 0) {
      factor = 1;
      if (elm.DocumentType === "10-Q") {
        factor = 0.25;
      }
      workingCapital_sum =
        workingCapital_sum +
        elm.WorkingCapital +
        Math.ceil(elm.WorkingCapital * factor * 100) / 100;
      counter_wc++;
    }
  });
  if (counter_opm > 0) {
    operating_Margin_avrg =
      Math.round((operating_Margin_sum / counter_opm) * 100) / 100;
  }
  if (counter_wc > 0) {
    workingCapital_avrg =
      Math.round((workingCapital_sum / counter_wc) * 100) / 100;
  }
  //enrich data object with the averages
  return { operating_Margin_avrg, workingCapital_avrg };
}

function log(msg) {
  if (config.log) {
    console.log(msg);
  }
}

module.exports = router;
