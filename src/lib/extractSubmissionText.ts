const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20_000;

export const MOOT_SUBMISSION_ACCEPT = '.pdf,.docx,.txt';

export const extractSubmissionText = async (file: File): Promise<string> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('The file must be 10MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  let text = '';

  if (extension === 'txt') {
    text = await file.text();
  } else if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = result.value;
  } else if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    text = pages.join('\n\n');
  } else {
    throw new Error('Upload a PDF, DOCX, or TXT file.');
  }

  const trimmed = text.trim();
  if (trimmed.length < 50) {
    throw new Error('We could not read enough text from this file. Try a text-based PDF, DOCX, or TXT file.');
  }
  return trimmed.slice(0, MAX_TEXT_LENGTH);
};