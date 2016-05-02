(function (riot, Diff) {

    function WsPubSubClient(hostPort, pubsub) {
        riot.observable(this);
        this.pubsub = pubsub;
        
        pubsub.on('startChannel', this.startChannel.bind(this));
        pubsub.on('stopChannel', this.stopChannel.bind(this));
        pubsub.on('publish', this.publish.bind(this));
        
        this.states = {};
        this.wsQ = [];  // WebSocket message queue
        this.connect(hostPort);
    }

    var proto = WsPubSubClient.prototype;

    proto.startChannel = function(channel) {
        this.send({ action: 'subscribe', channel: channel } );
    };
    
    proto.stopChannel = function(channel) {
        this.states[channel] = null;
        this.send({ action: 'unsubscribe', channel: channel } );
    };
    
    proto.publish = function(channel, data) {
        if (!this.ignorePublish) this.send({ action: 'publish', channel: channel, payload: data });
    };
    
    proto.connect = function (hostPort) {
        console.log('[wsPubSub] Connecting to WebSocket...');
        
        var me = this;
        var ws = this.ws = new WebSocket('ws://' + hostPort);
        var wsQ = this.wsQ;
        
        ws.onopen = function() {
            console.log('[wsPubSub] WebSocket open.');
            if (wsQ.length) {
                wsQ.forEach(ws.send, ws);
                wsQ.length = 0;
            }
            
            me.states = {};
            
            if (me.resubscribe) {
                me.resubscribe = false;
                var subs = me.pubsub.subs;
                for (var channel in subs) if (subs[channel] > 0) {
                    me.startChannel(channel);
                }
            }
        };

        ws.onmessage = function (msg) {
            var data = JSON.parse(msg.data);

            // if (data.action === 'publish')  -- Nothing else comes from the server, so I removed this field

            var channel = data.channel;
            if (channel && data.payload) {
                me.ignorePublish = true;
                var applied = Diff.applyDiff(me.states[channel], data.payload);
                me.states[channel] = applied;
                me.pubsub.publish(channel, applied);
                me.ignorePublish = false;
            } else {
                throw new Error('[wsPubSubClient] unidentified msg ' + msg);
            }            
        };
        
        ws.onclose = function () {
            console.log('[wsPubSub] WebSocket closed.');
            me.reconnect(hostPort);
        };
        
        ws.onerror = function (err) {
            console.log('[wsPubSub] WebSocket Error: ', err);
            me.trigger('error', err);
        };
    };
    
    proto.reconnect = function (hostPort) {
        console.log('[wsPubSub] Trying to reconnect in 2 sec...');
        
        var me = this;
        me.resubscribe = true;  
        
        setTimeout(function () {
            me.connect(hostPort);
        }, 2000);
    };
    
    proto.send = function (data) {
        var ws = this.ws;
        var str = JSON.stringify(data);
        if (ws.readyState === 1) ws.send(str); else this.wsQ.push(str);
    };
        
    if (typeof module !== 'undefined') module.exports = WsPubSubClient; 
    else (this.pigod || (this.pigod = {})).WsPubSubClient = WsPubSubClient;
    
})(
    this.riot || require('riot'),
    pigod.Diff || require('Diff')
);