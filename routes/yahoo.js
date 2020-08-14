const express = require("express");
const router = express.Router();
const axios = require("axios");
const htmlExtractor = require("html-extract-js");

router.get("/:period/:symbolId", function (req, res) {
  axios
    .get(
      "https://finance.yahoo.com/quote/" +
        req.params.symbolId +
        "/financials?ltr=1"
    )
    .then((htmlString) => {
      let extractor = htmlExtractor.load(htmlString, { charset: "UTF-8" });
      let test = extractor.$.html();
      let mtch = test.match('{"context".*:{.*:.*}}');
      let stringToConvert = mtch[0].toString();
      let json = JSON.parse(stringToConvert.replace(/[\u0019]/g, ""));
      let data = json.context.dispatcher.stores.QuoteSummaryStore;
      let filteredData = {};

      if (req.params.period === "q") {
        filteredData["balanceSheetHistory"] =
          data["balanceSheetHistoryQuarterly"].balanceSheetStatements;
        filteredData["cashflowStatementHistory"] =
          data["cashflowStatementHistoryQuarterly"].cashflowStatements;
        filteredData["incomeStatementHistory"] =
          data["incomeStatementHistoryQuarterly"].incomeStatementHistory;
      } else {
        filteredData["balanceSheetHistory"] =
          data["balanceSheetHistory"].balanceSheetStatements;
        filteredData["cashflowStatementHistory"] =
          data["cashflowStatementHistory"].cashflowStatements;
        filteredData["incomeStatementHistory"] =
          data["incomeStatementHistory"].incomeStatementHistory;
      }
      var balance = filteredData["balanceSheetHistory"].map(function (
        tdo,
        index,
        arr
      ) {
        return transpose(tdo, index, arr);
      });
      var cashFlow = filteredData["cashflowStatementHistory"].map(function (
        tdo,
        index,
        arr
      ) {
        return transpose(tdo, index, arr);
      });
      var incomeStatement = filteredData["incomeStatementHistory"].map(
        function (tdo, index, arr) {
          return transpose(tdo, index, arr);
        }
      );

      res.send({ balance, cashFlow, incomeStatement });

      function transpose(tdo, index, arr) {
        let endDate = null;
        for (let key in tdo) {
          if (key === "endDate") {
            endDate = tdo[key].fmt;
          }

          tdo[key] = tdo[key].raw;
        }
        return { endDate, tdo };
      }
    })
    .catch((err) => {
      console.error(err);
    });
});

module.exports = router;
