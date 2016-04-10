"use strict";
const WebSocketServer = require('ws').Server;
const Diff = require('./static/Diff');

function WsPubSubServer(server, pubsub) {
    this.pubsub = pubsub;

    pubsub.on('publish', this.pubsubPublish.bind(this));

    this.clients = [];
    this.states = {};
    this.start(server);
}

const proto = WsPubSubServer.prototype;

proto.start = function (server) {
    const me = this;
    const wss = this.wss = new WebSocketServer({ server: server });
    
    wss.on('connection', function (ws) {
        const client = {
            ws: ws,
            channels: {}
        };
        
        me.clients.push(client);
        
        ws.on('message', function (msg) {
            me.onMessage(msg, client);
        });
        
        ws.on('close', function () {
            me.onClose(client);
        });
    });
};

proto.onMessage = function(msg, client) {
    //console.log('got message', msg);
    const data = JSON.parse(msg);
    
    switch (data.action) {
        case 'subscribe': this.subscribe(data.channel, client);
            break;
        case 'unsubscribe': this.unsubscribe(data.channel, client);
            break;
        case 'publish': this.publish(data.channel, data.payload, client);
            break;
    }
};

proto.onClose = function (client) {
    Object.keys(client.channels).forEach(channel => {
        this.unsubscribe(channel, client);
    });
    const idx = this.clients.indexOf(client);
    this.clients.splice(idx, 1);
};

proto.pubsubPublish = function (channel, data) {
    const diff = Diff.getDiff(this.states[channel], data);
    this.states[channel] = data;
    
    if (diff !== Diff.NODIFF_OBJ) {
        const msg = JSON.stringify({ channel: channel, payload: diff });
        
        this.clients.forEach(client => {
            if (this.publishingClient !== client && client.channels[channel]) {
                client.ws.send(msg);
            }
        });
    }
};

proto.subscribe = function(channel, client) {
    if (!client.channels[channel]) {
        client.channels[channel] = true;
        
        this.pubsub.subscribe(channel);
        
        // send current state
        const state = this.states[channel];
        if (state) {
            client.ws.send(JSON.stringify({ channel: channel, payload: state }));
        }
    }
};

proto.unsubscribe = function(channel, client) {
    if (client.channels[channel]) {
        client.channels[channel] = false;
        this.pubsub.unsubscribe(channel);
    }
};

proto.publish = function (channel, data, client) {
    this.publishingClient = client;
    this.pubsub.publish(channel, data); // this triggers pubsubPublish()
    this.publishingClient = null;
};



if (typeof module !== 'undefined') module.exports = WsPubSubServer; 
else (this.pigod || (this.pigod = {})).WsPubSubServer = WsPubSubServer;


