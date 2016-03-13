(function (exports, riot) {

    function pubsub() {
        riot.observable(this);
        this.subs = riot.observable();
    }

    (function (proto) {

        proto.subscribe = function(channel, handler) {
			this.subs.on(channel, handler);
			var num = this.subs[channel] = (this.subs[channel] || 0)+1;
			this.trigger('subscribe', channel);
            if (num === 1) this.trigger('startChannel', channel);
        };
        
        proto.unsubscribe = function(channel, handler) {
			this.subs.off(channel, handler);
			var num = --this.subs[channel];
			this.trigger('unsubscribe', channel);
			if (num === 0) this.trigger('stopChannel', channel);
        };
        
        proto.publish = function(channel, data) {
            this.subs.trigger(channel, data);
            this.trigger('publish', channel, data);
        };
                
    })(pubsub.prototype);
    
    exports.pubsub = pubsub;
    
})(
	typeof exports === 'object' ? exports : (this.pigod || (this.pigod = {})),
	this.riot || require('riot')
);