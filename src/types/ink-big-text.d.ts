declare module 'ink-big-text' {
  import * as React from 'react';
  
  interface BigTextProps {
    text: string;
    font?: string;
    colors?: string[];
    backgroundColor?: string;
    letterSpacing?: number;
    space?: boolean;
    maxLength?: number;
    align?: 'left' | 'center' | 'right';
  }
  
  const BigText: React.FC<BigTextProps>;
  export default BigText;
}
