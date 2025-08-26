import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/**/*.story.@(js|jsx|ts|tsx|mdx)',
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-design-tokens',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          {
            test: /\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: { importLoaders: 1 }
              },
              {
                loader: 'postcss-loader',
                options: { implementation: require.resolve('postcss') }
              }
            ]
          }
        ]
      }
    }
  ],
  
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: path.resolve(__dirname, '../next.config.ts'),
    },
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  
  core: {
    disableTelemetry: true,
  },
  
  features: {
    experimentalRSC: true,
    buildStoriesJson: true,
  },
  
  webpackFinal: async (config) => {
    // Handle path aliases
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
        '@/components': path.resolve(__dirname, '../src/components'),
        '@/lib': path.resolve(__dirname, '../src/lib'),
        '@/hooks': path.resolve(__dirname, '../src/hooks'),
        '@/utils': path.resolve(__dirname, '../src/utils'),
        '@/types': path.resolve(__dirname, '../src/types'),
      }
    }
    
    return config
  },
  
  staticDirs: ['../public'],
  
  env: (config) => ({
    ...config,
    STORYBOOK: 'true',
  }),
}

export default config