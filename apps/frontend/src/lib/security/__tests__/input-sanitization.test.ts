import { sanitizeHtml } from '../input-sanitization'

// Mock DOMPurify to simulate attribute filtering without external dependency
jest.mock('isomorphic-dompurify', () => ({
  sanitize: (html: string, options: any) => {
    let output = html
    if (options?.FORBID_ATTR) {
      for (const attr of options.FORBID_ATTR) {
        const re = new RegExp(`\\s${attr}="[^"]*"`, 'gi')
        output = output.replace(re, '')
      }
    }
    if (options?.ALLOW_DATA_ATTR === false) {
      output = output.replace(/\sdata-[^=]+="[^"]*"/gi, '')
    }
    // Basic javascript: scheme stripping
    output = output.replace(/href="javascript:[^"]*"/gi, 'href=""')
    return output
  }
}))

describe('sanitizeHtml', () => {
  it('removes forbidden attributes and javascript URLs', () => {
    const dirty = '<a href="javascript:alert(1)" onclick="alert(1)" data-test="x">link</a>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/onclick=/i)
    expect(clean).not.toMatch(/data-test=/i)
    expect(clean).not.toMatch(/javascript:/i)
  })
})
