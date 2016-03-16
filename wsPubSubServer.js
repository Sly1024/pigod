(function (exports) {

	var riot = require('riot');
    var WebSocketServer = require('ws').Server;

    function wsPubSubServer(server) {
        riot.observable(this);
        
        this.subs = riot.observable();
        this.states = {};
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
            var me = this;
            var handler = function(data, targetWs, sourceWs) {
                if ((!targetWs || ws === targetWs) && ws !== sourceWs && ws.readyState === 1) {
                    var diff = me.diff(me.states[channel], data);
                    me.states[channel] = data;
                    
                    if (diff !== me.NODIFF_OBJ) {
                        ws.send(JSON.stringify({ action: 'publish', channel: channel, payload: diff }));
                    }
                }
            };
            // send current state
            var state = me.states[channel];
            if (state) {
                ws.send(JSON.stringify({ action: 'publish', channel: channel, payload: state }));
            }
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
        
        /** --------- Diff Functions -------------- */

        var obj2str = Object.prototype.toString;
        
        function isObject(arg) {
            return obj2str.call(arg) === '[object Object]';
        }
        
        function isArray(arg) {
            return Array.isArray ? Array.isArray(arg) : obj2str.call(arg) === '[object Object]';
        }
        
        proto.NODIFF_OBJ = {};  // a special object representing "No Difference" 

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
        proto.diff = function(source, target) {
            if (target === source) {
                return this.NODIFF_OBJ;
            }
            
            if (isArray(source) && isArray(target)) {
                return this.arrayDiff(source, target);
            } else if (isObject(source) && isObject(target)) {
                return this.objDiff(source, target);
            }
            return target;
        };
        
        proto.objDiff = function (source, target) {
            var sourceKeyMap = Object.keys(source).reduce(function (obj, prop) { obj[prop] = true; return obj; }, {});
            
            var diff = null;
            for (var key in target) if (target.hasOwnProperty(key)) {
                if (source[key] !== target[key]) {
                    var val = this.diff(source[key], target[key]);
                    if (val !== this.NODIFF_OBJ) {
                        diff = diff || {};
                        diff[key] = val;
                    }
                }
                sourceKeyMap[key] = false;
            }
            
            var removed = Object.keys(sourceKeyMap).filter(function (prop) { return sourceKeyMap[prop]; });
            if (removed.length) {
                diff = diff || {};
                diff.$_removed = removed;
            }
            
            return diff || this.NODIFF_OBJ;
        };
        
        proto.getHasFuncField = function (array, idField) {
            var hasId = null;
            return function (item) { 
                if (!hasId) {
                    hasId = {};
                    array.forEach(function (item) { hasId[item[idField]] = (hasId[item[idField]] || 0) + 1; });
                }
                return hasId[item[idField]]-- > 0;
            };
        };
        
        proto.getHasFuncRef = function (array) {
            var copy = null;
            return function (item) { 
                copy = copy || array.slice();
                var idx = copy.indexOf(item);
                if (idx >= 0) {
                    copy.splice(idx, 1);
                    return true;
                }
                return false;
            };
        };

        proto.arrayDiff = function (source, target) {
            var src = source.slice();  // clone the source array
            var trgt = target.slice(); // clone target 

            var targetHas, srcHas, same, getIdxInSrc;
            var idField = target.$_idField;
            
            if (idField) {  // items are identified by a field
                targetHas = this.getHasFuncField(target, idField);                
                srcHas = this.getHasFuncField(src, idField);
                same = function (a, b) { return a[idField] === b[idField]; };
                getIdxInSrc = function (item, startIdx) {
                    var itemID = item[idField];
                    for (var i = startIdx; i < src.length; ++i) if (src[i][idField] === itemID) return i;
                    return -1;
                };
            } else {    // identity is the reference
                targetHas = this.getHasFuncRef(target);
                srcHas = this.getHasFuncRef(src);
                same = function (a, b) { return a === b; };
                getIdxInSrc = [].indexOf.bind(src);
            }
            
            var remove = [];
            for (var i = src.length-1; i >= 0; --i) {
                if (!targetHas(src[i])) {
                    remove.push(i);
                    src.splice(i, 1);
                }
            }
                        
            var insPos = target.length - src.length;    // number of new items
            var insert = new Array(insPos);
            for (var i = trgt.length-1; i >= 0; --i) {
                if (!srcHas(trgt[i])) {
                    insert[--insPos] = [i, trgt[i]];
                    trgt.splice(i, 1);
                }
            }
            
            var move = [];
            for (var i = 0; i < trgt.length; ++i) {
                if (same(src[i], trgt[i])) {
                    var diff = this.diff(src[i], trgt[i]);
                    if (diff !== this.NODIFF_OBJ) move.push([i, i, diff]);
                } else {
                    var idx = getIdxInSrc(trgt[i], i+1);
                    var moveArr = [idx, i];
                    var diff = this.diff(src[idx], trgt[i]);
                    if (diff !== this.NODIFF_OBJ) moveArr.push(diff);
                    move.push(moveArr);
                    src.splice(i, 0, src.splice(idx, 1)[0]);
                }
            }
            
            return remove.length + move.length + insert.length === 0 ? this.NODIFF_OBJ : {
                $_arrDiff: [remove, move, insert]
            };

        };
        
    })(wsPubSubServer.prototype);
    
    exports.wsPubSubServer = wsPubSubServer;

})(typeof exports === 'object' ? exports : (this.pigod || (this.pigod = {})));



















