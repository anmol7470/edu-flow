import { Workflow } from 'lucide-react'

type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'lg' }: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-4 h-4',
      padding: 'p-1.5',
      text: 'text-base',
      rounded: 'rounded-lg',
    },
    md: {
      icon: 'w-6 h-6',
      padding: 'p-2',
      text: 'text-xl',
      rounded: 'rounded-xl',
    },
    lg: {
      icon: 'w-8 h-8',
      padding: 'p-3',
      text: 'text-3xl',
      rounded: 'rounded-xl',
    },
  }

  const config = sizes[size]

  return (
    <div className="flex items-center gap-2">
      <div className={`bg-gradient-to-br from-blue-500 to-purple-600 ${config.padding} ${config.rounded}`}>
        <Workflow className={`${config.icon} text-white`} />
      </div>
      {size === 'lg' && (
        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
          EduFlow
        </span>
      )}
    </div>
  )
}
