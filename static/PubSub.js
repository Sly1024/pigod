(function (riot) {

    function PubSub() {
        riot.observable(this);
        this.subs = riot.observable();
    }

    var proto = PubSub.prototype;

    proto.subscribe = function(channel, handler) {
        if (handler) this.subs.on(channel, handler);
        var num = this.subs[channel] = (this.subs[channel] || 0)+1;
        this.trigger('subscribe', channel);
        if (num === 1) this.trigger('startChannel', channel);
    };
    
    proto.unsubscribe = function(channel, handler) {
        if (handler) this.subs.off(channel, handler);
        var num = --this.subs[channel];
        this.trigger('unsubscribe', channel);
        if (num === 0) this.trigger('stopChannel', channel);
    };
    
    proto.publish = function(channel, data) {
        this.subs.trigger(channel, data);
        this.trigger('publish', channel, data);
    };
                
    if (typeof module !== 'undefined') module.exports = PubSub; 
    else (this.pigod || (this.pigod = {})).PubSub = PubSub;
    
})(this.riot || require('riot'));