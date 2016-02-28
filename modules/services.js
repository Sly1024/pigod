(function (exports) {
    exports.init = function init(api) {
        var child_process = require('child_process');
        
        api.registerDataStream('services', 
            api.createProcessStream('services', './servicesstream.sh', [], null, 1000, true)
        );
        
        api.pubsub.subscribe('serviceCall', function (opts) {
            if (opts.name && opts.command) {
                child_process.exec('sudo service ' + opts.name + ' ' + opts.command);
            }
        });
    }

    exports.tagFile = 'services.tag';
        
})(exports);
