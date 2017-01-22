'use strict';

const WebSocketServer = require('ws').Server;
const wsPort = 3001;
const wsServer = new WebSocketServer({ port: wsPort });
console.log('websocket server start. port=' + wsPort);

const express = require('express');
const app = express();
const webPort = 3000;
app.use(express.static('public'));
const webServer = app.listen(webPort, function(){
    console.log('Web server start. http://localhost:' + webServer.address().port + '/');
});

const mediasoup = require('mediasoup');
const RTCPeerConnection = mediasoup.webrtc.RTCPeerConnection;
const RTCSessionDescription = mediasoup.webrtc.RTCSessionDescription;
const roomOptions = require('./data/options').roomOptions;
const peerCapabilities = require('./data/options').peerCapabilities;


const usePlanBFlag = true;

let selfId = null;
let soupRoom = null;
let Connections = new Array();
let clientIndex = 0;


// ----- mediasoup ----
let server = mediasoup.Server();
server.createRoom(roomOptions)
.then((room) => {
  soupRoom = room;
  console.log('server.createRoom() succeeded');
})
.catch((err) => console.error('server.createRoom() ERROR', err)
);


// --- websocket server ---
function getId(ws) {
  if (ws.additionalId) {
    return ws.additionalId;
  }
  else {
    clientIndex++;
    ws.additionalId = 'member_' + clientIndex;
    return ws.additionalId;
  }
}

function getClientCount() {
  return wsServer.clients.length;
}

wsServer.on('connection', function connection(ws) {
  console.log('client connected. id=' + getId(ws) + '  , total clients=' + getClientCount());
  
  ws.on('close', function () {
    console.log('client closed. id=' + getId(ws) + '  , total clients=' + getClientCount());
    cleanUpPeer(ws);
  });
  ws.on('error', function(err) {
    console.error('ERROR:', err);
  });
  ws.on('message', function incoming(data) {
    const inMessage = JSON.parse(data);
    const id = getId(ws);
    console.log('received id=%d type=%s',  id, inMessage.type);

    if (inMessage.type === 'call') {
      console.log('got call from id=' + id);
      let message = { sendto: id, type: 'response' };
      console.log('send response to id=' + id);

      sendback(ws, message);
    }
    else if (inMessage.type === 'offer') {
      console.log('got Offer from id=' + id);
      handleOffer(ws, inMessage);
    }
    else if (inMessage.type === 'answer') {
      console.log('got Answer from id=' + id);
      handleAnswer(ws, inMessage);
    }
    else if (inMessage.type === 'candidate') {
      console.error('MUST NOT got candidate');
    }
    else if (inMessage.type === 'bye') {
      cleanUpPeer(ws);
    }
  });

  sendback(ws, { type: 'welcome' });
});

function sendback(ws, message) {
  let str = JSON.stringify(message);
  ws.send(str);
}

function handleOffer(ws, message) {
  const id = getId(ws);
  const option = { usePlanB: message.planb };
      
  let desc = new RTCSessionDescription({
    type : "offer",
    sdp  : message.sdp
  });
  console.log('RTCSessionDescription --');
  let peerconnection = new RTCPeerConnection(soupRoom, id, option);
  peerconnection.on('close', function(err) {
    console.log('-- PeerConnection.closed,  err:', err);
  });
  peerconnection.on('signalingstatechange', function() {
    console.log('-- PeerConnection.signalingstatechanged, state=' + peerconnection.signalingState);
  });      
  
  console.log('--- create RTCPeerConnection --');
  console.log('-- peers in the room = ' + soupRoom.peers.length);

  addPeerConnection(id, peerconnection);
  
  // Set the remote SDP offer
  peerconnection.setRemoteDescription(desc)
  .then(() => {
    dumpPeer(peerconnection.peer, 'peer.dump after setRemoteDescrition(offer):');
    return peerconnection.createAnswer();
  })
  .then((desc) => {
    return peerconnection.setLocalDescription(desc);
    
  })
  .then(() => {
    dumpPeer(peerconnection.peer, 'peer.dump after setLocalDescrition(answer):');

    // Answer the participant request with the SDP answer
    sendSDP(ws, peerconnection.localDescription);
    console.log('-- peers in the room = ' + soupRoom.peers.length);
  })
  .catch((error) => {
    console.error("error handling SDP offer from participant: %s", error);
    
    // Reject the participant
    // Close the peerconnection
    peerconnection.close();

    deletePeerConnection(id);
  });

  // Handle "negotiationneeded" event
  peerconnection.on("negotiationneeded", () => {
    console.log('-- PeerConnection.negotiationneeded!!');
    
    peerconnection.createOffer()
    .then((desc) => {
      return peerconnection.setLocalDescription(desc);
    })
    .then(() => {
      dumpPeer(peerconnection.peer, 'peer.dump after setLocalDescrition(re-offer):');

      // Send the SDP re-offer to the endpoint and expect a SDP answer
      console.log('re-offer to id=' + id);

      sendSDP(ws, peerconnection.localDescription);
    })
    .catch((error) => {
      console.error("error handling SDP re-offer to participant: %s", error);
    
      //// Close the peerconnection
      //peerconnection.close();
      //deletePeerConnection(id);
    });
  });
}

function handleAnswer(ws, message) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.warn('WARN: connection not found. id=', id);
    return;
  }

  let desc = new RTCSessionDescription({
    type : "answer",
    sdp  : message.sdp
  });
  
  peerconnection.setRemoteDescription(desc)
  .then( function() {
    console.log('setRemoteDescription for Answer OK');
    console.log('-- peers in the room = ' + soupRoom.peers.length);

    dumpPeer(peerconnection.peer, 'peer.dump after setRemoteDescription(re-answer):');
  })
  .catch( (err) => {
    console.eror('setRemoteDescription for Answer ERROR:', err)
  });
}

function dumpPeer(peer, caption) {
  /*-- for debug --
  peer.dump()
  .then((obj) => {
    console.log(caption, obj)
  });
  ---*/
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

  // send via websocket
  sendback(ws, message);
}


