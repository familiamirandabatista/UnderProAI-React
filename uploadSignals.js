const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const signalsCollection = db.collection('signals');
const filePath = './public/dicas-da-semana.txt';

async function clearOldSignals() {
  const snapshot = await signalsCollection.get();
  if (snapshot.empty) {
    console.log('Nenhum sinal antigo para apagar.');
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`[ETAPA 1/3] Sucesso: ${snapshot.size} sinais antigos foram apagados.`);
}

async function uploadSignals() {
  console.log('[ETAPA 1/3] Iniciando limpeza da coleção de sinais...');
  try {
    await clearOldSignals();

    console.log('\n[ETAPA 2/3] Lendo e interpretando o arquivo de dicas...');
    const data = fs.readFileSync(filePath, 'utf8');
    const gameBlocks = data.split('🎯 PARTIDA:').slice(1);

    if (gameBlocks.length === 0) {
      console.log('Nenhuma partida encontrada no arquivo. Processo finalizado.');
      return;
    }
    console.log(`[ETAPA 2/3] Sucesso: ${gameBlocks.length} blocos de partidas encontrados.`);

    console.log('\n[ETAPA 3/3] Enviando novos sinais para o Firestore...');
    const batch = db.batch();

    gameBlocks.forEach((block, index) => {
      const signalData = {};
      const lines = block.trim().split('\n');
      signalData.match = lines.shift().trim();

      // ### LÓGICA PRINCIPAL AQUI ###
      // Os dois primeiros sinais (índice 0 e 1) são marcados como gratuitos.
      signalData.isFree = index < 2;

      let currentSection = '';
      lines.forEach(line => {
        if (line.includes('PERFIL ENCONTRADO:')) {
            signalData.profile = line.split(':')[1].trim().replace(/"/g, '');
        } else if (line.includes('RESUMO DA ANÁLISE:')) {
            // Concatena múltiplas linhas de resumo
            signalData.analysis = (signalData.analysis || '') + line.split('📝 RESUMO DA ANÁLISE:')[1].trim() + ' ';
        } else if (line.includes('PONTO DE ATENÇÃO:')) {
            signalData.warning = (signalData.warning || '') + line.split('💡 PONTO DE ATENÇÃO:')[1].trim() + ' ';
        } else if (line.includes('MÉTRICAS CHAVE:')) {
            signalData.metrics = {};
            currentSection = 'metrics';
        } else if (currentSection === 'metrics' && line.startsWith('   -')) {
            const parts = line.split(':');
            if (parts.length > 1) {
                const key = parts[0].replace('   -', '').trim();
                const value = parseFloat(parts[1]);
                if (!isNaN(value)) {
                    signalData.metrics[key] = value;
                }
            }
        } else if (!line.includes('---') && !line.includes('===') && line.trim() !== '') {
            // Anexa linhas de continuação para a análise ou ponto de atenção
            if (signalData.warning) {
                signalData.warning += line.trim() + ' ';
            } else if (signalData.analysis) {
                signalData.analysis += line.trim() + ' ';
            }
        }
      });
      
      signalData.profile = signalData.profile || 'Não especificado';
      signalData.analysis = (signalData.analysis || 'Análise não disponível.').trim();
      signalData.warning = (signalData.warning || 'Nenhum ponto de atenção específico.').trim();
      signalData.metrics = signalData.metrics || {};
      signalData.betSuggestion = 'Mercado de Menos de 3.5 Gols.';
      
      const newSignalRef = signalsCollection.doc();
      batch.set(newSignalRef, signalData);
    });

    await batch.commit();
    console.log(`[ETAPA 3/3] Sucesso! ${gameBlocks.length} novos sinais foram enviados para o Firestore.`);
    console.log('\nProcesso concluído com sucesso!');

  } catch (error) {
    console.error('\nOcorreu um erro durante o processo:', error);
  }
}

uploadSignals();