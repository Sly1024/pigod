"use strict";
(function (exports) {

    exports.init = function init(api) {
        api.registerDataStream('diskfree', 
            api.createProcessStream('diskfree', './dfstream.sh', [], processData, 0, true)
        );
    }
    
    function processData(data) {        
        const lines = data.split('\n');
        const rows = [];

        const columnNames = lines[0].split(/\s+/);
        // collapse "Mounted on" to one column
        const clen = columnNames.length;
        columnNames[clen-2] += ' ' + columnNames[clen-1];
        columnNames.length--;
        
        const columns = columnNames.map(x => x.replace(/[% ]/g, ''));
        
        for (let i = 1; i < lines.length; ++i) {
            const values = lines[i].split(/\s+/);
            if (values.length < columns.length) continue;
            
            const obj = {};
            values.forEach((val, idx) => { obj[columns[idx]] = val; });
            rows.push(obj);
        }
        
        rows.$_idFunc = (item) => item['Filesystem']+item['Mountedon'];
        
        return {
            rows: rows
        };
    }

})(exports);
