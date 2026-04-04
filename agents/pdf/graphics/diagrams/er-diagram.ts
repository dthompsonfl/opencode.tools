export interface ERAttribute {
  name: string;
  type: string;
  key?: boolean;
  nullable?: boolean;
  unique?: boolean;
}

export interface EREntity {
  name: string;
  attributes?: ERAttribute[];
  label?: string;
}

export interface ERRelationship {
  from: string;
  to: string;
  type: 'identifying' | 'non-identifying' | 'weak';
  label?: string;
  cardinality?: 'one' | 'many' | 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ERDiagramConfig {
  title?: string;
  entities?: EREntity[];
  relationships?: ERRelationship[];
}

export function createERDiagramDefinition(config: ERDiagramConfig): string {
  let definition = 'erDiagram\n';

  if (config.title) {
    definition += `  title ${config.title}\n`;
  }

  if (config.entities) {
    for (const entity of config.entities) {
      definition += `  ${entity.name} {\n`;
      
      if (entity.attributes) {
        for (const attr of entity.attributes) {
          let attrDef = `    ${attr.type} ${attr.name}`;
          if (attr.key) {
            attrDef += ' PK';
          }
          if (attr.nullable === false) {
            attrDef += ' NN';
          }
          if (attr.unique) {
            attrDef += ' UQ';
          }
          definition += attrDef + '\n';
        }
      }
      
      definition += '  }\n';
      
      if (entity.label) {
        definition += `  ${entity.label} ||--|| ${entity.name}\n`;
      }
    }
  }

  if (config.relationships) {
    for (const rel of config.relationships) {
      let relationStr = '';
      
      switch (rel.cardinality) {
        case 'one-to-one':
          relationStr = '||--||';
          break;
        case 'one-to-many':
          relationStr = '||--o{';
          break;
        case 'many-to-many':
          relationStr = '}o{--o{';
          break;
        default:
          relationStr = '}o--|{';
      }

      if (rel.type === 'identifying') {
        relationStr = '||--||';
      } else if (rel.type === 'non-identifying') {
        relationStr = '}o--o{';
      } else if (rel.type === 'weak') {
        relationStr = '}o--{';
      }

      const label = rel.label ? ` : "${rel.label}"` : '';
      definition += `  ${rel.from} ${relationStr} ${rel.to}${label}\n`;
    }
  }

  return definition;
}

export const defaultERDiagramDefinition = `
erDiagram
  USER ||--o{ ORDER : places
  USER ||--o{ ADDRESS : has
  ORDER ||--|{ ORDER_ITEM : contains
  
  USER {
    int id PK
    string name
    string email
    datetime created_at
  }
  
  ORDER {
    int id PK
    int user_id FK
    decimal total_amount
    string status
    datetime created_at
  }
  
  ORDER_ITEM {
    int id PK
    int order_id FK
    int product_id FK
    int quantity
    decimal price
  }
  
  ADDRESS {
    int id PK
    int user_id FK
    string street
    string city
    string zip_code
  }
`;
