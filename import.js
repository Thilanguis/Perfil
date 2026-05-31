const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceAccountKey.json'); // Você baixa essa chave no console do Firebase (Configurações > Service Accounts)

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

fs.createReadStream('baralho.csv')
  .pipe(csv())
  .on('data', async (row) => {
    const clues = [];
    for (let i = 1; i <= 20; i++) clues.push(row[`Dica ${i}`]);

    await db.collection('deck').add({
      category: row.Categoria,
      answer: row.Resposta,
      clues: clues,
    });
    console.log('Carta importada:', row.Resposta);
  });
