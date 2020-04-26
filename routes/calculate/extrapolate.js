const financialCalculator = require("./financialCalculator");

module.exports.extrapolate = (data, field) => {
  if (!data) return [];

  return financialCalculator
    .polynomial_extrapolation(data, field)
    .map((elm) => {
      return {
        value: elm[field],
        fiscalYear: elm.fiscalYear,
      };
    });
};

module.exports.extrapolateAll = (data) => {
  if (!data) return [];
  let fields = data[0];
  let result = Object.keys(fields)
    .filter(
      (name) =>
        !isNaN(fields[name]) &&
        name !== "DocumentFiscalYearFocus" &&
        name != "ContextForInstants"
    )
    .map((name) =>
      financialCalculator.polynomial_extrapolation(data, name).map((elm) => {
        return {
          value: elm[name],
          fiscalYear: elm.fiscalYear,
        };
      })
    );
  return result;
};
