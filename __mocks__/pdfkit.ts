// Minimal manual mock for pdfkit used in Jest tests (TypeScript)
// Provides a PDFDocument constructor that returns a lightweight in-memory document
function createPage(width = 612, height = 792) {
  return { width, height, drawRectangle: () => {} };
}

function createDoc() {
  const pages: any[] = [createPage()];
  const listeners: Record<string, Function[]> = Object.create(null);

  const doc: any = {
    pages,
    page: pages[0],
    x: 50,
    y: 72,
    _lastLineHeight: 12,

    font(name?: string) { return this; },
    fontSize(sz?: number) { this._lastLineHeight = sz ?? this._lastLineHeight; return this; },
    widthOfString(str?: string) { return (typeof str === 'string' ? Math.max(20, str.length * 6) : 100); },
    text(str?: string, x?: number, y?: number, opts?: any) {
      if (typeof y === 'number') {
        this.x = x;
        this.y = y;
      } else {
        this.y = (this.y || 0) + (this._lastLineHeight || 12);
      }
      return this;
    },
    rect() { return this; },
    fillColor() { return this; },
    fill() { return this; },

    addPage(opts?: any) {
      const size = Array.isArray(opts?.size) ? opts.size : [612, 792];
      const p = createPage(size[0], size[1]);
      pages.push(p);
      this.page = p;
      // emit pageAdded
      (listeners.pageAdded || []).forEach(cb => { try { cb(p); } catch (e) {} });
      return p;
    },

    bufferedPageRange() { return { count: pages.length }; },
    switchToPage(i: number) { this.page = pages[i]; return this; },
    registerFont() { return this; },

    // Emulate streaming save: trigger data + end listeners synchronously
    save() {
      (listeners.data || []).forEach(cb => { try { cb(Buffer.from('mock')); } catch (e) {} });
      (listeners.end || []).forEach(cb => { try { cb(); } catch (e) {} });
      return this;
    },

    on(event: string, cb: Function) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return this;
    },

    openImage(bufOrPath?: any) { return { width: 600, height: 400 }; },
    image() { return this; },

    ref(obj?: any) {
      const refObj = { ref: { toString: () => '1 0 R' }, obj: obj || {} };
      return refObj;
    },

    catalog: { obj: {} },

    pageIndex(n: number) { return n; }
  };

  return doc;
}

// Create a singleton doc instance so all calls to the mocked constructor
// return the same object and tests/prod code share state
const _singletonDoc = createDoc();

// Export a plain constructor function that returns the singleton and expose helper
// Attach __getDoc to support test inspection (same shape as the previous JS mock).
function PDFDocument(opts?: any) {
  return _singletonDoc;
}
(PDFDocument as any).__getDoc = () => _singletonDoc;

export default PDFDocument;
