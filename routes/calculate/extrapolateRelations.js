const financialCalculator = require("./financialCalculator");

module.exports = (data, field1, field2='', oper='-') => {

    if (!data)
        return [];

    if (!field2){
        return financialCalculator.linear_extrapolation(
            data,
            field1
          ).map((elm) => {
            return {
                value: elm[field1],
                fiscalYear: elm.fiscalYear
            };
        })
    }


    var operators = {
      '+': function(a, b) { return a + b },
      '-': function(a, b) { return a - b },
      '*': function(a, b) { return a * b },
      ':': function(a, b) { return a / b }
    }; 
  
    let extrapolation1 = financialCalculator.linear_extrapolation(
      data,
      field1
    );

    let extrapolation2 = financialCalculator.linear_extrapolation(
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

   