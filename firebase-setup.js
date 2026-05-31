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
const gameRef = db.collection('findom_sessions').doc('sala_principal');
