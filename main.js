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
  RTCSessionDescription,
  RTCView,
  MediaStreamTrack,
  getUserMedia,
} from 'react-native-webrtc';

import App from './app/components/App';

const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

let pcPeers = {};
let localStream;

const logError = (error) => {
  console.log("logError", error);
}

const getLocalStream = (isFront, callback) => {
  MediaStreamTrack.getSources(sourceInfos => {
    console.log(sourceInfos);
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
      console.log('dddd', stream);
      callback(stream);
    }, logError);
  });
}

let candidates = "";
let candidateTimeout;
let connected = false;
const createPC = (socket, socketId, isOffer) => {
  const pc = new RTCPeerConnection(configuration);
  console.log(`1`);
  pcPeers[socketId] = pc;
  console.log(`2`);

  pc.onicecandidate = function (event) {
    console.log('onicecandidate', event.candidate);
    console.log(pc.localDescription);
    if (event.candidate) {
      candidates = candidates + `a=${event.candidate.candidate}\r\n`;
    }
    clearTimeout(candidateTimeout);
    candidateTimeout = setTimeout(iceCompleted, 1000);
  };

  function iceCompleted() {
    const message = {
      "jsonrpc": "2.0",
      "method": "verto.invite",
      "params": {
        "sdp": pc.localDescription.sdp + candidates,
        "dialogParams": {
          "useVideo": true,
          "useStereo": false,
          "screenShare": false,
          "useCamera": "default",
          "useMic": "default",
          "useSpeak": "default",
          "tag": "deskshareVideo",
          "localTag": null,
          "login": "bbbuser",
          "videoParams": {
            "minFrameRate": 15
          },
        "destination_number": "71234-DESKSHARE",
        "caller_id_name": "Test",
        "caller_id_number": "a@b.c",
        "outgoingBandwidth": 1302,
        "incomingBandwidth": 630,
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
      setTimeout(() => {
        getStats();
      }, 1000);
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

  console.log(`3`);
  pc.addStream(localStream);
  console.log(`4`);
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
  return;
  // const pc = pcPeers[Object.keys(pcPeers)[0]];
  console.log(pc.get);
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    console.log('track', track);
    pc.getStats(track, function(report) {
      console.log('getStats report', report);
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
    };
  }

  componentDidMount() {
    container = this;
    console.log(`4Head`);
    const socket = new WebSocket('wss://rn.blindside-dev.com:8082');
    socket._send = socket.send;
    socket.send = (message) => {
      console.log('Socket sending', message);
      socket._send(message);
    }
    console.log('forehead', socket);
      socket.onopen = (data) => {
        getLocalStream(true, function(stream) {
        localStream = stream;
      });
      console.log('Connection Opened');
      this.sendLoginMessage(socket);
    };

    socket.onmessage = (m) => {
      const data = JSON.parse(m.data);
      console.log('Socket received message', m.data, JSON.parse(m.data));
      if (data.method === 'verto.answer') {
        console.log('this is remote sdp', data.params.sdp);
        let remoteSdp = new RTCSessionDescription(data.params.sdp);
        console.log(remoteSdp);
        remoteSdp.type = 'answer';
        remoteSdp.sdp = data.params.sdp;
        console.log(`remote`, remoteSdp);
        pc.setRemoteDescription(remoteSdp,
          () => {console.log(`Aleluia irmãos`); connected = true},
          () => console.log('Deu erro', arguments));
        return;
      } else if (data.method === 'verto.event') {
        console.log('I dont know what to do');
        return;
      }
      if (data.error) {
        console.error('Socket received messate', data);
      }
      const result = data.result;
      if (result.message === 'logged in') {
        pc = createPC(socket, result.sessid, true);
      }
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

    // console.log('src', this.state.selfViewSrc);
    return (
      <View style={styles.container}>

        {
          mapHash(this.state.remoteList, function(remote, index) {
            return (
              <View>
                <Text>index: {index} - remote: {remote}</Text>
                <RTCView key={index} streamURL={remote} style={styles.remoteView}/>
              </View>
            )
          })
        }
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
