import assert from 'node:assert/strict';
import { capturePhotoLabel } from '../src/lib/capture-photo-upload.ts';

assert.equal(
  capturePhotoLabel('dorado-ganador.jpg', false),
  'dorado-ganador.jpg',
  'capturePhotoLabel shows the selected file name',
);

assert.equal(
  capturePhotoLabel('', true),
  'Evidencia actual',
  'capturePhotoLabel identifies the image already attached to a capture',
);

assert.equal(
  capturePhotoLabel('', false),
  'Sin foto seleccionada',
  'capturePhotoLabel clearly communicates the missing required evidence',
);

console.log('Capture photo upload checks passed');
