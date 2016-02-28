(function (exports) {

    exports.tagFile = 'commands.html';

    exports.init = function init(api) {
        var child_process = require('child_process');
        var commandsById = {};
        /** commands **/
        var allCommands = [
            { id: 'kodi', name: 'Kodi', command: 'su -c startkodi - pi' },
            { id: 'chmusb', name: 'Chmod Usb', command: 'chmod -R a+w /mnt/usb/' },
            { id: 'reboot', name: 'Reboot', command: 'sudo reboot -f' },
            { id: 'rescan_minidlna', name: 'Rescan MiniDLNA', command: 'sudo minidlna -R; sudo service minidlna restart' }
        ];

        allCommands.forEach(function (cmd) { commandsById[cmd.id] = cmd; });

        api.pubsub.subscribe('getCommands', function (data, targetWs, sourceWs) {
            api.pubsub.publish('commands', allCommands, sourceWs);
        });

        api.pubsub.subscribe('execCommand', function (data) {
            if (data.id && commandsById[data.id]) {
                child_process.exec(commandsById[data.id].command);
            }
        });
    }

    
})(exports);
