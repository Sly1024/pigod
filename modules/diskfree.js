(function (exports) {

    exports.init = function init(api) {
        api.registerDataStream('diskfree', 
            api.createProcessStream('diskfree', './dfstream.sh', [], processData, 0, true)
        );
    }
    
    exports.tagFile = 'diskfree.tag';
    
    var prevData = '';
    
    function processData(data) {
        // only send data if it's changed
        if (data == prevData) return null;
        prevData = data;
        
        var lines = data.split('\n');
        var rows = [];

        var columnNames = lines[0].split(/\s+/);
        // collapse "Mounted on" to one column
        var clen = columnNames.length;
        columnNames[clen-2] += ' ' + columnNames[clen-1];
        columnNames.length--;
        
        var columns = columnNames.map(x => x.replace(/[% ]/g, ''));
        
        for (var i = 1; i < lines.length; ++i) {
            var values = lines[i].split(/\s+/);
            if (values.length < columns.length) continue;
            
            var obj = {};
            values.forEach((val, idx) => { obj[columns[idx]] = val; });
            rows.push(obj);
        }
        
        return {
            columns: columns.map((key, idx) => ({ key: key, header: columnNames[idx] })),
            rows: rows
        };
    }

})(exports);
