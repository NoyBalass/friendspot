import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed')) return
    function handler(e: Event) {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    dismiss()
  }

  const show = !!prompt && !dismissed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-5 left-4 right-4 z-[70] bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shrink-0">
            <Download size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Add to Home Screen</p>
            <p className="text-xs text-gray-400">Get the app for the best experience</p>
          </div>
          <button onClick={install} className="text-xs font-semibold text-violet-600 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors shrink-0">
            Install
          </button>
          <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 shrink-0">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
