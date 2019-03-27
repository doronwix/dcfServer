const utils = require("../utils");
var linear = require('everpolate').linear;
var linearRegression = require('everpolate').linearRegression;

/* module.exports.py_calculate = function(mergedReportsObject, resolve, reject) {
  let mappedData = utils.objToStrMap(mergedReportsObject);
  let x = [],
    y = [];

  mappedData.forEach(function(value, key) {
    if (
      value.DocumentType === "10-K" &&
      !isNaN(value.DocumentFiscalYearFocus)
    ) {
      x.push(parseInt(value.DocumentFiscalYearFocus, 10));
      y.push(parseFloat(value.Revenues));
    }
  });
  var spawn = require("child_process").spawn,
    py = spawn("python", [
      "./routes/calculate/calculator.py",
      JSON.stringify(x),
      JSON.stringify(y)
    ]);
  py.stdout.on("data", function(data) {
    resolve(data.toString());
  });
}; */

module.exports.linear_extrapolation = function(mergedReportsObject, resolve, reject) {
  let mappedData = mergedReportsObject.sort(utils.dynamicCompareForSort("DocumentFiscalYearFocus","asc"));
  let x = [],
    y = [],
    final = [];

  mappedData.forEach(function(value, key) {
    if (value.DocumentType === "10-K" && !isNaN(value.DocumentFiscalYearFocus)) {
      let fiscalYear = parseInt(value.DocumentFiscalYearFocus, 10);
      let revenues = parseFloat(value.Revenues)
      if(revenues>0){
        x.push(fiscalYear);
        y.push(revenues);
        final.push({fiscalYear, revenues });
      }
    }
  });
  let currentYear = new Date().getFullYear(); 
  let years =[];
  for (year=currentYear; year< currentYear + 5; year++ )
  {
    years.push(year);
  }
  //var result = linear([...years], x, y);
  var result = linearRegression(x, y);
  result = result.evaluate([...years]);
  result.map((revenues,index) => final.push({fiscalYear:currentYear + index, revenues }));
    
 
  resolve(final);
};