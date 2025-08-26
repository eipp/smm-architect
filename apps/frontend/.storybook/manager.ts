import { addons } from '@storybook/manager-api'
import { themes } from '@storybook/theming'

addons.setConfig({
  theme: {
    ...themes.light,
    brandTitle: 'SMM Architect UI',
    brandUrl: 'https://smm-architect.com',
    brandImage: undefined, // Add logo URL when available
    brandTarget: '_self',
    
    colorPrimary: '#2563eb',
    colorSecondary: '#64748b',
    
    // UI
    appBg: '#ffffff',
    appContentBg: '#ffffff',
    appBorderColor: '#e2e8f0',
    appBorderRadius: 6,
    
    // Typography
    fontBase: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontCode: '"JetBrains Mono", "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", monospace',
    
    // Text colors
    textColor: '#1e293b',
    textInverseColor: '#ffffff',
    
    // Toolbar default and active colors
    barTextColor: '#64748b',
    barSelectedColor: '#2563eb',
    barBg: '#f8fafc',
    
    // Form colors
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    inputTextColor: '#1e293b',
    inputBorderRadius: 4,
  },
  
  panelPosition: 'bottom',
  selectedPanel: 'controls',
  
  sidebar: {
    showRoots: true,
    collapsedRoots: ['example'],
  },
  
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
})