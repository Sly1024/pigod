(function (exports) {

    exports.tagFile = 'io.html';

    exports.init = function init(api) {
        api.registerDataStream('iotop', 
            api.createProcessStream('iotop', 'iotop', ['-bod2'], processData)
        );
    }
    
    var units = { 'B/s': 1, 'K/s': 1000, 'M/s': 1000000 };
    var collected = '';
    var beginRE = /^\s*Total DISK READ/;

    function processData(data) {
        // collecting chunks
        if (beginRE.test(data)) {
            collected = '';
            data = data.replace(/^\s*/, '');
        }
        collected += data;

        // processing
        var lines = collected.split('\n');
        
        var result = [];
        var columns = lines[1].split(/\s+/);
        while (columns[0] === '') columns.shift();
        
        // 
        var ridx = columns.indexOf('READ');
        columns[ridx-1] = 'READ';
        columns[ridx] = 'READ_UNIT';

        var widx = columns.indexOf('WRITE');
        columns[widx-1] = 'WRITE';
        columns[widx] = 'WRITE_UNIT';
        
        var cmdCol = columns.indexOf('COMMAND');
        
        for (var i = 2; i < lines.length-1; ++i) {
            var procData = lines[i].replace(/ %/g, '%').split(/\s+/);    // fixing '0.00 %' values into one column                
            while (procData[0] === '') procData.shift();
            var idx = lines[i].indexOf(procData[cmdCol]);
            procData[cmdCol] = lines[i].substr(idx);    // adding back the parameters for the 'command' column
            var obj = {};
            procData.forEach( (val, idx) => { obj[columns[idx]] = val; });
            obj.READ += ' ' + obj.READ_UNIT;
            obj.WRITE += ' ' + obj.WRITE_UNIT;
            result.push(obj);
        }
        
        var total = lines[0].split(/\s+/);        
                
        return {
            total_read: Number(total[3]) * units[total[4]] / 1000,
            total_write: Number(total[9]) * units[total[10]] / 1000,
            io_read : total[3] + ' ' + total[4],
            io_write : total[9] + ' ' + total[10],
            processes : result
        };
    }

})(exports);
