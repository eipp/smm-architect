import { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { I18nProvider, SUPPORTED_LOCALES } from '@/lib/i18n'

interface LocaleLayoutProps {
  children: ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return Object.keys(SUPPORTED_LOCALES).map((locale) => ({ locale }))
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // Validate that the incoming `locale` parameter is valid
  if (!Object.keys(SUPPORTED_LOCALES).includes(params.locale)) {
    notFound()
  }

  return (
    <html lang={params.locale} dir={getDirection(params.locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}

function getDirection(locale: string): 'ltr' | 'rtl' {
  // Define RTL locales
  const rtlLocales = ['ar', 'he', 'fa']
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr'
}

export { SUPPORTED_LOCALES }