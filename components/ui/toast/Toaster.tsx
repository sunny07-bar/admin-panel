'use client'

import { Toaster as HotToaster } from 'react-hot-toast'
import { useEffect } from 'react'

export function Toaster() {
  useEffect(() => {
    // Inject premium toast styles
    const styleId = 'premium-toast-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Premium Toast Container - Force all toasts */
      [data-hot-toast],
      div[data-hot-toast],
      .react-hot-toast,
      [data-hot-toast] > div {
        animation: toast-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        position: relative !important;
        overflow: visible !important;
      }

      @keyframes toast-slide-in {
        0% {
          transform: translateX(120%) scale(0.8);
          opacity: 0;
        }
        60% {
          transform: translateX(-5%) scale(1.02);
        }
        100% {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }

      @keyframes toast-slide-out {
        from {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
        to {
          transform: translateX(120%) scale(0.8);
          opacity: 0;
        }
      }

      @keyframes toast-shimmer {
        0% {
          transform: translateX(-100%) skewX(-15deg);
        }
        100% {
          transform: translateX(200%) skewX(-15deg);
        }
      }

      @keyframes toast-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.8;
        }
      }

      @keyframes toast-glow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
      }

      @keyframes toast-glow-error {
        0%, 100% {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.5), 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
      }

      /* Success Toast - Premium Design - Force all success toasts */
      [data-hot-toast].toast-success,
      [data-hot-toast][aria-live="polite"][data-type="success"],
      div[data-hot-toast].toast-success {
        position: relative !important;
        overflow: hidden !important;
        background: linear-gradient(135deg, #065f46 0%, #022c22 50%, #064e3b 100%) !important;
        border: 2px solid rgba(16, 185, 129, 0.4) !important;
        box-shadow: 0 25px 50px -12px rgba(16, 185, 129, 0.25), 
                    0 0 0 1px rgba(16, 185, 129, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        animation: toast-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), toast-glow 3s ease-in-out infinite !important;
        color: #ffffff !important;
      }

      [data-hot-toast].toast-success::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(16, 185, 129, 0.2), 
          transparent
        );
        animation: toast-shimmer 3s infinite;
        z-index: 0;
      }

      [data-hot-toast].toast-success::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, 
          #10b981 0%, 
          #34d399 50%, 
          #6ee7b7 100%
        );
        animation: toast-shimmer 2s infinite;
        z-index: 1;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
      }

      /* Error Toast - Premium Design - Force all error toasts */
      [data-hot-toast].toast-error,
      [data-hot-toast][aria-live="assertive"][data-type="error"],
      div[data-hot-toast].toast-error {
        position: relative !important;
        overflow: hidden !important;
        background: linear-gradient(135deg, #991b1b 0%, #450a0a 50%, #7f1d1d 100%) !important;
        border: 2px solid rgba(239, 68, 68, 0.4) !important;
        box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25), 
                    0 0 0 1px rgba(239, 68, 68, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        animation: toast-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), toast-glow-error 3s ease-in-out infinite !important;
        color: #ffffff !important;
      }

      [data-hot-toast].toast-error::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(239, 68, 68, 0.2), 
          transparent
        );
        animation: toast-shimmer 3s infinite;
        z-index: 0;
      }

      [data-hot-toast].toast-error::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, 
          #ef4444 0%, 
          #f87171 50%, 
          #fca5a5 100%
        );
        animation: toast-shimmer 2s infinite;
        z-index: 1;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
      }

      /* Loading Toast - Premium Design */
      [data-hot-toast].toast-loading {
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #92400e 0%, #451a03 50%, #78350f 100%) !important;
        border: 2px solid rgba(245, 158, 11, 0.4) !important;
        box-shadow: 0 25px 50px -12px rgba(245, 158, 11, 0.25), 
                    0 0 0 1px rgba(245, 158, 11, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      }

      [data-hot-toast].toast-loading::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, 
          #f59e0b 0%, 
          #fbbf24 50%, 
          #fcd34d 100%
        );
        animation: toast-shimmer 2s infinite;
        z-index: 1;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
      }

      /* Default Toast - Premium Design */
      [data-hot-toast].toast-container {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1f2937 100%) !important;
        border: 2px solid rgba(255, 255, 255, 0.15) !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      }

      /* Icon Enhancements - Premium */
      [data-hot-toast] [data-icon] {
        width: 24px !important;
        height: 24px !important;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      }

      /* Message Text Styling - Premium */
      [data-hot-toast] [data-message] {
        margin-left: 1rem;
        flex: 1;
        word-wrap: break-word;
        font-weight: 600;
        font-size: 0.9375rem;
        letter-spacing: 0.01em;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        position: relative;
        z-index: 1;
      }

      /* Close Button Styling - Premium */
      [data-hot-toast] [data-close-button] {
        margin-left: 1rem;
        opacity: 0.5;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        position: relative;
        z-index: 1;
      }

      [data-hot-toast] [data-close-button]:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.1);
      }

      /* Hover Effects - Premium */
      [data-hot-toast]:hover {
        transform: translateY(-4px) scale(1.02) !important;
        box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5), 
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
      }

      /* Exit Animation - Premium */
      [data-hot-toast][data-exit] {
        animation: toast-slide-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }

      /* Responsive Design */
      @media (max-width: 640px) {
        [data-hot-toast] {
          min-width: 280px !important;
          max-width: calc(100vw - 2rem) !important;
          padding: 0.875rem 1rem !important;
        }
        
        [data-hot-toast] [data-message] {
          font-size: 0.875rem;
        }
      }

      /* Accessibility */
      [data-hot-toast]:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.6);
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1) !important;
      }

      /* Progress Bar Animation */
      [data-hot-toast] > div:last-child {
        background: rgba(255, 255, 255, 0.1) !important;
        height: 3px !important;
        border-radius: 0 0 1rem 1rem !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return (
    <HotToaster
      position="top-right"
      reverseOrder={false}
      gutter={16}
      containerStyle={{
        top: 24,
        right: 24,
      }}
      toastOptions={{
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1f2937 100%)',
          color: '#ffffff',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          fontSize: '0.9375rem',
          fontWeight: '600',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          maxWidth: '450px',
          minWidth: '340px',
          lineHeight: '1.6',
          letterSpacing: '0.01em',
        },
        className: 'toast-container',
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
          style: {
            background: 'linear-gradient(135deg, #065f46 0%, #022c22 50%, #064e3b 100%)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          },
          className: 'toast-success',
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
          style: {
            background: 'linear-gradient(135deg, #991b1b 0%, #450a0a 50%, #7f1d1d 100%)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          },
          className: 'toast-error',
        },
        loading: {
          iconTheme: {
            primary: '#f59e0b',
            secondary: '#ffffff',
          },
          style: {
            background: 'linear-gradient(135deg, #92400e 0%, #451a03 50%, #78350f 100%)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.25), 0 0 0 1px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          },
          className: 'toast-loading',
        },
      }}
    />
  )
}

