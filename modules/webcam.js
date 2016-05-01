"use strict";
(function (exports) {

    exports.init = function init(api) {
        const child_process = require('child_process');
        let childPID;
        
        api.registerDataStream('webcam-stream', {
            start: function () {
                console.log('starting webcam-stream');
                const proc = child_process.spawn('/home/pi/mjpg-streamer-experimental/stream.sh', [], {});
                proc.stdout.on('data', function (data) {
                    const num = parseInt(data.toString());
                    if (!isNaN(num)) {
                        childPID = num;
                        console.log('wcPID: ' + childPID);
                        api.registerProcess(childPID);
                    }
                });
            },
            
            stop: function () {
                if (childPID) {
                    console.log('stopping webcam-stream');
                    api.killStartedProc(childPID);
                }
            }
        });
    }
    
})(exports);
