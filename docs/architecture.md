## How does it work?
*It's magic! :]*

### Server-Client Communication
Since I started by sending the output of `top` to the client, and currently still many [modules](./modules.md) stream textual data, I needed a quick and easy way to *push* data from server to client. **WebSocket**, of course!

I use the [ws](https://github.com/websockets/ws) library on the server side, and native WebSocket API on the client.

#### Requirements
Each client opens a WebSocket connection to the server, therefore the server needs to be able to handle multiple connections, but obviously I didn't want to run the same command many times, instead I needed a way to "broadcast" the same data to multiple clients.

I planned ahead and wanted to support multiple modules, which meant there would be multiple data streams coming from different processes on the server and consumed by different modules on the client. I didn't want to open multiple WebSockets, but I knew WebSocket is not a *streaming* protocol, it's a *messaging* one, so I could multiplex "packets" from different streams and demultiplex on the client, I just needed a way to identify which stream each packet was coming from to distribute them to the appropriate modules.

This started to sound very much like a [publish-subscribe pattern](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern).

#### WsPubSub
Those two things put together (WebSocket and Pub-Sub) and *wsPubSub* was born.


It hides away all the WebSocket handling from the rest of the code. The server and client side of a module communicate by "publishing" and "subscribing" to "channels" through `wsPubSub`. 

It is actually more generic than that. Anyone can subscribe to a channel with a handler function, and anyone can publish, which means that modules could communicate with each other too. 

[The client](../static/WsPubSubClient.js) is relatively simple, in addition to publishing to local subscribers it sends every action to the server. 

[The server](../WsPubSubServer.js) is a bit more complicated. When a client sends a "subscribe" action to the server, the server subscribes itself with a function that will send the messages to the given client, except if it's the source of the message - we don't want to send back the message to the client it came from.

##### Reqest-Response
There are some cases when a client module wants to fetch some (constant) data from the server - for example the [commands module](../modules/commands.js).

With the pub-sub architecture it cannot be done nicely. The client can publish a message (anything) on a channel (e.g. "getCommands"), the server is subscribed to it and publishes the info on another channel ("commands") which the client is subscribed to. Now if multiple clients are subscribed they would all get this message, while in reality only one needs it, the others already have it.

But *Current State* or *State of the World* (however you call it) is to the rescue!

##### Current State

In a pub-sub system when a client subscribes at a specific time (too late) it doesn't get the messages that were sent *before* the subscription. To solve this, the server can store the messages in a buffer and send the *Current State* (all messages up till now) to a client when it subscribes, so it has the same "state" as any other client subscribed before.

Implementing this feature not only solves the issue I mentioned above, but it allows me to do performance optimisations more easily (see [issue#1](https://github.com/Sly1024/pigod/issues/1)). If the "state" is an object/array that changes infrequently then I can send *delta updates* encoding what changed and not the (same) full object every time. When a new client connects, it will need the full "state" at first, then I can switch to delta updates. 

The diff calculation is implemented in [Diff.js](../static/Diff.js).

