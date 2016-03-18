(function (exports) {

    exports.init = function init(api) {
        var child_process = require('child_process');
        var commandsById = {};
        /** commands **/
        var allCommands = [
            { id: 'kodi', name: 'Kodi', command: 'su -c startkodi - pi' },
            { id: 'chmusb', name: 'Chmod Usb', command: 'chmod -R a+w /mnt/usb/' },
            { id: 'chmpigod', name: 'Chmod PiGod src', command: 'chmod -R a+w /home/pi/pigod/src/' },
            { id: 'reboot', name: 'Reboot', command: 'sudo reboot -f' },
            { id: 'rescan_minidlna', name: 'Rescan MiniDLNA', command: 'sudo minidlna -R; sudo service minidlna restart' }
        ];

        allCommands.$_idField = 'id';
        
        allCommands.forEach(function (cmd) { commandsById[cmd.id] = cmd; });
        
        api.pubsub.publish('commands', allCommands);

        api.pubsub.subscribe('execCommand', function (data) {
            if (data.id && commandsById[data.id]) {
                child_process.exec(commandsById[data.id].command);
            }
        });
    }

    
})(exports);
