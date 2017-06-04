//
// mediasoup_sample
//   https://github.com/mganeko/mediasoup_sample
//   mediasoup_sample is provided under MIT license
//
//   This sample is using https://github.com/versatica/mediasoup
//

'use strict';


const SSL_KEY = 'cert/server.key';
const SSL_CERT = 'cert/server.crt';
const fs = require('fs');
var options = {
 key : fs.readFileSync(SSL_KEY).toString(),
 cert : fs.readFileSync(SSL_CERT).toString()
};
const https = require("https");

const express = require('express');
const app = express();
const webPort = 3000;
app.use(express.static('public'));
//const webServer = app.listen(webPort, function(){
//    console.log('Web server start. http://localhost:' + webServer.address().port + '/');
//});
const webServer = https.createServer( options, app ).listen(webPort, function(){
    console.log('Web server start. https://serverurl:' + webServer.address().port + '/');
});

const mediasoup = require('mediasoup');
const RTCPeerConnection = mediasoup.webrtc.RTCPeerConnection;
const RTCSessionDescription = mediasoup.webrtc.RTCSessionDescription;
const roomOptions = require('./data/options').roomOptions;
const peerCapabilities = require('./data/options').peerCapabilities;

let selfId = null;
let soupRoom = null;
let Connections = new Array();
let clientIndex = 0;


// ----- mediasoup ----
let server = mediasoup.Server();
//let server = mediasoup.Server({numWorkers: 2}); // trial for changing number of workers
server.createRoom(roomOptions)
.then((room) => {
  soupRoom = room;
  console.log('server.createRoom() succeeded');
})
.catch((err) => console.error('server.createRoom() ERROR', err)
);


// --- socket.io server ---
const io = require('socket.io')(webServer);

function getId(socket) {
  return socket.id;
}

function getClientCount() {
  // WARN: undocumented method to get clients number
  return io.eio.clientsCount;
}

io.on('connection', function(socket) {
  console.log('client connected. socket id=' + getId(socket) + '  , total clients=' + getClientCount());


  socket.on('disconnect', function() {
    // close user connection
    console.log('client disconnected. socket id=' + getId(socket) + '  , total clients=' + getClientCount());
    cleanUpPeer(socket);
  });
  socket.on('error',  function(err) {
    console.error('socket ERROR:', err);
  });

  socket.on('message', function incoming(inMessage) {
    const id = getId(socket);
    console.log('received id=%s type=%s',  id, inMessage.type);

    if (inMessage.type === 'call') {
      console.log('got call from id=' + id);
      let message = { sendto: id, type: 'response' };
      console.log('send Offer to id=' + id);

      //sendback(ws, message);
      // -- prepare PeerConnection and send SDP --
      const downOnlyRequested = false;
      preparePeer(socket, inMessage, downOnlyRequested);
      //NOT here, MUST USE Promise to sendOffer()
      //if (peerconnection) { 
      //  sendOffer(ws, peerconnection);
      //}
    }
    else if (inMessage.type === 'call_downstream') {
      // -- requested down stream only (for watching realtime-streaming) --
      const downOnlyRequested = true;
      preparePeer(socket, inMessage, downOnlyRequested);
    }
    else if (inMessage.type === 'offer') {
      console.log('got Offer from id=' + id);
      console.error('MUST NOT got offer');
    }
    else if (inMessage.type === 'answer') {
      console.log('got Answer from id=' + id);
      handleAnswer(socket, inMessage);
    }
    else if (inMessage.type === 'candidate') {
      console.error('MUST NOT got candidate');
    }
    else if (inMessage.type === 'bye') {
      cleanUpPeer(socket);
    }
  });

  sendback(socket, { type: 'welcome' });
});

function sendback(socket, message) {
  //let str = JSON.stringify(message);
  //ws.send(str);

  socket.emit('message', message);
}


// --- for v1.x ---
function preparePeer(ws, message, downOnly) {
  const id = getId(ws);
  const planb = message.planb;
  const capabilitySDP = message.capability;

  let peer = soupRoom.Peer(id);
  let peerconnection = new RTCPeerConnection({
    peer     : peer,
    usePlanB : planb
  });
  console.log('--- create RTCPeerConnection --');
  console.log('-- peers in the room = ' + soupRoom.peers.length);

  peerconnection.on('close', function(err) {
    console.log('-- PeerConnection.closed,  err:', err);
  });
  peerconnection.on('signalingstatechange', function() {
    console.log('-- PeerConnection.signalingstatechanged, state=' + peerconnection.signalingState);
  });
  peerconnection.on("negotiationneeded", () => {
    console.log('-- PeerConnection.negotiationneeded!! id=' + id);

    // --- send SDP here ---
    sendOffer(ws, peerconnection, downOnly);
  });

  peerconnection.setCapabilities(capabilitySDP)
  .then(() => {
    console.log('peerconnection.setCapabilities() OK');

    addPeerConnection(id, peerconnection);
    sendOffer(ws, peerconnection);
  })
  .catch( (err) => {
    console.log('peerconnection.setCapabilities() ERROR:', err);
    peerconnection.close();
  })
}

function sendOffer(ws, peerconnection, downOnly) {
  const id = getId(ws);
  console.log('offer to id=' + id);
  let offerOption = { offerToReceiveAudio : 1, offerToReceiveVideo : 1};
  if (downOnly) {
    offerOption.offerToReceiveAudio = 0;
    offerOption.oofferToReceiveVideo = 0;
  }

  peerconnection.createOffer(offerOption)
  .then((desc) => {
    return peerconnection.setLocalDescription(desc);
  })
  .then(() => {
    dumpPeer(peerconnection.peer, 'peer.dump after createOffer');

    sendSDP(ws, peerconnection.localDescription);
  })
  .catch((error) => {
    console.error("error handling SDP offer to participant: %s", error);

    // Close the peerconnection
    peerconnection.reset();
    peerconnection.close();
    deletePeerConnection(id);
  });
}

function handleAnswer(ws, message) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.warn('WARN: connection not found. id=', id);
    return;
  }

  //console.log("remote SDP=" + message.sdp);
  let desc = new RTCSessionDescription({
    type : "answer",
    sdp  : message.sdp
  });
  
  peerconnection.setRemoteDescription(desc)
  .then( function() {
    console.log('setRemoteDescription for Answer OK id=' + id);
    console.log('-- peers in the room = ' + soupRoom.peers.length);

    dumpPeer(peerconnection.peer, 'peer.dump after setRemoteDescription(answer):');
  })
  .catch( (err) => {
    console.error('setRemoteDescription for Answer ERROR:', err)
  });
}

function dumpPeer(peer, caption) {
  /*-- for debug --
  peer.dump()
  .then((obj) => {
    console.log(caption, obj)
  });
  ---*/

  console.log(caption + ' transports=%d receivers=%d senders=%d',
    peer.transports.length, peer.rtpReceivers.length, peer.rtpSenders.length
  );
}


function addPeerConnection(id, pc) {
  Connections[id] = pc;
}

function getPeerConnection(id) {
  const pc = Connections[id];
  return pc
}

function deletePeerConnection(id) {
  delete Connections[id];  
}

function cleanUpPeer(ws) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.warn('WARN: cleanUpPeer(id) , connection not found. id=', id);
    return;
  }
  
  console.log('PeerConnection close. id=' + id);
  peerconnection.close();
  deletePeerConnection(id);

  console.log('-- peers in the room = ' + soupRoom.peers.length);
}

function getRoomName() {
  var room = 'soup';
  if (process.argv.length > 2) {
    room = process.argv[2];
  }
  return room;
}

function sendSDP(ws, sessionDescription) {
  const id = getId(ws);
  let message = { sendto: id, type: sessionDescription.type, sdp: sessionDescription.sdp };
  console.log('--- sending sdp ---');
  //console.log(message);
  console.log('sendto:' + message.sendto + '   type:' + message.type);

  // send to client
  sendback(ws, message);
}


