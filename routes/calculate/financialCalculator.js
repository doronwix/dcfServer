const utils = require("../utils");
const linearRegression = require("everpolate").linearRegression;
const PolynomialRegression = require("ml-regression-polynomial");

module.exports.linear_extrapolation = function (mergedReportsObject, field) {
  let mappedData = mergedReportsObject.sort(
      utils.dynamicCompareForSort("DocumentFiscalYearFocus", "asc")
    ),
    extrapolated_filed_per_year = [];

  let x = [],
    y = [],
    final = [],
    currentYear = new Date().getFullYear(),
    years = [],
    result;

  mappedData.forEach(function (value, key) {
    if (
      value.DocumentType === "10-K" &&
      !isNaN(value.DocumentFiscalYearFocus)
    ) {
      let fiscalYear = parseInt(value.DocumentFiscalYearFocus, 10);
      let temp_y = parseFloat(value[field]);
      if (temp_y) {
        x.push(fiscalYear);
        y.push(temp_y);
        final.push({ fiscalYear, [field]: temp_y });
      }
    }
  });

  for (year = currentYear; year < currentYear + 5; year++) {
    years.push(year);
  }

  let temp = linearRegression(x, y);
  result = temp.evaluate([...years]);
  result.map((val, index) =>
    final.push({ fiscalYear: currentYear + index, [field]: val })
  );
  extrapolated_filed_per_year.push(final);
  return final;
};

module.exports.polynomial_extrapolation = function (
  mergedReportsObject,
  field
) {
  let mappedData = mergedReportsObject.sort(
      utils.dynamicCompareForSort("DocumentFiscalYearFocus", "asc")
    ),
    extrapolated_filed_per_year = [];

  let x = [],
    y = [],
    final = [],
    currentYear = new Date().getFullYear(),
    years = [],
    result;

  mappedData.forEach(function (value, key) {
    if (
      value.DocumentType === "10-K" &&
      !isNaN(value.DocumentFiscalYearFocus)
    ) {
      let fiscalYear = parseInt(value.DocumentFiscalYearFocus, 10);

      let temp_y = parseFloat(value[field]);
      if (temp_y) {
        x.push(fiscalYear);
        y.push(temp_y);
        final.push({ fiscalYear, [field]: temp_y });
      }
    }
  });

  for (year = currentYear; year < currentYear + 5; year++) {
    years.push(year);
  }

  const temp = new PolynomialRegression(x, y, 2);
  result = [...years].map((year) => temp.predict(year));
  result.map((val, index) =>
    final.push({ fiscalYear: currentYear + index, [field]: val })
  );
  extrapolated_filed_per_year.push(final);
  return final;
};
