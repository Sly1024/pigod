# Modules

The server tries to load each *.js file from the `modules` folder with require(). Modules must export an `init` function that gets called with an `api` object from the server.

The *.html files are treated as [riot.js](http://riotjs.com/) tag files, they are compiled with riot and concatenated into a single block of JavaScript code that is returned when `/riot-tags.js` is requested from the server.

##How they work
Most of the "streaming" modules just run a shell command and capture, process and publish the standard output to a *wsPubSub* object that forwards the data through a WebSocket channel to the client. On the client each module can subscribe to one or more "channels".
The first subscription starts the process so even if there are many clients connected, there will be only one process running for each stream.

I know that running a command and parsing its output is not very efficient, and I could get all the data by reading from the `/proc` filesystem, but me being a mostly UI developer I started with the easy part and worked on the client side. Maybe in phase 2 of learning linux I'll change it to a "proper" implementation.

## CPU Module
 * Server module: [cpu.js](../modules/cpu.js)
 * Tag file: [cpu.html](../modules/cpu.html)
 
Runs the `top` command as a separate process and captures its standard output then parses it and sends updates to the client.

_Raspberry Pi specific:_ 
Runs [cputmpstream.sh](../modules/cputmpstream.sh) which prints out the temperature and voltage of the Pi.

## Net Module
 * Server module: [net.js](../modules/net.js)
 * Tag file: [net.html](../modules/net.html)
 
Runs the `nethogs` command as a separate process and captures its standard output then parses it and sends updates to the client.

Note: [Nethogs](https://github.com/raboof/nethogs) might need to be installed manually.

## IO Module
 * Server module: [io.js](../modules/io.js)
 * Tag file: [io.html](../modules/io.html)
 
Runs the `iotop` command as a separate process and captures its standard output then parses it and sends updates to the client.

## Disk Usage
 * Server module: [diskfree.js](../modules/diskfree.js)
 * Tag file: [diskfree.html](../modules/diskfree.html)

Runs [dfstream.sh](../modules/dfstream.sh) which runs the `df` command every 10 seconds.

## Services Module
 * Server module: [services.js](../modules/services.js)
 * Tag file: [services.html](../modules/services.html)
Runs [servicesstream.sh](../modules/servicesstream.sh) which runs `service --status-all` every 60 seconds.

## Commands Module
 * Server module: [commands.js](../modules/commands.js)
 * Tag file: [commands.html](../modules/commands.html)

This is a bit different from the other modules, this sends a list of commands that are registered and can be executed on the Pi. These can be configured in the [commands module](../modules/commands.js).

## Webcam Module

<span class="warning">**_This is experimental! - Does NOT work on Android 4.2 default browser._**</span>

 * Server module: [webcam.js](../modules/webcam.js)
 * Tag file: [webcam.html](../modules/webcam.html)

This module does NOT directly stream the video through the same websocket channel. Instead when the 'stream' is started it starts [mjpg-streamer](https://github.com/jacksonliam/mjpg-streamer) which does the HTTP streaming (I'll post more about its configuration later).
The view just includes an &lt;img&gt; tag that points to the HTTP stream.

I'm planning to use something like [Paparazzo](https://github.com/rodowi/Paparazzo.js) in the future, or use its code to process the mjpeg stream and actually stream images through websocket. I'm not sure if I should base64 encode it and just use the Data URI support, or open a second, binary websocket.


