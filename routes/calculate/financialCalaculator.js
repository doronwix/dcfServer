const extrapolate = require('../../vendor/extrapolate');
const utils = require('../utils');

module.exports.calculate = function(obj){
    let mappedData = utils.objToStrMap(obj);
    let predict = new extrapolate.LINEAR();

    mappedData.forEach(function(value, key) {
        if (value.DocumentType === "10-K"){
            predict.given(value.DocumentFiscalYearFocus).get(value.Revenues);
        }    
    });
    console.log(predict.valueFor('2019'));
    console.log(predict.valueFor('2020'));
    console.log(predict.valueFor('2021'));
}