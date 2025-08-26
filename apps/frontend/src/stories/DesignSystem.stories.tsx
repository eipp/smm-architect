import type { Meta } from '@storybook/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const meta: Meta = {
  title: 'Design System/Overview',
  parameters: {
    docs: {
      page: () => (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">SMM Architect Design System</h1>
            <p className="text-lg text-muted-foreground mb-8">
              A comprehensive design system built with React, TypeScript, Tailwind CSS, and Radix UI primitives.
              Designed for accessibility, consistency, and developer experience.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Design Principles</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Accessibility First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    All components meet WCAG 2.1 AA standards with proper keyboard navigation,
                    screen reader support, and focus management.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Consistency</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Unified visual language and interaction patterns across all components
                    ensure a cohesive user experience.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Flexibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Components are designed to be composable and customizable while
                    maintaining design consistency.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Technology Stack</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">React 18</Badge>
              <Badge variant="secondary">TypeScript 5.3+</Badge>
              <Badge variant="secondary">Next.js 14</Badge>
              <Badge variant="secondary">Tailwind CSS 3.4</Badge>
              <Badge variant="secondary">Radix UI</Badge>
              <Badge variant="secondary">Class Variance Authority</Badge>
              <Badge variant="secondary">Lucide Icons</Badge>
            </div>
            <p className="text-muted-foreground">
              Built on modern, well-maintained libraries to ensure performance, accessibility, and maintainability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Component Categories</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Foundation Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    Basic building blocks for creating interfaces
                  </CardDescription>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Button</Badge>
                    <Badge variant="outline" className="text-xs">Card</Badge>
                    <Badge variant="outline" className="text-xs">Input</Badge>
                    <Badge variant="outline" className="text-xs">Badge</Badge>
                    <Badge variant="outline" className="text-xs">Avatar</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specialized Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    Domain-specific components for SMM workflows
                  </CardDescription>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">DecisionCard</Badge>
                    <Badge variant="outline" className="text-xs">Timeline</Badge>
                    <Badge variant="outline" className="text-xs">MicroGraph</Badge>
                    <Badge variant="outline" className="text-xs">AgentChat</Badge>
                    <Badge variant="outline" className="text-xs">AuditViewer</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Color System</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <h3 className="font-medium">Primary</h3>
                <div className="h-16 bg-primary rounded flex items-end p-2">
                  <span className="text-primary-foreground text-xs">primary</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Secondary</h3>
                <div className="h-16 bg-secondary rounded flex items-end p-2">
                  <span className="text-secondary-foreground text-xs">secondary</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Muted</h3>
                <div className="h-16 bg-muted rounded flex items-end p-2">
                  <span className="text-muted-foreground text-xs">muted</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Destructive</h3>
                <div className="h-16 bg-destructive rounded flex items-end p-2">
                  <span className="text-destructive-foreground text-xs">destructive</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Typography Scale</h2>
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold">Heading 1 - 4xl/bold</h1>
                <code className="text-sm text-muted-foreground">text-4xl font-bold</code>
              </div>
              <div>
                <h2 className="text-3xl font-semibold">Heading 2 - 3xl/semibold</h2>
                <code className="text-sm text-muted-foreground">text-3xl font-semibold</code>
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Heading 3 - 2xl/semibold</h3>
                <code className="text-sm text-muted-foreground">text-2xl font-semibold</code>
              </div>
              <div>
                <h4 className="text-xl font-medium">Heading 4 - xl/medium</h4>
                <code className="text-sm text-muted-foreground">text-xl font-medium</code>
              </div>
              <div>
                <p className="text-base">Body text - base/normal</p>
                <code className="text-sm text-muted-foreground">text-base</code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Small text - sm/normal</p>
                <code className="text-sm text-muted-foreground">text-sm text-muted-foreground</code>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Spacing System</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-1 h-4 bg-border"></div>
                <code className="text-sm">1 (4px)</code>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-4 bg-border"></div>
                <code className="text-sm">2 (8px)</code>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-border"></div>
                <code className="text-sm">4 (16px)</code>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-6 h-4 bg-border"></div>
                <code className="text-sm">6 (24px)</code>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-4 bg-border"></div>
                <code className="text-sm">8 (32px)</code>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <Card>
              <CardHeader>
                <CardTitle>Installation</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                  <code>{`# Install dependencies
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge

# Copy component files to your project
# Components are available in src/components/ui/

# Import and use
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg">
  Get Started
</Button>`}</code>
                </pre>
              </CardContent>
            </Card>
          </section>
        </div>
      ),
    },
  },
}

export default meta

// Dummy export to satisfy Storybook
export const Overview = {}