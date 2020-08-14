const express = require("express");
const router = express.Router();

const yahooStockPrices = require("yahoo-stock-prices");

router.get("/:symbolId/:maxYear?", function (req, res) {
  let symbolId = req.params.symbolId;
  let maxYear = req.params.maxYear;
  if (maxYear) {
    yahooStockPrices.getHistoricalPrices(
      1,
      1,
      maxYear - 5,
      12,
      31,
      maxYear,
      symbolId,
      "1d",
      function (err, prices) {
        res.send({ prices });
      }
    );
  }

  yahooStockPrices.getCurrentPrice(symbolId, function (err, price) {
    res.send({ price });
  });

  if (!symbolId) {
    res.send("please send symbol");
    return;
  }
});
module.exports = router;
