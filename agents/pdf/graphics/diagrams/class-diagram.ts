export interface ClassProperty {
  name: string;
  type: string;
  visibility?: '+' | '-' | '#';
  static?: boolean;
  abstract?: boolean;
}

export interface ClassMethod {
  name: string;
  parameters?: { name: string; type: string }[];
  returnType: string;
  visibility?: '+' | '-' | '#';
  static?: boolean;
  abstract?: boolean;
}

export interface ClassDefinition {
  name: string;
  properties?: ClassProperty[];
  methods?: ClassMethod[];
  abstract?: boolean;
  interface?: boolean;
  extends?: string;
  implements?: string[];
  notes?: string;
}

export interface ClassRelationship {
  from: string;
  to: string;
  type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'realization';
  label?: string;
  cardinality?: string;
}

export interface ClassDiagramConfig {
  title?: string;
  classes?: ClassDefinition[];
  relationships?: ClassRelationship[];
}

export function createClassDiagramDefinition(config: ClassDiagramConfig): string {
  let definition = 'classDiagram\n';

  if (config.title) {
    definition += `  title ${config.title}\n`;
  }

  if (config.classes) {
    for (const cls of config.classes) {
      if (cls.abstract) {
        definition += `  abstract class ${cls.name} {\n`;
      } else if (cls.interface) {
        definition += `  interface ${cls.name} {\n`;
      } else {
        definition += `  class ${cls.name} {\n`;
      }

      if (cls.properties) {
        for (const prop of cls.properties) {
          const visibility = prop.visibility || '+';
          const staticStr = prop.static ? 'static ' : '';
          const abstractStr = prop.abstract ? 'abstract ' : '';
          definition += `    ${visibility}${staticStr}${abstractStr}${prop.name} ${prop.type}\n`;
        }
      }

      if (cls.methods) {
        for (const method of cls.methods) {
          const params = method.parameters?.map(p => `${p.name} ${p.type}`).join(', ') || '';
          const visibility = method.visibility || '+';
          const staticStr = method.static ? 'static ' : '';
          const abstractStr = method.abstract ? 'abstract ' : '';
          definition += `    ${visibility}${staticStr}${abstractStr}${method.name}(${params}) ${method.returnType}\n`;
        }
      }

      definition += '  }\n';

      if (cls.notes) {
        definition += `  note "${cls.notes}"\n`;
      }
    }
  }

  if (config.relationships) {
    for (const rel of config.relationships) {
      let arrow = '';
      const cardinality = rel.cardinality || '';

      switch (rel.type) {
        case 'inheritance':
          arrow = `--|>`;
          break;
        case 'composition':
          arrow = `--*`;
          break;
        case 'aggregation':
          arrow = `--o`;
          break;
        case 'association':
          arrow = `-->`;
          break;
        case 'realization':
          arrow = `..|>`;
          break;
      }

      const label = rel.label ? ` : "${rel.label}${cardinality}"` : cardinality ? ` : "${cardinality}"` : '';
      definition += `  ${rel.from} ${arrow} ${rel.to}${label}\n`;
    }
  }

  return definition;
}

export const defaultClassDiagramDefinition = `
classDiagram
  class User {
    +string id
    +string name
    +string email
    +login()
    +logout()
  }
  class Order {
    +string orderId
    +Date date
    +calculateTotal()
  }
  User "1" --> "*" Order : places
`;
