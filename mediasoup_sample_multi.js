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
//let server = mediasoup.Server({numWorkers: 2}); // trial for changing number of workers
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
    console.log('received id=%s type=%s',  id, inMessage.type);

    if (inMessage.type === 'call') {
      console.log('got call from id=' + id);
      let message = { sendto: id, type: 'response' };
      console.log('send Offer to id=' + id);

      //sendback(ws, message);
      // -- prepare PeerConnection and send SDP --
      preparePeer(ws, inMessage);
      //if (peerconnection) { // MUST USE Promise
      //  sendOffer(ws, peerconnection);
      //}
    }
    else if (inMessage.type === 'offer') {
      console.log('got Offer from id=' + id);
      console.error('MUST NOT got offer');
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

// --- for v1.x ---
const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
const peerCapSDP = [
  "m=video 52585 UDP/TLS/RTP/SAVPF 96 98 100 102 127 97 99 101 125",
  //"a=setup:actpass",
  "a=mid:video",
  //"a=extmap:2 urn:ietf:params:rtp-hdrext:toffset",
  //"a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
  //"a=extmap:4 urn:3gpp:video-orientation",
  //"a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
  //"a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay",
  //"a=sendrecv",
  "a=rtcp-mux",
  "a=rtcp-rsize",
  "a=rtpmap:96 VP8/90000",
  "a=rtcp-fb:96 ccm fir",
  "a=rtcp-fb:96 nack",
  "a=rtcp-fb:96 nack pli",
  "a=rtcp-fb:96 goog-remb",
  "a=rtcp-fb:96 transport-cc",
  "a=rtpmap:98 VP9/90000",
  "a=rtcp-fb:98 ccm fir",
  "a=rtcp-fb:98 nack",
  "a=rtcp-fb:98 nack pli",
  "a=rtcp-fb:98 goog-remb",
  "a=rtcp-fb:98 transport-cc",
  "a=rtpmap:100 H264/90000",
  "a=rtcp-fb:100 ccm fir",
  "a=rtcp-fb:100 nack",
  "a=rtcp-fb:100 nack pli",
  "a=rtcp-fb:100 goog-remb",
  "a=rtcp-fb:100 transport-cc",
  "a=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
  "a=rtpmap:102 red/90000",
  "a=rtpmap:127 ulpfec/90000",
  "a=rtpmap:97 rtx/90000",
  "a=fmtp:97 apt=96",
  "a=rtpmap:99 rtx/90000",
  "a=fmtp:99 apt=98",
  "a=rtpmap:101 rtx/90000",
  "a=fmtp:101 apt=100",
  "a=rtpmap:125 rtx/90000",
  "a=fmtp:125 apt=102",
].join(CRLF);

function preparePeer(ws, message) {
  const id = getId(ws);
  const planb = message.planb;

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
    sendOffer(ws, peerconnection);
  });

  //peerconnection.setCapabilities(peerCapabilities) // <-- peerconnection.setCapabilities() ERROR:
    // Error: invalid capabilities SDP: Error: invalid sdp-transform object:
    // TypeError: Cannot read property 'forEach' of undefined
  peerconnection.setCapabilities(peerCapSDP)
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

function sendOffer(ws, peerconnection) {
  const id = getId(ws);
  console.log('offer to id=' + id);
  peerconnection.createOffer({
    offerToReceiveAudio : 1,
    offerToReceiveVideo : 1
  })
  .then((desc) => {
    return peerconnection.setLocalDescription(desc);
  })
  .then(() => {
    dumpPeer(peerconnection.peer, 'peer.dump after createOffer');

    sendSDP(ws, peerconnection.localDescription);
  })
  .catch((error) => {
    console.error("error handling SDP offer to participant: %s", error);
  
    //// Close the peerconnection
    //peerconnection.close();
    //deletePeerConnection(id);

    peerconnection.reset();
  });
}

function handleAnswer(ws, message) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.warn('WARN: connection not found. id=', id);
    return;
  }

  console.log("remote SDP=" + message.sdp);
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

  // send via websocket
  sendback(ws, message);
}


