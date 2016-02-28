(function (exports) {

    exports.init = function init(api) {
        var child_process = require('child_process');
        var childPID;
        
        api.registerDataStream('webcam-stream', {
            start: function () {
                console.log('starting webcam-stream');
                var proc = child_process.spawn('/home/pi/mjpg-streamer-experimental/stream.sh', [], {});
                proc.stdout.on('data', function (data) {
                    var num = parseInt(data.toString());
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
    
    exports.tagFile = 'webcam.tag';

})(exports);
