(function (exports) {
    
    exports.init = function init(api) {
        var child_process = require('child_process');
        
        api.registerDataStream('services', 
            api.createProcessStream('services', './servicesstream.sh', [], processData, 1000, true)
        );
        
        api.pubsub.subscribe('serviceCall', function (opts) {
            if (opts.name && opts.command) {
                child_process.exec('sudo service ' + opts.name + ' ' + opts.command);
            }
        });
        
        var svcStatRE = /^ \[ ([-+\?]) \]  (.*)$/;
        var services = [];
        var servicesByName = {};

        services.$_idField = 'name';
        
        function processData(data) {
            var lines = data.split('\n');
            
            for (var i = 0; i < lines.length; ++i) {
                var match = lines[i].match(svcStatRE);
                if (match && match.length === 3) {
                    var name = match[2];
                    var stat = match[1];
                    var obj = servicesByName[name];
                    if (!obj) {
                        obj = { name: name };
                        servicesByName[name] = obj;
                        services.push(obj);
                    }
                    obj.stat = stat;
                }
            }

            // need to be referentially different than the previous, otherwise diff() returns NO_DIFF and sends nothing
            // TODO: need to fix this in the wsPubSubServer code!
            return services.slice();    
        }
    }

})(exports);
