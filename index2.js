'use strict'
/**
 * Created by safi on 12/04/16 8:51 PM.
 */

let Listener = require('./lib/listener')
let _ = require('underscore')
let server = new Listener(8001);

console.log('HM-Q Started :8001');

var methods = {}, serverCon = {};


server.on('__REGISTER', function (m, data) {
    console.log("RE",data)
    var serverId = data.serverId;
    if (serverId) {
        m.conn.connectionId = data.serverId;
        serverCon[serverId] = m.conn;
        for (var i = 0; i < data.methods.length; i++) {
            let methodKey = data.scope + ":" + data.methods[i];
            if (!methods[methodKey])
                methods[methodKey] = [];
            methods[methodKey].push(serverId);
        }
        m.reply('__REGISTER_SUS', {serverId: serverId});
    }

})


server.on('__EMIT', function (msg) {

    var serverId;
    if (msg.isReply) { //We need to find server ID based data match
        serverId = msg.requestId;
        if (serverId && serverCon[serverId]) {
            var payload = {
                id       : msg.id,
                requestId: msg.requestId,
                scope    : msg.scope,
                subject  : msg.subject,
                data     : msg.data,
                isReply  : true
            }
            console.log(JSON.stringify(payload));
            serverCon[serverId].write(server.prepareJsonToSend(payload));
        }

    } else { //Get Best Server to Route

        var methodKey = msg.scope + ":" + msg.subject;
        if (methods[methodKey] && methods[methodKey][0]) {
            serverId = methods[methodKey][0];
            console.log("called", serverId);
            var payload = {
                id       : msg.id,
                requestId: msg.conn.connectionId,
                scope    : msg.scope,
                subject  : msg.subject,
                data     : msg.data
            }
            console.log(JSON.stringify(payload));
            serverCon[serverId].write(server.prepareJsonToSend(payload));
        }
    }
});

server.on('__CLOSE', function (serverId) {
    //Remove ServerCon
    delete  serverCon[serverId];
    //Remove Method
    _.each(methods, function (method, index) {
        methods[index] = _.without(method, serverId);
    })
});