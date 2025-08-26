import { Metadata } from 'next'
import { useTranslation } from '@/lib/i18n'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `SMM Architect - ${params.locale.toUpperCase()}`,
    description: 'Social Media Management Platform with AI-powered automation',
  }
}

export default function LocalePage({ params }: PageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to SMM Architect
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Current locale: {params.locale}
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">
              Available Features
            </h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Multi-language support (6 locales)</li>
              <li>• Role-based access control</li>
              <li>• Real-time collaboration</li>
              <li>• AI-powered content generation</li>
              <li>• Comprehensive monitoring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}