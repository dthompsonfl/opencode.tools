const {
  createFlowchartDefinition,
  defaultFlowchartDefinition
} = require('../../agents/pdf/graphics/diagrams/flowchart');
const {
  createSequenceDiagramDefinition,
  defaultSequenceDiagramDefinition
} = require('../../agents/pdf/graphics/diagrams/sequence-diagram');
const {
  createGanttDefinition,
  defaultGanttDefinition
} = require('../../agents/pdf/graphics/diagrams/gantt-chart');
const {
  createClassDiagramDefinition,
  defaultClassDiagramDefinition
} = require('../../agents/pdf/graphics/diagrams/class-diagram');
const {
  createStateDiagramDefinition,
  defaultStateDiagramDefinition
} = require('../../agents/pdf/graphics/diagrams/state-diagram');
const {
  createERDiagramDefinition,
  defaultERDiagramDefinition
} = require('../../agents/pdf/graphics/diagrams/er-diagram');
const {
  createDiagramError
} = require('../../agents/pdf/graphics/diagram-config');

describe('Diagram Helper Functions', () => {
  describe('Flowchart Diagram', () => {
    it('should generate valid flowchart syntax', () => {
      const definition = createFlowchartDefinition({
        layout: 'TB',
        nodes: [
          { id: 'A', label: 'Start', shape: 'round' },
          { id: 'B', label: 'Process', shape: 'diamond' },
          { id: 'C', label: 'End', shape: 'round' }
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C', label: 'Yes' }
        ]
      });

      expect(definition).toContain('graph TB');
      expect(definition).toContain('A(Start)');
      expect(definition).toContain('B{Process}');
      expect(definition).toContain('A --> B');
      expect(definition).toContain('B -->|Yes| C');
    });

    it('should create default flowchart definition', () => {
      expect(defaultFlowchartDefinition).toContain('graph TB');
      expect(defaultFlowchartDefinition).toContain('A[Start]');
      expect(defaultFlowchartDefinition).toContain('B{Process}');
    });

    it('should support different layouts', () => {
      const lrDefinition = createFlowchartDefinition({
        layout: 'LR',
        nodes: [{ id: 'A', label: 'Start' }],
        edges: []
      });
      expect(lrDefinition).toContain('graph LR');
    });
  });

  describe('Sequence Diagram', () => {
    it('should generate valid sequence diagram syntax', () => {
      const definition = createSequenceDiagramDefinition({
        title: 'Test Sequence',
        participants: [
          { alias: 'A', name: 'Client' },
          { alias: 'B', name: 'Server' }
        ],
        messages: [
          { from: 'A', to: 'B', message: 'Request', direction: '->' }
        ]
      });

      expect(definition).toContain('title Test Sequence');
      expect(definition).toContain('sequenceDiagram');
      expect(definition).toContain('participant A as Client');
      expect(definition).toContain('participant B as Server');
      expect(definition).toContain('A->>B: Request');
    });

    it('should create default sequence diagram definition', () => {
      expect(defaultSequenceDiagramDefinition).toContain('sequenceDiagram');
      expect(defaultSequenceDiagramDefinition).toContain('participant A as Client');
    });
  });

  describe('Gantt Chart', () => {
    it('should generate valid gantt syntax', () => {
      const definition = createGanttDefinition({
        title: 'Project Schedule',
        dateFormat: 'YYYY-MM-DD',
        sections: [
          {
            name: 'Development',
            tasks: [
              { id: 't1', name: 'Design', startDate: '2024-01-01', duration: 30 },
              { id: 't2', name: 'Build', startDate: '2024-02-01', duration: 45 }
            ]
          }
        ]
      });

      expect(definition).toContain('gantt');
      expect(definition).toContain('title Project Schedule');
      expect(definition).toContain('dateFormat YYYY-MM-DD');
      expect(definition).toContain('section Development');
      expect(definition).toContain('Design');
      expect(definition).toContain('Build');
    });

    it('should create default gantt definition', () => {
      expect(defaultGanttDefinition).toContain('gantt');
      expect(defaultGanttDefinition).toContain('title Project Timeline');
    });
  });

  describe('Class Diagram', () => {
    it('should generate valid class diagram syntax', () => {
      const definition = createClassDiagramDefinition({
        title: 'Class Relationships',
        classes: [
          {
            name: 'User',
            properties: [
              { name: 'id', type: 'int', visibility: '+' },
              { name: 'email', type: 'string', visibility: '+' }
            ],
            methods: [
              { name: 'login', returnType: 'void', visibility: '+' }
            ]
          }
        ],
        relationships: [
          { from: 'User', to: 'Order', type: 'composition', cardinality: 'one-to-many' }
        ]
      });

      expect(definition).toContain('classDiagram');
      expect(definition).toContain('class User');
      expect(definition).toContain('+id int');
      expect(definition).toContain('+login() void');
    });

    it('should create default class diagram definition', () => {
      expect(defaultClassDiagramDefinition).toContain('classDiagram');
      expect(defaultClassDiagramDefinition).toContain('class User');
    });
  });

  describe('State Diagram', () => {
    it('should generate valid state diagram syntax', () => {
      const definition = createStateDiagramDefinition({
        title: 'Process States',
        startState: 'Idle',
        states: [
          { id: 'Idle', description: 'Initial state' },
          { id: 'Processing', entry: 'Start processing' }
        ],
        transitions: [
          { from: 'Idle', to: 'Processing', event: 'Start' }
        ],
        endState: 'Done'
      });

      expect(definition).toContain('stateDiagram-v2');
      expect(definition).toContain('title Process States');
      expect(definition).toContain('[*] --> Idle');
      expect(definition).toContain('Idle --> Processing : Start');
      expect(definition).toContain('Done --> [*]');
    });

    it('should create default state diagram definition', () => {
      expect(defaultStateDiagramDefinition).toContain('stateDiagram-v2');
      expect(defaultStateDiagramDefinition).toContain('[*] --> Idle');
    });
  });

  describe('ER Diagram', () => {
    it('should generate valid ER diagram syntax', () => {
      const definition = createERDiagramDefinition({
        title: 'Database Schema',
        entities: [
          {
            name: 'User',
            attributes: [
              { name: 'id', type: 'int', key: true },
              { name: 'name', type: 'string', nullable: false }
            ]
          }
        ],
        relationships: [
          { from: 'User', to: 'Order', type: 'identifying', cardinality: 'one-to-many' }
        ]
      });

      expect(definition).toContain('erDiagram');
      expect(definition).toContain('title Database Schema');
      expect(definition).toContain('User {');
      expect(definition).toContain('int id PK');
      expect(definition).toContain('string name NN');
    });

    it('should create default ER diagram definition', () => {
      expect(defaultERDiagramDefinition).toContain('erDiagram');
      expect(defaultERDiagramDefinition).toContain('USER ||--o{ ORDER');
    });
  });
});

describe('Error Handling', () => {
  it('should create diagram error with correct properties', () => {
    const error = createDiagramError(
      'Test error',
      'diagram-123',
      'flowchart',
      'run-456',
      new Error('Original error')
    );

    expect(error.message).toBe('Test error');
    expect(error.diagramId).toBe('diagram-123');
    expect(error.diagramType).toBe('flowchart');
    expect(error.runId).toBe('run-456');
    expect(error.cause).toBeDefined();
    expect(error.cause.message).toBe('Original error');
  });

  it('should create diagram error without cause', () => {
    const error = createDiagramError(
      'Simple error',
      'diagram-789',
      'sequence',
      'run-123'
    );

    expect(error.message).toBe('Simple error');
    expect(error.cause).toBeUndefined();
  });

  it('should have Error as base class', () => {
    const error = createDiagramError(
      'Test',
      'id',
      'flowchart',
      'run'
    );
    expect(error).toBeInstanceOf(Error);
  });
});

describe('Diagram Definition Generation', () => {
  it('should handle complex flowchart with multiple nodes', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: `N${i}`,
      label: `Node ${i}`,
      shape: 'rect' as const
    }));

    const edges = Array.from({ length: 9 }, (_, i) => ({
      from: `N${i}`,
      to: `N${i + 1}`
    }));

    const definition = createFlowchartDefinition({
      layout: 'TB',
      nodes,
      edges
    });

    expect(definition).toContain('graph TB');
    expect(definition).toContain('N0');
    expect(definition).toContain('N9');
    expect(definition).toContain('N0 --> N1');
    expect(definition).toContain('N8 --> N9');
  });

  it('should handle special characters in labels', () => {
    const definition = createFlowchartDefinition({
      layout: 'TB',
      nodes: [
        { id: 'A', label: 'Node with quotes' }
      ],
      edges: []
    });

    expect(definition).toContain('A[Node with quotes]');
  });

  it('should generate sequence diagram with activations', () => {
    const definition = createSequenceDiagramDefinition({
      participants: [
        { alias: 'C', name: 'Client' }
      ],
      messages: [
        { from: 'C', to: 'C', message: 'loop', activate: true }
      ]
    });

    expect(definition).toContain('activate C');
  });
});
