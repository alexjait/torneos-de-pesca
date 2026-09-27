export function capturePhotoLabel(photoName: string, hasExistingEvidence: boolean) {
  if (photoName) {
    return photoName;
  }

  return hasExistingEvidence ? 'Evidencia actual' : 'Sin foto seleccionada';
}
