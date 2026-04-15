import {
  TUIPDFAgent, PDFInteractiveWizard, ChartBuilder, DiagramBuilder,
  AssetUploader, StyleConfigurator, PDFMenu, mainMenuOptions,
  presetSchemes, availableFonts, pageSizes, diagramTemplates,
  clearScreen, displayHeader, displaySection, displayProgress, spinner,
  displayResults, handleTUIError, gatherChartData, gatherDataset
} from '../../src/tui-agents';

describe('PDF TUI Components', () => {
  describe('TUIPDFAgent', () => {
    let agent: TUIPDFAgent;

    beforeEach(() => {
      agent = new TUIPDFAgent();
    });

    it('should create instance', () => {
      expect(agent).toBeInstanceOf(TUIPDFAgent);
    });

    it('should have runInteractive method', () => {
      expect(typeof agent.runInteractive).toBe('function');
    });

    it('should have runWithParams method', () => {
      expect(typeof agent.runWithParams).toBe('function');
    });
  });

  describe('PDFInteractiveWizard', () => {
    let wizard: PDFInteractiveWizard;

    beforeEach(() => {
      wizard = new PDFInteractiveWizard();
    });

    it('should create instance', () => {
      expect(wizard).toBeInstanceOf(PDFInteractiveWizard);
    });

    it('should have run method', () => {
      expect(typeof wizard.run).toBe('function');
    });
  });

  describe('ChartBuilder', () => {
    let builder: ChartBuilder;

    beforeEach(() => {
      builder = new ChartBuilder();
    });

    it('should create instance', () => {
      expect(builder).toBeInstanceOf(ChartBuilder);
    });

    it('should have run method', () => {
      expect(typeof builder.run).toBe('function');
    });

    it('should have createNewChart method', () => {
      expect(typeof builder.createNewChart).toBe('function');
    });
  });

  describe('DiagramBuilder', () => {
    let builder: DiagramBuilder;

    beforeEach(() => {
      builder = new DiagramBuilder();
    });

    it('should create instance', () => {
      expect(builder).toBeInstanceOf(DiagramBuilder);
    });

    it('should have run method', () => {
      expect(typeof builder.run).toBe('function');
    });

    it('should have diagramTemplates', () => {
      expect(diagramTemplates).toBeDefined();
      expect(diagramTemplates.flowchart).toBeDefined();
      expect(diagramTemplates.sequence).toBeDefined();
      expect(diagramTemplates.gantt).toBeDefined();
    });
  });

  describe('AssetUploader', () => {
    let uploader: AssetUploader;

    beforeEach(() => {
      uploader = new AssetUploader();
    });

    it('should create instance', () => {
      expect(uploader).toBeInstanceOf(AssetUploader);
    });

    it('should have run method', () => {
      expect(typeof uploader.run).toBe('function');
    });
  });

  describe('StyleConfigurator', () => {
    let configurator: StyleConfigurator;

    beforeEach(() => {
      configurator = new StyleConfigurator();
    });

    it('should create instance', () => {
      expect(configurator).toBeInstanceOf(StyleConfigurator);
    });

    it('should have run method', () => {
      expect(typeof configurator.run).toBe('function');
    });

    it('should have presetSchemes', () => {
      expect(presetSchemes).toBeDefined();
      expect(presetSchemes.length).toBeGreaterThan(0);
    });

    it('should have availableFonts', () => {
      expect(availableFonts).toBeDefined();
      expect(availableFonts.length).toBeGreaterThan(0);
    });

    it('should have pageSizes', () => {
      expect(pageSizes).toBeDefined();
      expect(pageSizes.length).toBeGreaterThan(0);
    });
  });

  describe('PDFMenu', () => {
    let menu: PDFMenu;

    beforeEach(() => {
      menu = new PDFMenu();
    });

    it('should create instance', () => {
      expect(menu).toBeInstanceOf(PDFMenu);
    });

    it('should have display method', () => {
      expect(typeof menu.display).toBe('function');
    });

    it('should have mainMenuOptions', () => {
      expect(mainMenuOptions).toBeDefined();
      expect(mainMenuOptions.length).toBe(6);
    });
  });
});

describe('TUI Utilities', () => {
  describe('clearScreen', () => {
    it('should be a function', () => {
      expect(typeof clearScreen).toBe('function');
    });
  });

  describe('displayHeader', () => {
    it('should be a function', () => {
      expect(typeof displayHeader).toBe('function');
    });
  });

  describe('displaySection', () => {
    it('should be a function', () => {
      expect(typeof displaySection).toBe('function');
    });
  });

  describe('displayProgress', () => {
    it('should be a function', () => {
      expect(typeof displayProgress).toBe('function');
    });
  });

  describe('spinner', () => {
    it('should be a function', () => {
      expect(typeof spinner).toBe('function');
    });
  });

  describe('displayResults', () => {
    it('should be a function', () => {
      expect(typeof displayResults).toBe('function');
    });
  });

  describe('handleTUIError', () => {
    it('should be a function', () => {
      expect(typeof handleTUIError).toBe('function');
    });
  });

  describe('gatherChartData', () => {
    it('should be a function', () => {
      expect(typeof gatherChartData).toBe('function');
    });
  });

  describe('gatherDataset', () => {
    it('should be a function', () => {
      expect(typeof gatherDataset).toBe('function');
    });
  });
});

describe('Mock Readline for Testing', () => {
  const createMockReadline = (answers: string[]): { question: (q: string, cb: (a: string) => void) => void; close: () => void } => {
    let answerIndex = 0;

    return {
      question: (_question: string, callback: (answer: string) => void) => {
        if (answerIndex < answers.length) {
          callback(answers[answerIndex]);
          answerIndex++;
        } else {
          callback('');
        }
      },
      close: () => {}
    };
  };

  it('should handle mock question/answer flow', async () => {
    const mockRl = createMockReadline(['test answer']);

    const answer = await new Promise<string>((resolve) => {
      mockRl.question('Question: ', (ans) => {
        resolve(ans);
      });
    });

    expect(answer).toBe('test answer');
  });
});

describe('Menu Navigation', () => {
  it('should have correct menu options structure', () => {
    expect(mainMenuOptions).toHaveLength(6);

    mainMenuOptions.forEach((option) => {
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('description');
      expect(typeof option.id).toBe('string');
      expect(typeof option.label).toBe('string');
      expect(typeof option.description).toBe('string');
    });
  });

  it('should include all expected menu options', () => {
    const ids = mainMenuOptions.map(o => o.id);
    expect(ids).toContain('create');
    expect(ids).toContain('template');
    expect(ids).toContain('edit');
    expect(ids).toContain('batch');
    expect(ids).toContain('settings');
    expect(ids).toContain('back');
  });
});

describe('Color Schemes', () => {
  it('should have valid hex colors', () => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    presetSchemes.forEach((scheme) => {
      expect(scheme.primary).toMatch(hexColorRegex);
      expect(scheme.secondary).toMatch(hexColorRegex);
      expect(scheme.accent).toMatch(hexColorRegex);
      expect(scheme.name).toBeDefined();
    });
  });

  it('should have unique names', () => {
    const names = presetSchemes.map(s => s.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });
});

describe('Diagram Templates', () => {
  it('should have required template types', () => {
    expect(diagramTemplates).toHaveProperty('flowchart');
    expect(diagramTemplates).toHaveProperty('sequence');
    expect(diagramTemplates).toHaveProperty('gantt');
  });

  it('should have mermaid syntax in templates', () => {
    const allTemplates = Object.values(diagramTemplates).flat();
    const hasValidSyntax = allTemplates.some((template) => {
      return template.includes('graph') ||
        template.includes('sequenceDiagram') ||
        template.includes('gantt');
    });
    expect(hasValidSyntax).toBe(true);
  });
});

describe('Page Sizes', () => {
  it('should have standard page sizes', () => {
    const ids = pageSizes.map(s => s.id);
    expect(ids).toContain('A4');
    expect(ids).toContain('Letter');
    expect(ids).toContain('Legal');
    expect(ids).toContain('Tabloid');
  });

  it('should have descriptions for all sizes', () => {
    pageSizes.forEach((size) => {
      expect(size.description).toBeDefined();
      expect(size.description.length).toBeGreaterThan(0);
    });
  });
});

describe('Font Options', () => {
  it('should have unique font IDs', () => {
    const ids = availableFonts.map(f => f.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it('should have descriptions for all fonts', () => {
    availableFonts.forEach((font) => {
      expect(font.description).toBeDefined();
      expect(font.description.length).toBeGreaterThan(0);
    });
  });
});
