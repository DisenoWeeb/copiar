/* ═══════════════════════════════════════════════════════════════
   COPIÁ DEL CUADERNO — app.js
   Vanilla JS · No frameworks · Mobile First
   ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN: completar las variables de la sección CONFIG
═══════════════════════════════════════════════════════════════ */

/* ═══════════════ CONFIG ═══════════════════════════════════════
   Reemplazar con tus propios valores antes de publicar.
   La API Key de OpenAI NUNCA va aquí, vive en Apps Script.
══════════════════════════════════════════════════════════════ */
const CONFIG = {
  // Cloudinary — obtener en cloudinary.com/console
  CLOUDINARY_CLOUD_NAME: 'TU_CLOUD_NAME',          // ej: 'mi-cloud'
  CLOUDINARY_UPLOAD_PRESET: 'TU_UNSIGNED_PRESET',  // ej: 'cuaderno_preset'

  // Google Apps Script — URL del Web App desplegado
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_SCRIPT_ID/exec',
};

/* ═══════════════ Estado de la aplicación ═══════════════════ */
const state = {
  files: [],           // File[] — archivos originales seleccionados
  cloudinaryUrls: [],  // string[] — URLs públicas tras subir a Cloudinary
  resultado: null,     // objeto JSON devuelto por Apps Script
};

/* ═══════════════ Referencias DOM ═══════════════════════════ */
const $ = id => document.getElementById(id);

const screenUpload   = $('screen-upload');
const screenResult   = $('screen-result');

const dropZone       = $('dropZone');
const fileInput      = $('fileInput');
const btnSelect      = $('btnSelect');
const previewSection = $('previewSection');
const previewCount   = $('previewCount');
const thumbnailGrid  = $('thumbnailGrid');
const actionBar      = $('actionBar');
const btnGenerate    = $('btnGenerate');
const btnClearUpload = $('btnClearUpload');
const progressWrap   = $('progressWrap');
const progressFill   = $('progressFill');
const progressMsg    = $('progressMsg');
const errorBox       = $('errorBox');
const errorText      = $('errorText');
const errorClose     = $('errorClose');

const btnBack        = $('btnBack');
const btnClearResult = $('btnClearResult');
const notebook       = $('notebook');

/* ═══════════════ Selección y preview de imágenes ═══════════ */

btnSelect.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', e => {
  if (e.target === btnSelect || e.target.closest('.btn--primary')) return;
  fileInput.click();
});

dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// Drag & drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const dt = e.dataTransfer;
  if (dt && dt.files.length) handleFiles(Array.from(dt.files));
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

function handleFiles(newFiles) {
  const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) { showError('Seleccioná al menos una imagen.'); return; }
  hideError();
  state.files = [...state.files, ...imageFiles];
  renderThumbnails();
}

function renderThumbnails() {
  thumbnailGrid.innerHTML = '';
  state.files.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'thumbnail-item';

    const img = document.createElement('img');
    img.alt = `Página ${idx + 1}`;
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);

    const num = document.createElement('span');
    num.className = 'thumbnail-item__num';
    num.textContent = idx + 1;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'thumbnail-item__remove';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `Eliminar página ${idx + 1}`);
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removeFile(idx); });

    item.append(img, num, removeBtn);
    thumbnailGrid.appendChild(item);
  });

  const hasFiles = state.files.length > 0;
  previewSection.hidden = !hasFiles;
  actionBar.hidden = !hasFiles;
  previewCount.textContent = `${state.files.length} foto${state.files.length !== 1 ? 's' : ''}`;
}

function removeFile(idx) {
  state.files.splice(idx, 1);
  renderThumbnails();
  if (!state.files.length) resetUploadScreen();
}

/* ═══════════════ Limpiar ════════════════════════════════════ */

function resetUploadScreen() {
  state.files = [];
  state.cloudinaryUrls = [];
  state.resultado = null;
  thumbnailGrid.innerHTML = '';
  previewSection.hidden = true;
  actionBar.hidden = true;
  progressWrap.hidden = true;
  setProgress(0, '');
  hideError();
  btnGenerate.disabled = false;
  btnGenerate.innerHTML = '<span class="btn-icon">✨</span> Generar Cuaderno';
}

btnClearUpload.addEventListener('click', resetUploadScreen);
btnClearResult.addEventListener('click', () => {
  resetUploadScreen();
  showScreen('upload');
});
btnBack.addEventListener('click', () => showScreen('upload'));

/* ═══════════════ Pantallas ══════════════════════════════════ */

function showScreen(name) {
  if (name === 'upload') {
    screenUpload.classList.add('active');
    screenResult.classList.remove('active');
  } else {
    screenUpload.classList.remove('active');
    screenResult.classList.add('active');
    window.scrollTo(0, 0);
  }
}

/* ═══════════════ Progreso ═══════════════════════════════════ */

function setProgress(pct, msg) {
  progressFill.style.width = pct + '%';
  progressMsg.textContent = msg;
}

function showProgress(msg) {
  progressWrap.hidden = false;
  progressMsg.textContent = msg;
}

function hideProgress() {
  progressWrap.hidden = true;
  setProgress(0, '');
}

/* ═══════════════ Errores ════════════════════════════════════ */

function showError(msg) {
  errorText.textContent = msg;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
  errorText.textContent = '';
}

errorClose.addEventListener('click', hideError);

/* ═══════════════ GENERAR CUADERNO ══════════════════════════ */

btnGenerate.addEventListener('click', async () => {
  if (!state.files.length) { showError('Primero elegí al menos una foto del cuaderno.'); return; }

  // Validar config
  if (
    CONFIG.CLOUDINARY_CLOUD_NAME === 'TU_CLOUD_NAME' ||
    CONFIG.CLOUDINARY_UPLOAD_PRESET === 'TU_UNSIGNED_PRESET' ||
    CONFIG.APPS_SCRIPT_URL.includes('TU_SCRIPT_ID')
  ) {
    showError('Completá la configuración en app.js (Cloudinary y Apps Script URL).');
    return;
  }

  hideError();
  btnGenerate.disabled = true;
  btnGenerate.innerHTML = '<span class="btn-icon">⏳</span> Procesando...';
  showProgress('Preparando imágenes...');
  setProgress(5, 'Preparando imágenes...');

  try {
    // PASO 1 — Subir a Cloudinary
    state.cloudinaryUrls = await uploadToCloudinary(state.files);

    // PASO 2 — Enviar a Apps Script → OpenAI
    setProgress(70, 'Leyendo el cuaderno con IA... ✨');
    const resultData = await callAppsScript(state.cloudinaryUrls);

    // PASO 3 — Renderizar cuaderno digital
    setProgress(95, '¡Casi listo!');
    state.resultado = resultData;
    renderNotebook(state.resultado, state.files);

    setProgress(100, '¡Listo!');
    setTimeout(() => {
      hideProgress();
      showScreen('result');
    }, 600);

  } catch (err) {
    console.error(err);
    showError(err.message || 'Ocurrió un error inesperado. Intentá de nuevo.');
    hideProgress();
    btnGenerate.disabled = false;
    btnGenerate.innerHTML = '<span class="btn-icon">✨</span> Generar Cuaderno';
  }
});

/* ═══════════════ CLOUDINARY UPLOAD ═════════════════════════ */

async function uploadToCloudinary(files) {
  const urls = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    setProgress(10 + Math.round((i / total) * 50), `Subiendo foto ${i + 1} de ${total}...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'cuaderno');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Error al subir imagen ${i + 1}: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    if (!data.secure_url) throw new Error(`Cloudinary no devolvió URL para imagen ${i + 1}.`);
    urls.push(data.secure_url);
  }

  return urls;
}

/* ═══════════════ APPS SCRIPT ════════════════════════════════ */

async function callAppsScript(imageUrls) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // evitar preflight CORS
    body: JSON.stringify({ imageUrls }),
  });

  if (!res.ok) {
    throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('La respuesta del servidor no es JSON válido. Revisá el despliegue de Apps Script.');
  }

  if (data.error) throw new Error(data.error);
  if (!data.paginas || !Array.isArray(data.paginas)) {
    throw new Error('Respuesta inesperada del servidor. Revisá los logs de Apps Script.');
  }

  return data;
}

/* ═══════════════ RENDER CUADERNO ═══════════════════════════ */

/**
 * data: { paginas: [ { tipo_escritura, bloques: [ {tipo, contenido?} ] } ] }
 * files: File[] — las fotos originales del cuaderno
 */
function renderNotebook(data, files) {
  notebook.innerHTML = '';

  data.paginas.forEach((pagina, pIdx) => {
    if (pIdx > 0) {
      const sep = document.createElement('div');
      sep.className = 'nb-page-separator';
      sep.innerHTML = `
        <div class="nb-page-separator__line"></div>
        <span class="nb-page-separator__label">— Página ${pIdx + 1} —</span>
        <div class="nb-page-separator__line"></div>
      `;
      notebook.appendChild(sep);
    }

    const tipoEscritura = (pagina.tipo_escritura || 'MIXTA').toUpperCase();
    const bloques = Array.isArray(pagina.bloques) ? pagina.bloques : [];

    bloques.forEach(bloque => {
      if (bloque.tipo === 'texto' && bloque.contenido) {
        // Dividir por saltos de línea para respetar el renglonado
        const lineas = String(bloque.contenido).split('\n');
        lineas.forEach(linea => {
          const el = document.createElement('div');
          el.className = 'nb-block';
          const p = document.createElement('p');
          p.className = `nb-text tipo-${tipoEscritura}`;
          p.textContent = linea;
          el.appendChild(p);
          notebook.appendChild(el);
        });
      } else if (bloque.tipo === 'imagen') {
        const wrapper = document.createElement('div');
        wrapper.className = 'nb-block nb-image-block';

        const placeholder = document.createElement('div');
        placeholder.className = 'nb-image-placeholder';
        placeholder.innerHTML = `
          <span class="nb-image-placeholder__icon">🎨</span>
          <span>Acá hay un dibujo o imagen</span>
          <span style="font-size:.75rem;margin-top:4px;opacity:.7">(mirá el original)</span>
        `;
        wrapper.appendChild(placeholder);
        notebook.appendChild(wrapper);
      }
    });

    // Agregar foto original al final de cada página
    if (files[pIdx]) {
      const photoWrap = document.createElement('div');
      photoWrap.style.cssText = 'padding: 20px 0 10px; text-align: center;';

      const label = document.createElement('p');
      label.style.cssText = 'font-family: var(--font-school); font-size: .8rem; color: var(--gray-500); margin-bottom: 8px;';
      label.textContent = `📷 Foto original — página ${pIdx + 1}`;

      const img = document.createElement('img');
      img.className = 'original-photo';
      img.alt = `Foto original página ${pIdx + 1}`;
      img.src = URL.createObjectURL(files[pIdx]);
      img.onload = () => URL.revokeObjectURL(img.src);
      img.loading = 'lazy';

      photoWrap.append(label, img);
      notebook.appendChild(photoWrap);
    }
  });

  // Si no hubo contenido
  if (!notebook.children.length) {
    notebook.innerHTML = `
      <div class="nb-loading">
        <span style="font-size:3rem">🤔</span>
        <p class="nb-loading__text">No se encontró texto en las imágenes.<br>Intentá con una foto más nítida.</p>
      </div>
    `;
  }
}
