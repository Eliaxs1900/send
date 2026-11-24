// Pegar desde el portapapeles en la página de subida, de dos maneras:
//  - Ctrl+V / ⌘V en cualquier parte de la página: archivos copiados en el
//    Finder o el explorador, capturas de pantalla, imágenes y texto.
//  - El botón «Pegar del portapapeles» (evento 'pasteClipboard'), que usa
//    navigator.clipboard.read(): imágenes y texto. Necesita HTTPS y que el
//    navegador lo permita (Firefox, desde la 127, pide confirmación con un
//    botón «Pegar» junto al cursor).
import okDialog from './ui/okDialog';
import { pasteShortcut } from './utils';

const IMAGE_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg'
};

function stamp(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// Lo que llega del portapapeles sin nombre, o con el genérico que ponen los
// navegadores a las capturas («image.png»), recibe uno con fecha y hora para
// que dos pegados seguidos no se pisen dentro del mismo archivo comprimido.
export function namePastedFiles(blobs, now = new Date()) {
  const base = `pasted-${stamp(now)}`;
  const seen = {};
  return blobs.map(blob => {
    const name = blob.name || '';
    if (name && !/^image\.[a-z0-9]+$/i.test(name)) {
      return blob instanceof File
        ? blob
        : new File([blob], name, { type: blob.type });
    }
    const ext =
      blob.type === 'text/plain'
        ? 'txt'
        : IMAGE_EXTENSIONS[blob.type] ||
          (name.split('.').pop() || 'bin').toLowerCase();
    seen[ext] = (seen[ext] || 0) + 1;
    const suffix = seen[ext] > 1 ? `-${seen[ext]}` : '';
    return new File([blob], `${base}${suffix}.${ext}`, {
      type: blob.type,
      lastModified: now.getTime()
    });
  });
}

function textBlob(text) {
  return new Blob([text], { type: 'text/plain' });
}

// Evento 'paste': primero archivos (clipboardData.files es lo más fiable en
// Firefox, Chrome y Safari; items queda de reserva) y, si no hay, el texto
// plano, nunca el HTML que acompaña a lo copiado de una web.
export function filesFromClipboardData(data) {
  let blobs = Array.from(data.files || []);
  if (!blobs.length) {
    blobs = Array.from(data.items || [])
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(Boolean);
  }
  if (!blobs.length) {
    const text = data.getData('text/plain');
    if (text) {
      blobs = [textBlob(text)];
    }
  }
  return namePastedFiles(blobs);
}

// Botón: la API asíncrona solo da imágenes y texto (no archivos del Finder).
export async function readClipboardFiles() {
  const clipboard = navigator.clipboard;
  const blobs = [];
  if (clipboard.read) {
    const items = await clipboard.read();
    for (const item of items) {
      const image = item.types.find(type => type.startsWith('image/'));
      if (image) {
        blobs.push(await item.getType(image));
      } else if (item.types.includes('text/plain')) {
        const text = await (await item.getType('text/plain')).text();
        if (text) {
          blobs.push(textBlob(text));
        }
      }
    }
  } else {
    const text = await clipboard.readText();
    if (text) {
      blobs.push(textBlob(text));
    }
  }
  return namePastedFiles(blobs);
}

function isEditable(target) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return target.tagName === 'INPUT' && target.type !== 'file';
}

export default function(state, emitter) {
  window.addEventListener('paste', event => {
    if (state.route !== '/' || state.uploading || state.modal) return;
    if (isEditable(event.target) || !event.clipboardData) return;

    const files = filesFromClipboardData(event.clipboardData);
    if (files.length) {
      event.preventDefault();
      emitter.emit('addFiles', { files });
    }
  });

  emitter.on('pasteClipboard', async () => {
    if (state.route !== '/' || state.uploading) return;
    let files;
    try {
      files = await readClipboardFiles();
    } catch (e) {
      // NotAllowedError (permiso denegado o confirmación cancelada) u otro
      // fallo del navegador: queda el atajo de teclado.
      state.modal = okDialog(
        state.translate('clipboardReadFailed', { shortcut: pasteShortcut() })
      );
      return emitter.emit('render');
    }
    if (!files.length) {
      state.modal = okDialog(state.translate('clipboardEmpty'));
      return emitter.emit('render');
    }
    emitter.emit('addFiles', { files });
  });
}
