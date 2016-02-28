(function (exports) {

    function Observable() {
        this.events = {};
    }

    (function (proto) {
        proto.fire = function (evt, args) {
            var list = this.events[evt];
            // slice is to clone the array, so when a handler (fn) modifies the original array, forEach can go on undisturbed
            list && list.slice().forEach( function (fn) { fn.apply(this, args); }, this); 
        };

        proto.on = function (evt, fn) {
            var list = this.events[evt] || (this.events[evt] = []);
            list.push(fn);
            return list.length;
        };

        proto.off = function (evt, fn) {
            var list = this.events[evt];
            if (list) {
                if (!fn) {
                    if (list.length > 0) {
                        return (list.length = 0);
                    }
                } else {
                    var idx = list.indexOf(fn);
                    if (idx >= 0) {
                        list.splice(idx, 1);
                        return list.length;
                    }
                }
            }
            return false;
        };
    })(Observable.prototype);
    
    exports.Observable = Observable;
    
})(typeof exports === 'object' ? exports : (this.pigod || (this.pigod = {})));