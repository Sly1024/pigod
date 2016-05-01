"use strict";

const express = require('express');
const app = express();
const child_process = require('child_process');
const PubSub = require('./static/PubSub'); 
const WsPubSubServer = require('./WsPubSubServer');
const basicAuth = require('basic-auth-connect');
const fs = require('fs');
const riot = require('riot');

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

const readFile = promisify(fs.readFile);
const static_cache = require('./static_cache')(readFile, riot_filename);

app.get('/', (req, res) => {
    static_cache.indexPromise.then(indexHtml => res.send(indexHtml));
});

// we serve all the compiled tag files as a single riot-tags.js
app.get(riot_filename, (req, res) => {
    riotTagsPromise.then(riot_content => res.send(riot_content));
});

app.get('/static-and-riot-tags.js', (req, res) => {
    Promise.all([static_cache.filesPromise, riotTagsPromise]).then(contents => res.send(contents[0] + contents[1]));
});

app.use(express.static('static'));
app.use('/modules', express.static('node_modules'));


const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log('PiGod server listening on port %s', port);
});


const pubsub = new PubSub();
const wsServer = new WsPubSubServer(server, pubsub);

const startedProcesses = [];

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
    const idx = startedProcesses.indexOf(proc);
    if (idx >= 0) startedProcesses.splice(idx, 1);
}

function collectData(millis, callback) {
    let collected = '';
    let timerId = null;
    
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
            const proc = child_process.spawn(cmd, args, { cwd: 'modules' });

            let collectFunc = function (data) {
                const dataToSend = processFn ? processFn(data.toString()) : data.toString();
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

const dataStreams = {}; 

function registerDataStream(channel, api) {
    dataStreams[channel] = api;
}

pubsub.on('startChannel', (channel) => {
    const stream = dataStreams[channel];
    if (stream) stream.start();
});

pubsub.on('stopChannel', (channel) => {
    const stream = dataStreams[channel];
    if (stream) stream.stop();
});

const serverApi = {
    pubsub: pubsub,
    createProcessStream: createProcessStream,
    registerProcess: registerProcess,
    registerDataStream: registerDataStream,
    killStartedProc: killStartedProc
};

const riotTagsPromise = require('./load_modules')(readFile, promisify(fs.readdir), serverApi);

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
