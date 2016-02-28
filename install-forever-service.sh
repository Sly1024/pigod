#!/bin/bash
SRC="$(dirname $(readlink -f $0))";
forever-service install pigodsvc -f " -c 'node --debug' --sourceDir=$SRC --workingDir=$SRC --watchDirectory=$SRC --watchIgnore=$SRC/static/** --watch" --envVars="PATH=/usr/local/bin:$PATH"
