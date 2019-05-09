module.exports = {
     objToStrMap(obj) {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    },
    insertOrdered(array, elem) {
        let _array = array;
        let i = 0;
        while ( i < array.length && array[i] < elem ) {i ++};
        _array.splice(i, 0, elem);
        return _array;
    },
    dynamicCompareForSort(key, order='asc') {
        return function(a, b) {
          if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
            // property doesn't exist on either object
            return 0;
          }
      
          const varA = (typeof a[key] === 'string') ?
            a[key].toUpperCase() : a[key];
          const varB = (typeof b[key] === 'string') ?
            b[key].toUpperCase() : b[key];
      
          let comparison = 0;
          if (varA > varB) {
            comparison = 1;
          } else if (varA < varB) {
            comparison = -1;
          }
          return (
            (order == 'desc') ? (comparison * -1) : comparison
          );
        };
      }
      
      
}