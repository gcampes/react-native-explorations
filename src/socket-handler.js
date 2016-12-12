import Logger from './utils/logger.js';

import {
  RTCSessionDescription,
} from 'react-native-webrtc';

const handleMessage = (message, misc) => {
  let {
    pc,
    createPC,
    socket,
  } = misc;
  Logger.log('Socket received message', message.data, JSON.parse(message.data));
  const data = JSON.parse(message.data);
  if (data.method === 'verto.answer') {
    Logger.log('this is remote sdp', data.params.sdp);
    let remoteSdp = new RTCSessionDescription();
    remoteSdp.type = 'answer';
    remoteSdp.sdp = data.params.sdp;
    Logger.log(`remote`, remoteSdp);
    pc.setRemoteDescription(remoteSdp,
      () => {Logger.log(`Remote SDP Set`); connected = true;},
      () => Logger.log('Error Setting Remote SDP', arguments));
    return;
  } else if (data.method === 'verto.event') {
    Logger.log('I dont know what to do with this message, but its ok');
    return;
  }
  if (data.error) {
    Logger.error('Socket received messate', data);
  }
  const result = data.result;
  if (result.message === 'logged in') {
    pc = createPC(socket, result.sessid, true);
  }
};

export default {
  handleMessage
};
