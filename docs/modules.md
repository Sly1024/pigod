Modules
=======
The server tries to load each *.js file from the `modules` folder with require(). Modules must export an `init` function and an optional `tagFile` string containing the name of a [riot.js](http://riotjs.com/) tag file.

## CPU Module
 * Server module: [cpu.js](modules/cpu.js)
 * Tag file: [cpu.html](modules/cpu.html)
 
Runs the `top` command as a separate process and captures its standard output then parses it and sends updates to the client.
 
## ... rest is WorkInProgress ...
