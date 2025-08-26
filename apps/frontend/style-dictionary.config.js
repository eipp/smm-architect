// Simple Style Dictionary configuration
const { registerFormat, build } = require('style-dictionary');

// Register a simple CSS variables format
registerFormat({
  name: 'css/custom-variables',
  formatter: function(dictionary) {
    return `:root {\n${dictionary.allTokens.map(token => {
      const kebabName = token.path.join('-');
      return `  --${kebabName}: ${token.value};`;
    }).join('\n')}\n}`;
  }
});

// Register TypeScript format
registerFormat({
  name: 'typescript/tokens',
  formatter: function(dictionary) {
    return `export const tokens = ${JSON.stringify(dictionary.tokens, null, 2)} as const;\n\nexport type DesignTokens = typeof tokens;\n\nexport default tokens;`;
  }
});

module.exports = {
  source: ['src/design-system/tokens/tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/design-system/build/',
      files: [{
        destination: 'tokens.css',
        format: 'css/custom-variables'
      }]
    },
    typescript: {
      transformGroup: 'js',
      buildPath: 'src/design-system/build/',
      files: [{
        destination: 'tokens.ts',
        format: 'typescript/tokens'
      }]
    }
  }
};