import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { resolveLocale } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('locale')?.value)

  return {
    locale,
    messages: (await import(`../../messages/${locale}`)).default,
  }
})
