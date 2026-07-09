export default function Modal({ title, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-2xl dark:shadow-black/50 border border-border dark:border-slate-700 max-w-lg w-full max-h-[90vh] flex flex-col animate-fadeIn">
        {title && (
          <div className="flex items-center justify-between px-5 py-3 bg-primary text-white rounded-t-2xl">
            <h2 className="text-sm font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/20 transition-colors cursor-pointer border-0 text-white text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 bg-muted dark:bg-slate-700/50 border-t border-border dark:border-slate-700 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
