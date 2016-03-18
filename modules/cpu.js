(function (exports) {

    exports.init = function init(api) {
        var child_process = require('child_process');
        
        api.registerDataStream('cputemp', 
            api.createProcessStream('cputemp', './cputmpstream.sh', [], processTempData, 50)
        );
        
        api.registerDataStream('top', 
            api.createProcessStream('top', 'top', ['-bid2'], processTopData)
        );
        
        api.pubsub.subscribe('pidkill', function (data) {
            if (data.pid) {
                child_process.exec('kill ' + data.pid);
            }
        });

        api.pubsub.subscribe('renice', function (data) {
            if (data.pid && !isNaN(data.ni)) {
                child_process.exec('renice ' + data.ni + ' -p ' + data.pid);
            }
        });
    }
    
    var tempRE = /temp=(\d+\.?\d*)'C/;
    var voltRE = /volt=(\d+\.?\d*)V/;
    
    function processTempData(data) {
        var result = {};
        
        var match = tempRE.exec(data);
        if (match && match[1]) {
            result.cpu_temp = parseFloat(match[1]);
        }
        
        match = voltRE.exec(data);
        if (match && match[1]) {
            result.cpu_volt = parseFloat(match[1]);
        }
        
        return result;
    }
    
    
    // process data from 'top'
    var beginRE = /^\s*top/;
    var uptimeRE = /up (([^,]+) days,)?\s*([^,]+)/;
    var collected = '';
    
    function processTopData(data) {
        // collecting chunks
        if (beginRE.test(data)) {
            collected = '';
            data = data.replace(/^\s*/, '');
        }
        collected += data;

        
        var lines = collected.split('\n');
                    
        var result = [];
        var columns = lines[6].split(/\s+/).map( (name) => name.replace(/[%\+]/g, '') );
        while (columns[0] === '') columns.shift();
        
        var cmdCol = columns.indexOf('COMMAND');
        
        var totalCPU = 0;
        
        for (var i = 7; i < lines.length; ++i) {
            var procData = lines[i].split(/\s+/);
            while (procData[0] === '') procData.shift();                
            var idx = lines[i].indexOf(procData[cmdCol]);
            procData[cmdCol] = lines[i].substr(idx);    // adding back the parameters for the 'command' column
            var obj = {};
            procData.forEach( (val, idx) => { obj[columns[idx]] = val; });
            result.push(obj);
            
            totalCPU += Number(obj['CPU']);
        }

        // memory
        var mems = lines[3].split(/\s+/);
        
        // uptime
        var upt = lines[0].match(uptimeRE);

        result.$_idField = 'PID';
        
        return { 
            cpu_perc : (totalCPU * 10 | 0) / 10,
            used_mem : (mems[4] >> 10),
            free_mem : (mems[6] >> 10),
            total_mem : (mems[2] >> 10),
            processes : result,
            uptime: (upt && upt[2] && (upt[2] + 'd ') || '') + (upt && upt[3] || '')
        };
    }


})(exports);
