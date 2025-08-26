import type { Preview } from '@storybook/react'
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
      expanded: true,
      sort: 'requiredFirst',
    },
    docs: {
      toc: {
        contentsSelector: '.sbdocs-content',
        headingSelector: 'h1, h2, h3',
        ignoreSelector: '#storybook-docs',
        title: 'Table of Contents',
        disable: false,
        unsafeTocbotOptions: {
          orderedList: false,
        },
      },
    },
    viewport: {
      viewports: {
        ...INITIAL_VIEWPORTS,
        mobile1: {
          name: 'Small Mobile',
          styles: { width: '320px', height: '568px' },
        },
        mobile2: {
          name: 'Large Mobile',
          styles: { width: '414px', height: '896px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1024px', height: '768px' },
        },
        desktopLarge: {
          name: 'Large Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
        { name: 'gray', value: '#f8fafc' },
      ],
    },
    layout: 'centered',
    // Accessibility addon configuration
    a11y: {
      config: {
        rules: [
          {
            id: 'autocomplete-valid',
            enabled: true,
          },
          {
            id: 'button-name',
            enabled: true,
          },
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
          {
            id: 'form-field-multiple-labels',
            enabled: true,
          },
          {
            id: 'frame-title',
            enabled: true,
          },
          {
            id: 'html-has-lang',
            enabled: true,
          },
          {
            id: 'html-lang-valid',
            enabled: true,
          },
          {
            id: 'html-xml-lang-mismatch',
            enabled: true,
          },
          {
            id: 'image-alt',
            enabled: true,
          },
          {
            id: 'input-image-alt',
            enabled: true,
          },
          {
            id: 'label',
            enabled: true,
          },
          {
            id: 'link-name',
            enabled: true,
          },
          {
            id: 'list',
            enabled: true,
          },
          {
            id: 'listitem',
            enabled: true,
          },
          {
            id: 'marquee',
            enabled: true,
          },
          {
            id: 'meta-refresh',
            enabled: true,
          },
          {
            id: 'meta-viewport',
            enabled: true,
          },
          {
            id: 'object-alt',
            enabled: true,
          },
          {
            id: 'role-img-alt',
            enabled: true,
          },
          {
            id: 'scrollable-region-focusable',
            enabled: true,
          },
          {
            id: 'select-name',
            enabled: true,
          },
          {
            id: 'server-side-image-map',
            enabled: true,
          },
          {
            id: 'svg-img-alt',
            enabled: true,
          },
          {
            id: 'td-headers-attr',
            enabled: true,
          },
          {
            id: 'th-has-data-cells',
            enabled: true,
          },
          {
            id: 'valid-lang',
            enabled: true,
          },
          {
            id: 'video-caption',
            enabled: true,
          },
        ],
      },
      element: '#storybook-root',
      manual: false,
    },
  },
  
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', left: '🌞' },
          { value: 'dark', title: 'Dark', left: '🌙' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
          { value: 'fr', title: 'Français' },
          { value: 'de', title: 'Deutsch' },
          { value: 'ja', title: '日本語' },
          { value: 'zh', title: '中文' },
        ],
        dynamicTitle: true,
      },
    },
  },
  
  decorators: [
    (Story, context) => {
      const { theme } = context.globals
      
      // Apply theme class to the story container
      return (
        <div className={theme === 'dark' ? 'dark' : ''}>
          <div className="min-h-screen bg-background text-foreground p-4">
            <Story />
          </div>
        </div>
      )
    },
  ],
  
  tags: ['autodocs'],
}

export default preview