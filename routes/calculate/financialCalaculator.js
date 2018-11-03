
const utils = require('../utils');

module.exports.calculate = function(mergedReportsObject, resolve,reject){
     let mappedData = utils.objToStrMap(mergedReportsObject);
     let x =[],y=[];

    mappedData.forEach(function(value, key) {
        if (value.DocumentType === "10-K" && !isNaN(value.DocumentFiscalYearFocus)){
            x.push(parseInt(value.DocumentFiscalYearFocus,10));
            y.push(parseFloat(value.Revenues));
        }    
    });
    var spawn = require('child_process').spawn,
        py = spawn('python', ['./routes/calculate/calculator.py',
             JSON.stringify(x), JSON.stringify(y)
        ]);
        py.stdout.on('data', function (data) {
            resolve(data.toString());
        })
}