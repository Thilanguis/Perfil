const { app } = require('@azure/functions');

const SITE_PERMITIDO = 'https://thilanguis.github.io';

const VOZES_PERMITIDAS = new Set(['pt-BR-FranciscaNeural', 'pt-BR-ElzaNeural', 'pt-BR-ThalitaNeural', 'pt-BR-YaraNeural', 'pt-BR-LeticiaNeural', 'pt-BR-GiovannaNeural', 'pt-BR-LeilaNeural', 'pt-BR-BrendaNeural']);

function origemPermitida(origin) {
  if (!origin) return true;

  return origin === SITE_PERMITIDO || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
}

function headersCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || SITE_PERMITIDO,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function escaparXml(texto) {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

app.http('sintetizarVoz', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',

  handler: async (request, context) => {
    const origin = request.headers.get('origin');

    if (!origemPermitida(origin)) {
      return {
        status: 403,
        body: 'Origem não permitida.',
      };
    }

    const cors = headersCors(origin);

    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers: cors,
      };
    }

    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION;

    if (!azureKey || !azureRegion) {
      context.error('Variáveis do Azure Speech não configuradas.');

      return {
        status: 500,
        headers: cors,
        jsonBody: {
          error: 'Configuração do servidor incompleta.',
        },
      };
    }

    let dados;

    try {
      dados = await request.json();
    } catch {
      return {
        status: 400,
        headers: cors,
        jsonBody: {
          error: 'Envie um JSON válido.',
        },
      };
    }

    const texto = typeof dados.text === 'string' ? dados.text.trim() : '';

    const voz = VOZES_PERMITIDAS.has(dados.voice) ? dados.voice : 'pt-BR-FranciscaNeural';

    if (!texto) {
      return {
        status: 400,
        headers: cors,
        jsonBody: {
          error: 'O texto é obrigatório.',
        },
      };
    }

    if (texto.length > 2000) {
      return {
        status: 400,
        headers: cors,
        jsonBody: {
          error: 'O texto ultrapassa o limite permitido.',
        },
      };
    }

    const ssml = `
      <speak
        version="1.0"
        xmlns="http://www.w3.org/2001/10/synthesis"
        xml:lang="pt-BR"
      >
        <voice name="${voz}">
          <prosody rate="0.93" pitch="-2%">
            ${escaparXml(texto)}
          </prosody>
        </voice>
      </speak>
    `;

    try {
      const respostaAzure = await fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'PerfilTribute',
        },
        body: ssml,
      });

      if (!respostaAzure.ok) {
        const detalhe = await respostaAzure.text();

        context.error(`Erro do Azure Speech: ${respostaAzure.status}`, detalhe);

        return {
          status: 502,
          headers: cors,
          jsonBody: {
            error: 'A Azure não conseguiu gerar a voz.',
          },
        };
      }

      const audio = Buffer.from(await respostaAzure.arrayBuffer());

      return {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
        body: audio,
      };
    } catch (error) {
      context.error('Erro ao gerar voz:', error);

      return {
        status: 500,
        headers: cors,
        jsonBody: {
          error: 'Erro interno ao gerar a voz.',
        },
      };
    }
  },
});
