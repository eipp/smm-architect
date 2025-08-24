module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/canvas',
        'http://localhost:3000/onboard',
        'http://localhost:3000/settings',
        'http://localhost:3000/chat'
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        'categories:pwa': ['warn', { minScore: 0.60 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      command: 'npm run start',
      url: 'http://localhost:3000',
      wait: 5000
    }
  }
}"