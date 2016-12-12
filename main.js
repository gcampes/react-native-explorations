'use strict';

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
  TextInput,
  ListView,
} from 'react-native';


import {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCView,
  MediaStreamTrack,
  getUserMedia,
} from 'react-native-webrtc';

// import App from './app/components/App';
import SocketHandler from './src/socket-handler.js';

const configuration = {"iceServers": [{url:'stun:stun.l.google.com:19302'},
                                      {url:'stun:stun1.l.google.com:19302'},
                                      {url:'stun:stun2.l.google.com:19302'},
                                      {url:'stun:stun3.l.google.com:19302'},
                                      {url:'stun:stun4.l.google.com:19302'},]};

let pcPeers = {};
let localStream;

const logError = (error) => {
  console.log("logError", error);
}

const getLocalStream = (isFront, callback) => {
  MediaStreamTrack.getSources(sourceInfos => {
    console.log('These are the sourceInfos XUBIRABIRONG', sourceInfos);
    let videoSourceId;
    for (const i = 0; i < sourceInfos.length; i++) {
      const sourceInfo = sourceInfos[i];
      if(sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
        videoSourceId = sourceInfo.id;
      }
    }
    getUserMedia({
      audio: true,
      video: {
        mandatory: {
          minWidth: 500, // Provide your own width, height and frame rate here
          minHeight: 300,
          minFrameRate: 30
        },
        facingMode: (isFront ? "user" : "environment"),
        optional: [{ sourceId: sourceInfos.id }]
      }
    }, function (stream) {
      console.log('Getting User Media', stream);
      callback(stream);
    }, logError);
  });
}

let candidates = "";
let candidateTimeout;
let connected = false;
const createPC = (socket, socketId, isOffer) => {
  console.log(`Creating PC`);
  const pc = new RTCPeerConnection(configuration);
  pcPeers[socketId] = pc;
  console.log(`PC Created, lets move on`);

  pc.onicecandidate = function (event) {
    console.log('onicecandidate', event.candidate);
    // console.log(pc.localDescription);
    if (event.candidate) {
      candidates = candidates + `a=${event.candidate.candidate}\r\n`;
    }
    clearTimeout(candidateTimeout);
    candidateTimeout = setTimeout(iceCompleted, 1000);
  };

  function iceCompleted() {
    const sdp = pc.localDescription.sdp + candidates;
    console.log('SDP Before', sdp);
    const tempSdp = sdp.split('a=fmtp:111 minptime=10; useinbandfec=1\r')
                    .join('a=fmtp:111 minptime=10;useinbandfec=1; stereo=1; sprop-stereo=1\r')
                    .split('m=video')
    const hackedSDP = (tempSdp[0] + candidates + 'm=video' + tempSdp[1] + candidates);
                      // .replace('a=rtpmap:111 opus/48000/2\r\n', 'a=rtpmap:111 opus/16000/1\r\n')
                      // .replace('a=rtpmap:103 ISAC/16000\r\n', '')
                      // .replace('a=rtpmap:104 ISAC/32000\r\n', '')
                      // .replace('a=rtpmap:9 G722/8000\r\n', '')
                      // .replace('a=rtpmap:102 ILBC/8000\r\n', '')
                      // .replace('a=rtpmap:0 PCMU/8000\r\n', '')
                      // .replace('a=rtpmap:8 PCMA/8000\r\n', '')
                      // .replace('a=rtpmap:106 CN/32000\r\n', '')
                      // .replace('a=rtpmap:105 CN/16000\r\n', '')
                      // .replace('a=rtpmap:13 CN/8000\r\n', '')
                      // .replace('a=rtpmap:127 red/8000\r\n', '')
                      // .replace('a=rtpmap:126 telephone-event/8000\r\n', '');

    console.log('SDP After', hackedSDP);
    const message = {
      "jsonrpc": "2.0",
      "method": "verto.invite",
      "params": {
        "sdp": hackedSDP,
        "dialogParams": {
          "useVideo": true,
          "screenShare": false,
          "useCamera": "default",
          "useMic": "default",
          "useSpeak": "default",
          "tag": "deskshareVideo",
          "localTag": null,
          "login": "bbbuser",
          "videoParams": {
            "minFrameRate": 5
          },
        "destination_number": "71234-DESKSHARE",
        "caller_id_name": "Test",
        "caller_id_number": "a@b.c",
        "dedEnc": false,
        "mirrorInput": false,
        "callID": `xubirabirovovski-${Date.now()}`,
        "remote_caller_id_name": "Outbound Call",
        "remote_caller_id_number": "71234-DESKSHARE"
        },
        "sessid": `native-${Date.now()}`
      },
      "id": 11
    };
    socket.send(JSON.stringify(message));
  }

  function createOffer() {
    console.log('Starting createOffer');
    pc.createOffer(function(desc) {
      console.log('createOffer', desc);
      pc.setLocalDescription(desc, function () {
        console.log('setLocalDescription', pc.localDescription);
      }, logError);
    }, logError);
  }

  pc.onnegotiationneeded = function () {
    console.log('onnegotiationneeded', isOffer);
    if (isOffer && !connected) {
      createOffer();
    }
  }

  pc.oniceconnectionstatechange = function(event) {
    console.log('oniceconnectionstatechange', event.target.iceConnectionState);
    if (event.target.iceConnectionState === 'completed') {
      // setInterval(() => {
      //   getStats();
      // }, 500);
    }
    if (event.target.iceConnectionState === 'connected') {
      createDataChannel();
    }
  };
  pc.onsignalingstatechange = function(event) {
    console.log('onsignalingstatechange', event.target.signalingState);
  };

  pc.onaddstream = function (event) {
    console.log('EVENT PROPRIO', event);
    console.log('onaddstream', event.stream);
    container.setState({info: 'One peer join!'});

    const remoteList = container.state.remoteList;
    remoteList[socketId] = event.stream.toURL();
    console.log(event.stream);
    console.log('stream to url', remoteList[socketId]);
    container.setState({ remoteList: remoteList });
  };
  pc.onremovestream = function (event) {
    console.log('onremovestream', event.stream);
  };

  console.log(`Adding localStream`);
  pc.addStream(localStream);
  console.log(`Added localStream`);
  function createDataChannel() {
    if (pc.textDataChannel) {
      return;
    }
    const dataChannel = pc.createDataChannel("text");

    dataChannel.onerror = function (error) {
      console.log("dataChannel.onerror", error);
    };

    dataChannel.onmessage = function (event) {
      console.log("dataChannel.onmessage:", event.data);
      container.receiveTextData({user: socketId, message: event.data});
    };

    dataChannel.onopen = function () {
      console.log('dataChannel.onopen');
      container.setState({textRoomConnected: true});
    };

    dataChannel.onclose = function () {
      console.log("dataChannel.onclose");
    };

    pc.textDataChannel = dataChannel;
  }
  console.log('Returning pc');
  return pc;
}

function mapHash(hash, func) {
  const array = [];
  for (const key in hash) {
    const obj = hash[key];
    array.push(func(obj, key));
  }
  return array;
}

function getStats() {
  console.log(`---------------------HERE COMES THE INFO-----------------------------`);
//   console.log(` HERE COMES THE INFORMATION TRUCK
//         .--------------.
//         |~            ~|
//         |H____________H|
//         |.------------.|
//         ||::..     __ ||
//         |'--------'--''|
//         | '. ______ .' |
//         | _ |======| _ |
//         |(_)|======|(_)|
//         |___|======|___|
//         [______________]
//         |##|        |##|
//         '""'        '""
// `)
  // console.log(pcPeers, Object.keys(pcPeers), pcPeers[Object.keys(pcPeers)[0]]);
  const thisPC = pcPeers[Object.keys(pcPeers)[0]];
  // console.log('getStats', thisPC.get);

  // console.log(thisPC.getStats, thisPC.getRemoteStreams);
  // thisPC.getStats(track, function(report) {
  //   console.log('getStats report', report);
  // }, logError);

  if (thisPC._remoteStreams[0] && thisPC._remoteStreams[0]._tracks[0]) {
    const track = thisPC._remoteStreams[0]._tracks[0];
    // console.log('track', track);
    thisPC.getStats(track, function(report) {
      // console.log('Reports', report);
      let mappedObj = {};
      report.forEach(r => {
        r.values.forEach(value => {
          const key = Object.keys(value)[0];
          console.log(`STAT: ${key}: ${value[key]}`);
          mappedObj[key] = value[key];
        });
      });
      container.setState({ stats: mappedObj });
    }, logError);
  }
}

let pc;
let container;

class RCTWebRTCDemo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      remoteList: [],
      stats: {},
    };
  }

  componentDidMount() {
    container = this;
    console.log(`Component Did Mount`);
    const socket = new WebSocket('wss://rn.blindside-dev.com:8082');
    socket._send = socket.send;
    socket.send = (message) => {
      console.log('Socket sending', message);
      socket._send(message);
    }
    console.log('This is the socket', socket);
      socket.onopen = (data) => {
        console.log('Socket Connection Opened');
        getLocalStream(true, function(stream) {
        localStream = stream;
      });
      console.log('Connection Opened');
      this.sendLoginMessage(socket);
    };

    socket.onmessage = (m) => {
      SocketHandler.handleMessage(m, {pc, createPC, socket})
    };
  }

  sendLoginMessage(socket) {
    const message = {
      "jsonrpc":"2.0",
      "method":"login",
      "params": {
        "login":"bbbuser@rn.blindside-dev.com",
        "passwd":"secret",
        "loginParams":{},
        "userVariables":{},
        "sessid": `native-${Date.now()}`
      },
      "id": 3
    }
    socket.send(JSON.stringify(message));
  }

  render() {
    const info = [<Text key={'info-123'}>Info:</Text>];

    Object.keys(this.state.stats).forEach(a => {
      info.push(<Text key={a}>{a} {this.state.stats[a]}</Text>);
    });

    return (
      <View style={styles.container}>
        {
          mapHash(this.state.remoteList, function(remote, index) {
            return (
              <View key={index}>
                <Text>index: {index} - remote: {remote}</Text>
                <RTCView key={index} streamURL={remote} style={styles.remoteView}/>
              </View>
            )
          })
        }
        {info}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  selfView: {
    width: 200,
    height: 150,
  },
  remoteView: {
    width: 200,
    height: 150,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  listViewContainer: {
    height: 150,
  },
});

AppRegistry.registerComponent('RCTWebRTCDemo', () => RCTWebRTCDemo);
