"use strict";
const riot = require('riot');

module.exports = function (readFile, readdir, serverApi) {
    const moduleDir = './modules/';

    const yellowOn = '\u001b[1m\u001b[33m';   // yellow + bold
    const yellowOff = '\u001b[39m\u001b[22m';   // yellow + bold

    function yellow(str) { return yellowOn + str + yellowOff; }

    function loadTag(fileName) {
        console.log(fileName);
        return readFile(fileName, 'utf8').then(content => riot.compile(content, {}, fileName)).catch(err => {
            console.log(`Error loading or compiling riot tag file "${fileName}".\n${err}`);
            return Promise.resolve(`/* Could not load ${fileName}. */`); // can continue with other modules
        });
    }
    
    const riotTagsPromise = readdir(moduleDir).then((files) => {    
        
		console.log(yellow('Loading modules ...'));
        
		files.filter(f => /\.js$/.test(f)).forEach((fileName) => {
            console.log(fileName);
            try {
                const module = require(moduleDir + fileName);
                if (typeof module.init !== 'function') throw new Error(`No 'init' function exported.`);
                module.init(serverApi);
            } catch (err) {
                console.log(`Error: Could not initialize module ${fileName}.\n${err}`);
            }
        });
        
        console.log(yellow('Loading riot tags ...'));
        
        return Promise.all(files.filter(f => /\.html$/.test(f)).map((fileName) => loadTag(moduleDir + fileName)))
            .then(compiled_tags => compiled_tags.join('\n'));
        
    });

    riotTagsPromise.then(_ => console.log(yellow('done.')), err => console.log('Error loading modules ' + err));
    
    return riotTagsPromise;
};
