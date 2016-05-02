"use strict";
(function (exports) {

    exports.init = function init(api) {
        api.registerDataStream('nettop', 
            api.createProcessStream('nettop', 'nethogs', ['-t'], processData, 50)
        );
    }
    
    const passwdRE = /([^:]+):x:(\d+):/;
    
    const userId2Name = require('fs').readFileSync('/etc/passwd', 'utf8').split('\n').reduce( (map, line) => {
        const match = passwdRE.exec(line);
        if (match && match.length === 3) {
            map[match[2]] = match[1];
        }
        return map;
    }, {});

    const lineRE = /(.*)\/(\d+)\/(\d+)\s+([0-9.]+)\s+([0-9.]+)/;
    
    function processData(data) {
        const lines = data.split('\n');

        const result = [];
        
        let totalSent = 0, totalRecv = 0;
        
        for (let i = 0; i < lines.length; ++i) {
            const procData = lineRE.exec(lines[i]);
            
            if (!procData || procData.length !== 6) continue;

            const sent = Number(procData[4]);
            const recv = Number(procData[5]);

            if (isNaN(sent) || isNaN(recv)) continue;
            
            const obj = {
                program:procData[1],
                PID:    procData[2],
                user:    userId2Name[procData[3]],
                sent:    sent,
                recv:    recv
            };

            totalSent += sent;
            totalRecv += recv;
            
            result.push(obj);
        }
        
        if (result.length === 0) return;
        
        result.$_idField = 'PID';
        
        return {
            tot_sent : (totalSent*10 | 0)/10,
            tot_recv : (totalRecv*10 | 0)/10,                
            processes : result
        };

    }
    
})(exports);
