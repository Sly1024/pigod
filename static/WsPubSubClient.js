(function (riot) {

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
            if (data.action === 'publish') {
                var channel = data.channel;
                if (channel && data.payload) {
                    me.ignorePublish = true;
                    var applied = me.applyDiff(me.states[channel], data.payload);
                    me.states[channel] = applied;
                    me.pubsub.publish(data.channel, applied);
                    me.ignorePublish = false;
                } else {
                    throw new Error('[wsPubSubClient] unidentified msg ' + msg);
                }
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
    
    /** --------- Diff Functions -------------- */
    
    var obj2str = Object.prototype.toString;
    
    function isObject(arg) {
        return obj2str.call(arg) === '[object Object]';
    }
    
    function isArray(arg) {
        return Array.isArray ? Array.isArray(arg) : obj2str.call(arg) === '[object Object]';
    }

    /**
     * Diff table for different source/target types.
     * `target` = same value as target
     * ND = No Diff (NODIFF_OBJ)
     *
     * | souce\target | null/undef | primitive | { object } |  [ array ]   |
     * +--------------+------------+-----------+------------+--------------+
     * |  null/undef  |  target/ND |  target   |   target   |    target    |
     * |  primitive   |   target   | target/ND |   target   |    target    |
     * |  { object }  |   target   |  target   |  {diff}/ND |    target    |
     * |  [ array ]   |   target   |  target   |   target   |{$_arrDiff}/ND|
     *
     */
    proto.applyDiff = function(source, diff) {
        //if (source == null) return diff;  - No need
        
        if (isObject(diff)) {
            if (isArray(source) && diff.$_arrDiff) {
                return this.applyArrDiff(source, diff);
            }
            if (isObject(source)) {
                return this.applyObjDiff(source, diff);
            }
        }
        
        return diff;
    };
    
    proto.applyObjDiff = function (source, diff) {
        for (var key in diff) if (diff.hasOwnProperty(key)) {
            source[key] = this.applyDiff(source[key], diff[key]);
        }
        if (diff.$_removed) {
            diff.$_removed.forEach( function (key) {
                source[key] = undefined;    // we could `delete source[key];` but this is more efficient 
            });
        }
        return source;
    };
    
    proto.applyArrDiff = function (source, diff) {            
        var me = this;
        var arrDiff = diff.$_arrDiff;
        
        // remove
        arrDiff[0].forEach(function (idx) { source.splice(idx, 1); });
        
        // move
        arrDiff[1].forEach(function (move) {
            var item = source.splice(move[0], 1)[0];
            if (move.length > 2) item = me.applyDiff(item, move[2]);
            source.splice(move[1], 0, item);
        });
        
        // insert
        arrDiff[2].forEach(function (insert) {
            source.splice(insert[0], 0, insert[1]);
        });
        
        return source;
    };
    
    if (typeof module !== 'undefined') module.exports = WsPubSubClient; 
    else (this.pigod || (this.pigod = {})).WsPubSubClient = WsPubSubClient;
    
})(this.riot || require('riot'));