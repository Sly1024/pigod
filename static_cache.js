module.exports = function (readFile, riot_filename) {
    function loadStatic(filename) {
        if (filename.startsWith('/modules')) {
            filename = filename.replace('/modules/', 'node_modules/');
        } else {
            filename = 'static/' + filename;
        }
        return readFile(filename, 'utf8');
    }

    // read index.html up front and cache the static js files referenced in <script> tags

    var indexPromise = readFile('static/index.html', 'utf8').then(index => {
        var static_files = [];
        
        index = index.replace(/<script.*?src="([^"]+)"\s*>\s*<\/script>/g, (full, filename) => {
            if (filename == riot_filename) return '<script type="text/javascript" src="/static-and-riot-tags.js"></script>';
            static_files.push(loadStatic(filename));
            return '';
        });
        
        return {
            index: index,
            static_files: static_files
        };
    }).catch(reason => {
        console.log('Could not load index.html', reason);
        process.exit();
    });

    var staticFilesPromise = indexPromise.then(p => Promise.all(p.static_files).then(filecontents => filecontents.join('\n')));

    return {
        indexPromise: indexPromise,
        filesPromise: staticFilesPromise
    };
};
