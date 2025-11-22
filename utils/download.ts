// utils/download.ts
export const downloadStringAsFile = (content: string, fileName: string, mimeType: string): void => {
  let finalContent = content;
  if (mimeType.startsWith('text/csv') && !content.startsWith('data:text/csv')) {
    finalContent = `data:${mimeType},${encodeURIComponent(content)}`;
  }

  const link = document.createElement('a');
  link.href = finalContent;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};