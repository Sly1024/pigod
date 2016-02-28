(function (exports) {

    var Observable = pigod.Observable;

    function wsPubSubClient(hostPort) {
        Observable.call(this);
        this.subs = new Observable();
        this.wsQ = [];
        this.subscribedChannels = [];
        this.connect(hostPort);
    }

    (function (proto) {

        proto.subscribe = function(channel, handler) {
            if (this.subs.on(channel, handler) === 1) {
                this.send({ action: 'subscribe', channel: channel } );
                this.subscribedChannels.push(channel);
                this.fire('subscribe', [channel, this.subscribedChannels]);
            }
        };
        
        proto.unsubscribe = function(channel, handler) {
            if (this.subs.off(channel, handler) === 0) {
                this.send({ action: 'unsubscribe', channel: channel } );
                
                var idx = this.subscribedChannels.indexOf(channel);
                if (idx >= 0) this.subscribedChannels.splice(idx, 1);
                
                this.fire('unsubscribe', [channel, this.subscribedChannels]);
            }
        };
        
        proto.publish = function(channel, data) {
            this.subs.fire(channel, [data]);
            this.send({ action: 'publish', channel: channel, payload: data });
        };
        
        proto.connect = function (hostPort) {
            var me = this;
            var ws = this.ws = new WebSocket('ws://' + hostPort);
            var wsQ = this.wsQ;
            
            ws.onopen = function() {
                if (wsQ.length) {
                    wsQ.forEach(ws.send, ws);
                    wsQ.length = 0;
                }
            };

            ws.onmessage = function (msg) {
                var data = JSON.parse(msg.data);
                if (data.action === 'publish') {
                    if (data.channel && data.payload) {
                        me.subs.fire(data.channel, [data.payload]);
                    } else {
                        throw new Error('[wsPubSubClient] unidentified msg ' + msg);
                    }
                }
            };
            
            // ws.onclose = function () {}; -- reconnect??
        };
        
        proto.send = function (data) {
            var ws = this.ws;
            var str = JSON.stringify(data);
            if (ws.readyState === 1) ws.send(str); else this.wsQ.push(str);
        };
        
    })(wsPubSubClient.prototype = Object.create(Observable.prototype));
    
    exports.wsPubSubClient = wsPubSubClient;
    
})(typeof exports === 'object' ? exports : this.pigod);