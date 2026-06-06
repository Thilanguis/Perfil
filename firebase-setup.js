// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: 'AIzaSyAM3PkvXd9GJKHSfusaA_wFSi8iYlK8rBM',
  authDomain: 'perfil-6a7ce.firebaseapp.com',
  projectId: 'perfil-6a7ce',
  storageBucket: 'perfil-6a7ce.firebasestorage.app',
  messagingSenderId: '410087166137',
  appId: '1:410087166137:web:c3944ce6d0ad8c613a4b68',
  measurementId: 'G-FP3ED38SNF',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Puxa o ID da sala pela URL
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('sala');

// Se não existir sala na URL, gera um ID único do Firestore e injeta na URL sem recarregar
if (!roomId) {
  roomId = db.collection('findom_sessions').doc().id;
  window.history.replaceState(null, '', `?sala=${roomId}`);
}

// Aponta o gameRef para a sala correta (nova ou existente)
const gameRef = db.collection('findom_sessions').doc(roomId);
