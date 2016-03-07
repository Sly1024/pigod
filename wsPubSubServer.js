(function (exports) {

	var riot = require('riot');
    var WebSocketServer = require('ws').Server;

    function wsPubSubServer(server) {
        riot.observable(this);
        
        this.subs = riot.observable();
        this.start(server);
    }

    (function (proto) {

        proto.subscribe = function(channel, handler) {
			this.subs.on(channel, handler);
            if (!this.subs[channel]) {
				this.subs[channel] = 0;
                this.trigger('startChannel', channel);
            }
			this.subs[channel]++;
        };
        
        proto.unsubscribe = function(channel, handler) {
			this.subs.off(channel, handler);
            if (--this.subs[channel] === 0) {
                this.trigger('stopChannel', channel);
            }
        };
        
        proto.publish = function(channel, data, targetWs, sourceWs) {
            this.subs.trigger(channel, data, targetWs, sourceWs);
        };
        
        proto.start = function (server) {
            var me = this;
            var wss = this.wss = new WebSocketServer({ server: server });
            
            wss.on('connection', function (ws) {
                var handlers = {};
                
                ws.on('message', function (msg) {
                    me.onMessage(msg, ws, handlers);
                });
                
                ws.on('close', function () {
                    for (var channel in handlers) {
                        me.clientUnsubscribe(channel, ws, handlers);
                    }
                });
            });
        };
        
        proto.onMessage = function(msg, ws, handlers) {
            //console.log('got message', msg);
            var data = JSON.parse(msg);
            
            switch (data.action) {
                case 'subscribe': this.clientSubscribe(data.channel, ws, handlers);
                    break;
                case 'unsubscribe': this.clientUnsubscribe(data.channel, ws, handlers);
                    break;
                case 'publish': this.publish(data.channel, data.payload, null, ws);
                    break;
            }
        };
        
        proto.clientSubscribe = function(channel, ws, handlers) {
            var handler = function(data, targetWs, sourceWs) {
                if ((!targetWs || ws === targetWs) && ws !== sourceWs && ws.readyState === 1) {
                    ws.send(JSON.stringify({ action: 'publish', channel: channel, payload: data }));
                }
            };
            //console.log('clientSubs channel=', channel);
            this.subscribe(channel, handler);
            // TODO: what if there is a handler already??
            handlers[channel] = handler;
        };
        
        proto.clientUnsubscribe = function(channel, ws, handlers) {
            var handler = handlers[channel];
            if (handler) this.unsubscribe(channel, handler);
            handlers[channel] = null;
        };
        
    })(wsPubSubServer.prototype);
    
    exports.wsPubSubServer = wsPubSubServer;

})(typeof exports === 'object' ? exports : (this.pigod || (this.pigod = {})));
