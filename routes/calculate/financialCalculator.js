const utils = require("../utils");
const linear = require('everpolate').linear;
const linearRegression = require('everpolate').linearRegression;

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

module.exports.linear_extrapolation = function(mergedReportsObject, field) {
  let mappedData = mergedReportsObject.sort(utils.dynamicCompareForSort("DocumentFiscalYearFocus","asc")),
  extrapolated_filed_per_year = [];

  
    let x = [],
    y = [],
    final = [],
    currentYear = new Date().getFullYear(),
    years = [],
    result;

    mappedData.forEach(function(value, key) {
      if (value.DocumentType === "10-K" && !isNaN(value.DocumentFiscalYearFocus)) {
        let fiscalYear = parseInt(value.DocumentFiscalYearFocus, 10);
        let temp_y = parseFloat(value[field])
        if(temp_y){
          x.push(fiscalYear);
          y.push(temp_y);
          final.push({fiscalYear, [field]: temp_y });
        }
      } 
    });

    for (year=currentYear; year< currentYear + 5; year++ )
    {
      years.push(year);
    }

    let temp = linearRegression(x, y);
    result = temp.evaluate([...years]);
    result.map((val,index) => final.push({fiscalYear:currentYear + index, [field]: val }));
    extrapolated_filed_per_year.push(final)  
    return final;
  
};