(function (exports) {

    exports.tagFile = 'net.html';

    exports.init = function init(api) {
        api.registerDataStream('nettop', 
            api.createProcessStream('nettop', 'nethogs', ['-d2'], processData)
        );
    }

    var beginRE = /^\s*NetHogs/;
    var collected = '';
    
    function processData(data) {
        data = data.replace(/\[4;1H/g, '\n').replace(/\[[\d;]*[A-Za-z]|\(B|\u001b/g, ' ');
        // collecting chunks
        if (beginRE.test(data)) {
            collected = '';
            data = data.replace(/^\s*/, '');
        }
        collected += data;

        
        var lines = collected.split('\n');

        if (lines.length < 3) return;
        
        var result = [];
        var columns = lines[2].split(/\s+/);
        while (columns[0] === '') columns.shift();
        
        var totalSent = 0, totalRecv = 0;
        
        for (var i = 3; i < lines.length; ++i) {
            var procData = lines[i].split(/\s+/);    
            while (procData[0] === '') procData.shift();
            
            if (procData.length == 0 || procData[0] == 'TOTAL') continue;
            
            var idx = procData.indexOf('KB/sec');
            if (idx == -1) continue;
            while (idx < 6) { procData.splice(idx-2, 0, ''); ++idx; }
            while (idx > 6) { procData[idx-5] += ' ' + procData.splice(idx-4, 1); --idx; }
            
            if (!Number(procData[4]) && !Number(procData[5])) continue;
            
            var sent = Number(procData[4]);
            var recv = Number(procData[5]);
            
            if (!isNaN(sent)) totalSent += sent;
            if (!isNaN(recv)) totalRecv += recv;
            
            //procData[4] += ' K/s';
            //procData[5] += ' K/s';

            var obj = {};
            procData.forEach( (val, idx) => { obj[columns[idx]] = val; });
            result.push(obj);
        }
        
        result.$_idField = 'PID';
        
        return {
            tot_sent : (totalSent*10 | 0)/10,
            tot_recv : (totalRecv*10 | 0)/10,                
            processes : result
        };

    }
    
})(exports);
