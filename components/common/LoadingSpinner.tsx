'use client'

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
        
        {/* Animated gradient ring */}
        <div 
          className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
          style={{
            borderTopColor: '#465fff',
            borderRightColor: '#6b7fff',
            borderBottomColor: '#465fff',
            borderLeftColor: 'transparent',
            animationDuration: '1s',
          }}
        ></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse shadow-lg shadow-brand-500/50"></div>
        </div>
        
        {/* Glowing effect */}
        <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping"></div>
      </div>
    </div>
  )
}

