Background
==========
The story about how this project started.

Why?
----
I wanted to:
 * Refresh my linux skills - I'm not a linux guy, I can barely navigate in the filesystem :)
 * Do a bit of node.js server-side programming
 * Create some kind of a NAS at home, to browse files from my desktop/tablet, and play videos on a smart TV
 * Not spend a whole lot of money to buy a proper NAS/PC but
 * also not build a cheap but big, ugly and noisy machine

So I bought a [Raspberry Pi 2](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/) on the recommendation of friends. I installed/setup Raspbian, Samba daemon, MiniDLNA and Node.js.

First Steps
-----------
Since I had no idea what to do with node.js, but I found myself logging in to the terminal (putty) and just looking at the `top` command's output to see how it performs while I copy files, I realized I want to see the same data, but on a nicer, more interactive Web UI.

I started thinking: I can run `top` from node.js and capture its standard output. I knew I wanted to use WebSockets to stream data to the client, so the first version actually looked like this:
```javascript
websocketServer.on('connection', function (websocket) {
  var proc = child_process.spawn('top', [some_arguments]);
  proc.stdout.on('data', function (data) {
    websocket.send(data.toString());
  });
});
```
Then I just looked at the WebSocket stream in Chrome and started to build the client side.

At first I just showed the output in a DIV, then I started to convert it to an HTML table. I did all the processing (parsing) on the client with Javascript, mainly because I knew how to debug JS in Chrome, but I had no idea how to do that with node.js remotely (more on that later). Most of the processing is done on the server now.

I realized that I needed a way of refreshing the table when a new update comes. I had to choose a UI binding library. I looked at Angular, but for me it was too complex and heavyweight. I wanted something that's small but efficient. 

Riot.js
-------
Then I found [riot.js](http://riotjs.com/). It was perfect for my scenario. I read through the whole Guide and API documentation in about 2 hours (it was v2.0.x) and I began to like it immediately.

I started writing a "tag" file, which contains the view (HTML+CSS) and the logic (Javascript) in the same file. Some might say it's bad practice, but I think it's neat to have the component in a single place and for a small thing like this it's separated enough for me.

Riot can compile the tag file from the HTML-ish fragment with the binding expressions to pure Javascript on both the client and server side. So I just included the riot+compiler.js in my HTML, loaded the tag files as static content and riot compiled them on the client.

First I thought this is good, because the desktop machine (where I view the webpage) is much more powerful than the Raspberry Pi, and I put less load on the Pi this way. Then I realized that I want to view the page on my mobile phone too, and of course compiling on the server is the "right thing" to do for several reasons. 
 
 * For one, it only needs to compile files once, not every time a client is connected. 
 * For two, this way the client doesn't need to download the compiler code and the tag files separately. 
 
Now I concatenate the compiled code and serve it as a single file. Later I could select some tag files that the client needs based on the persisted layout of the modules.


