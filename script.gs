// ─── CORS helper ─────────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function makeJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Mapa de campus → nombre EXACTO de hoja ──────────────────────────────────
const CAMPUS_HOJAS = {
  '11 Sur':      'Asistencias 11 Sur',
  'Nacional':    'Asistencias Av Nacional',
  'Huejotzingo': 'Asistencias Huejotzingo'
};

// ─── doGet ────────────────────────────────────────────────────────────────────
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'registrarAsistencia') {
    try {
      const id_escaneado = (e.parameter.id_escaneado || '').trim();
      const campus       = (e.parameter.campus || '').trim();

      logDebug('doGet recibido', { id_escaneado, campus }); // ← log para ver qué llega

      if (!id_escaneado) throw new Error('ID escaneado vacío.');
      if (!campus)       throw new Error('Campus no especificado.');
      if (!CAMPUS_HOJAS[campus]) throw new Error('Campus no reconocido: "' + campus + '"');

      const mensaje = registrarAsistencia({ id_escaneado, campus });
      return makeJSON({ status: 'ok', message: mensaje });
    } catch (err) {
      logDebug('ERROR doGet', { error: err.message });
      return makeJSON({ status: 'error', message: err.message });
    }
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Registro de Asistencia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── doPost ───────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body         = JSON.parse(e.postData.contents);
    const id_escaneado = (body.id_escaneado || '').trim();
    const campus       = (body.campus || '').trim();

    logDebug('doPost recibido', { id_escaneado, campus });

    if (!id_escaneado) throw new Error('ID escaneado vacío.');
    if (!campus)       throw new Error('Campus no especificado.');
    if (!CAMPUS_HOJAS[campus]) throw new Error('Campus no reconocido: "' + campus + '"');

    const mensaje = registrarAsistencia({ id_escaneado, campus });
    return makeJSON({ status: 'ok', message: mensaje });
  } catch (err) {
    logDebug('ERROR doPost', { error: err.message });
    return makeJSON({ status: 'error', message: err.message });
  }
}

// ─── Resuelve (o crea) la hoja según el campus ───────────────────────────────
function obtenerHoja(campus) {
  const nombreHoja = CAMPUS_HOJAS[campus];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    hoja.appendRow(['ID Registro', 'ID Escaneado', 'Fecha', 'Hora', 'Usuario']);
  }

  return hoja;
}

// ─── Registro principal ───────────────────────────────────────────────────────
function registrarAsistencia(datos) {
  const hoja = obtenerHoja(datos.campus);

  const ahora      = new Date();
  const idRegistro = 'REG-' + ahora.getTime();
  const fecha      = Utilities.formatDate(ahora, 'America/Mexico_City', 'dd/MM/yyyy');
  const hora       = Utilities.formatDate(ahora, 'America/Mexico_City', 'HH:mm:ss');
  const usuario    = Session.getActiveUser().getEmail() || 'Anónimo';

  hoja.appendRow([idRegistro, datos.id_escaneado, fecha, hora, usuario]);
  logDebug('Registro exitoso', { campus: datos.campus, hoja: CAMPUS_HOJAS[datos.campus] });
  return 'Asistencia registrada en ' + CAMPUS_HOJAS[datos.campus] + '.';
}

// ─── Log de depuración en hoja Registro_QR ───────────────────────────────────
function logDebug(evento, detalle) {
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    let log    = ss.getSheetByName('Registro_QR');
    if (!log) {
      log = ss.insertSheet('Registro_QR');
      log.appendRow(['Timestamp', 'Evento', 'Detalle']);
    }
    const ts = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm:ss');
    log.appendRow([ts, evento, JSON.stringify(detalle)]);
  } catch(e) {
    // silencioso para no romper el flujo principal
  }
}