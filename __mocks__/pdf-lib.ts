// Minimal manual mock for pdf-lib used in Jest tests (TypeScript)
export const PDFDocument = {
  load: (async (buffer: Buffer) => {
    return { getPageCount: () => 1 };
  }) as (buffer: Buffer) => Promise<{ getPageCount: () => number }>,
};

export default { PDFDocument };
