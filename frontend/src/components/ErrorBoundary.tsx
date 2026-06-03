import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

function ErrorFallback() {
  const locale = useLocaleStore.getState().locale
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {translate(locale, 'common.errorTitle')}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {translate(locale, 'common.errorDescription')}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {translate(locale, 'common.retry')}
        </Button>
        <Button asChild variant="default">
          <Link to="/">{translate(locale, 'common.home')}</Link>
        </Button>
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
