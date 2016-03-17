var express = require('express');
var app = express();
var child_process = require('child_process');
var PubSub = require('./static/PubSub'); 
var WsPubSubServer = require('./WsPubSubServer');
var basicAuth = require('basic-auth-connect');
var fs = require('fs');
var riot = require('riot');

// install our custom parser
riot.parsers.js.es6arrow = require('./es6arrow');

var compiled_tags = [];

app.use(basicAuth('pi', 'berry'));
app.use(express.static('static'));
app.use('/modules', express.static('node_modules'));

// we serve all the compiled tag files as a single riot-tags.js
app.get('/riot-tags.js', function (req, res) {
    res.send(compiled_tags.join('\n'));
});

var server = app.listen(3000, function () {
  var port = server.address().port;
  console.log('PiGod server listening on port %s', port);
});


var pubsub = new PubSub();
var wsServer = new WsPubSubServer(server, pubsub);

var startedProcesses = [];

function registerProcess(proc) {
    startedProcesses.push(proc);
}

function killStartedProc(proc) {
    if (!proc) return;
    
    if (typeof proc === 'number') {
        console.log('Killing process PID: ' + proc);
        process.kill(proc);
    } else if (typeof proc === 'object') {
        console.log('Killing process PID: ' + proc.pid);
        proc.kill();
    }
    var idx = startedProcesses.indexOf(proc);
    if (idx >= 0) startedProcesses.splice(idx, 1);
}

function collectData(millis, callback) {
    var collected = '';
    var timerId = null;
    
    return function (data) {
        collected += data.toString();
        if (!timerId) {
            timerId = setTimeout(function () {
                timerId = null;
                callback(collected);
                collected = '';
            }, millis);
        }
    };
}

function createProcessStream(channel, cmd, args, processFn, bufferMillis, sendStdErr) {

    return {
        start: function () {
            console.log('starting stream', cmd, args);    
            var proc = child_process.spawn(cmd, args, { cwd: 'modules' });

            var collectFunc = function (data) {
                var dataToSend = processFn ? processFn(data.toString()) : data.toString();
                if (dataToSend) pubsub.publish(channel, dataToSend);
            };
            
            if (bufferMillis) collectFunc = collectData(bufferMillis, collectFunc);
            
            proc.stdout.on('data', collectFunc);
            if (sendStdErr) proc.stderr.on('data', collectFunc);
            
            console.log('PID: ' + proc.pid);
            
            registerProcess(this.proc = proc);
        },
        
        stop: function () {
            console.log('stopping stream', cmd, args);
            killStartedProc(this.proc);
        }
    };
}

var dataStreams = {}; 

function registerDataStream(channel, api) {
    dataStreams[channel] = api;
}

pubsub.on('startChannel', function (channel) {
    var stream = dataStreams[channel];
    if (stream) stream.start();
});

pubsub.on('stopChannel', function (channel) {
    var stream = dataStreams[channel];
    if (stream) stream.stop();
});

var serverApi = {
    pubsub: pubsub,
    createProcessStream: createProcessStream,
    registerProcess: registerProcess,
    registerDataStream: registerDataStream,
    killStartedProc: killStartedProc
};

// load modules
fs.readdir('./modules', function (err, files) {
    if (err) {
        err = 'Error: Could not read modules folder.\n' + err;
        console.log(err);
        throw new Error(err);
    }
    
    files.forEach(function (fileName) {
        if (/\.js$/.test(fileName)) {
            console.log('Loading module ' + fileName);
            try {
                var module = require('./modules/' + fileName);
                module.init(serverApi);
                if (module.tagFile) loadTag('./modules/' + module.tagFile);
            } catch (err) {
                console.log(`Error: Could not initialize module ${fileName}.\n${err}`);
            }
        }
    });
    
});

function loadTag(fileName) {
    try {
        compiled_tags.push(riot.compile(fs.readFileSync(fileName, 'utf8'), {}, fileName));
    } catch (err) {
        console.log(`Error loading or compiling riot tag file "${fileName}".\n${err}`);
    }
}

// cleanup code
function cleanup() {
    console.log('Cleanup..');
    while (startedProcesses.length > 0) killStartedProc(startedProcesses[0]);
    process.exit();
}

process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', cleanup);
