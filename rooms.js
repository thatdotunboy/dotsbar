const socket = io();
let currentRoom = null;
let localStream;
let peerConnections = new Map();
let isJoined = false;
let isMuted = false;
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');

// DOM elements
const roomsContainer = document.getElementById('rooms-container');
const createRoomForm = document.getElementById('create-room-form');
const roomView = document.getElementById('room-view');
const roomsList = document.getElementById('rooms-list');
const createRoomSection = document.getElementById('create-room');
const joinButton = document.getElementById('join-room');
const muteButton = document.getElementById('mute-toggle');
const leaveButton = document.getElementById('leave-room');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message');
const messagesDiv = document.getElementById('messages');
const tipButton = document.getElementById('tip-button');
const userInfoDiv = document.getElementById('user-info');

// WebRTC config
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Auth check
if (!token || !user) {
  window.location.href = 'index.html';
} else {
  userInfoDiv.innerHTML = `<span>Welcome, ${user.username}</span> <button id="logout">Logout</button>`;
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}

// Load rooms
async function loadRooms() {
  const res = await fetch('/api/rooms');
  const rooms = await res.json();
  roomsContainer.innerHTML = '';
  rooms.forEach(room => {
    const roomEl = document.createElement('div');
    roomEl.className = 'room-card';
    roomEl.innerHTML = `
      <h3>${room.name}</h3>
      <p>${room.description || ''}</p>
      <p>By: ${room.creatorId.username}</p>
      <button onclick="enterRoom('${room.name}')">Enter Room</button>
    `;
    roomsContainer.appendChild(roomEl);
  });
}

// Create room
createRoomForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('room-name').value;
  const description = document.getElementById('room-description').value;
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name, description })
  });
  if (res.ok) {
    loadRooms();
    createRoomForm.reset();
  }
});

// Enter room
function enterRoom(roomName) {
  currentRoom = roomName;
  document.getElementById('current-room-name').textContent = roomName;
  roomsList.style.display = 'none';
  createRoomSection.style.display = 'none';
  roomView.style.display = 'block';
}

// Join room
joinButton.addEventListener('click', async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    document.getElementById('local-video').srcObject = localStream;
    socket.emit('join-room', currentRoom);
    isJoined = true;
    joinButton.disabled = true;
    muteButton.disabled = false;
    leaveButton.disabled = false;
  } catch (error) {
    alert('Could not access camera/microphone');
  }
});

// Mute toggle
muteButton.addEventListener('click', () => {
  if (localStream) {
    localStream.getAudioTracks()[0].enabled = isMuted;
    muteButton.textContent = isMuted ? 'Mute' : 'Unmute';
    isMuted = !isMuted;
  }
});

// Leave room
leaveButton.addEventListener('click', () => {
  socket.emit('leave-room', currentRoom);
  localStream.getTracks().forEach(track => track.stop());
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
  isJoined = false;
  joinButton.disabled = false;
  muteButton.disabled = true;
  leaveButton.disabled = true;
  roomView.style.display = 'none';
  roomsList.style.display = 'block';
});

// Chat
sendButton.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('chat-message', { roomId: currentRoom, message });
    messageInput.value = '';
  }
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendButton.click();
});

// Tip
tipButton.addEventListener('click', () => {
  const amount = prompt('Enter tip amount:');
  if (amount) {
    socket.emit('tip', { roomId: currentRoom, amount: parseFloat(amount), fromUserId: user.id });
  }
});

// Socket events
socket.on('user-joined', (userId) => {
  if (isJoined) createPeerConnection(userId, true);
});

socket.on('user-left', (userId) => {
  if (peerConnections.has(userId)) {
    peerConnections.get(userId).close();
    peerConnections.delete(userId);
  }
});

socket.on('offer', async (data) => {
  const pc = createPeerConnection(data.from, false);
  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { answer, roomId: currentRoom });
});

socket.on('answer', (data) => {
  peerConnections.get(data.from).setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', (data) => {
  peerConnections.get(data.from).addIceCandidate(new RTCIceCandidate(data.candidate));
});

socket.on('chat-message', (msg) => {
  const msgEl = document.createElement('div');
  msgEl.textContent = `${msg.username}: ${msg.message}`;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('tip', (data) => {
  alert(`Received tip of ${data.amount} from ${data.from}`);
});

// WebRTC helpers
function createPeerConnection(userId, isInitiator) {
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(userId, pc);

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  if (isInitiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId: currentRoom });
    });
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { candidate: event.candidate, roomId: currentRoom });
    }
  };

  pc.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    document.getElementById('remote-videos').appendChild(remoteVideo);
  };

  return pc;
}

// Show create room if creator
if (user.isCreator) {
  createRoomSection.style.display = 'block';
}

loadRooms();
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMuted;
    });
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  }
});

// Leave room
leaveButton.addEventListener('click', () => {
  if (isJoined) {
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Leave room
    socket.emit('leave-room', roomId);
    isJoined = false;

    // Update UI
    joinButton.disabled = false;
    muteButton.disabled = true;
    statusDiv.textContent = 'Not connected';
    participantsDiv.innerHTML = '';

    console.log('Left room');
  }
});

// Socket event handlers
socket.on('user-joined', async (userId) => {
  console.log('User joined:', userId);

  // Create peer connection for new user
  const peerConnection = createPeerConnection(userId);

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('offer', {
    roomId,
    offer: offer,
    to: userId
  });

  updateUserCount();
});

socket.on('user-left', (userId) => {
  console.log('User left:', userId);

  // Close and remove peer connection
  if (peerConnections.has(userId)) {
    peerConnections.get(userId).close();
    peerConnections.delete(userId);
  }

  updateUserCount();
});

socket.on('offer', async (data) => {
  console.log('Received offer from:', data.from);

  const peerConnection = createPeerConnection(data.from);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', {
    roomId,
    answer: answer,
    to: data.from
  });
});

socket.on('answer', async (data) => {
  console.log('Received answer from:', data.from);

  const peerConnection = peerConnections.get(data.from);
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  }
});

socket.on('ice-candidate', (data) => {
  const peerConnection = peerConnections.get(data.from);
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

// Helper functions
function createPeerConnection(userId) {
  const peerConnection = new RTCPeerConnection(rtcConfig);

  // Add local stream
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    console.log('Received remote stream from:', userId);
    // In a full implementation, you'd play the remote audio
    // For simplicity, we'll just log it
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        roomId,
        candidate: event.candidate,
        to: userId
      });
    }
  };

  peerConnections.set(userId, peerConnection);
  return peerConnection;
}

function updateUserCount() {
  userCountDiv.textContent = `Users online: ${peerConnections.size + 1}`;
}

// Initialize
updateUserCount();
