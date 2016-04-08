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

app.use(basicAuth('pi', 'berry'));

const riot_filename = '/riot-tags.js'; 


function promisify(func) {
    return function () {    // <- Don't use arrow function here!
        return new Promise((resolve, reject) => {
            try {
                func.apply(this, [].slice.call(arguments).concat((err, data) => err ? reject(err) : resolve(data) ));
            } catch (err) {
                reject(err);
            }
        });
    };
}

var readFile = promisify(fs.readFile);
var static_cache = require('./static_cache')(readFile, riot_filename);

app.get('/', function (req, res) {
    static_cache.indexPromise.then(p => res.send(p.index));
});

// we serve all the compiled tag files as a single riot-tags.js
app.get(riot_filename, function (req, res) {
    riotTagsPromise.then(riot_content => res.send(riot_content));
});

app.get('/static-and-riot-tags.js', function (req, res) {
    Promise.all([static_cache.filesPromise, riotTagsPromise]).then(contents => res.send(contents[0] + contents[1]));
});

app.use(express.static('static'));
app.use('/modules', express.static('node_modules'));


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

var riotTagsPromise = require('./load_modules')(readFile, promisify(fs.readdir), serverApi);

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
