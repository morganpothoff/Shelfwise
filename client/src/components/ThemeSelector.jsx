export default function ThemeSelector({ currentTheme, onSelect, onClose }) {
  const themes = [
    {
      id: 'blue',
      name: 'Whimsical Blue',
      description: 'Playful and inviting',
      preview: {
        bg: 'bg-blue-100',
        accent: 'bg-blue-500',
        text: 'text-blue-900'
      }
    },
    {
      id: 'purple',
      name: 'Purple Dream',
      description: 'Elegant purple tones',
      preview: {
        bg: 'bg-purple-100',
        accent: 'bg-purple-600',
        text: 'text-purple-900'
      }
    },
    {
      id: 'light',
      name: 'Clean White',
      description: 'Minimal and clean',
      preview: {
        bg: 'bg-slate-100',
        accent: 'bg-slate-600',
        text: 'text-slate-900'
      }
    },
    {
      id: 'dark',
      name: 'Night Mode',
      description: 'Easy on the eyes',
      preview: {
        bg: 'bg-slate-800',
        accent: 'bg-violet-500',
        text: 'text-slate-100'
      }
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-theme-primary">Choose Theme</h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                currentTheme === theme.id
                  ? 'border-theme-accent bg-theme-secondary'
                  : 'border-theme hover:border-theme-accent'
              }`}
            >
              {/* Theme preview */}
              <div className={`w-16 h-12 rounded-md ${theme.preview.bg} flex items-center justify-center overflow-hidden shadow-inner`}>
                <div className="flex gap-1">
                  <div className={`w-3 h-8 rounded-sm ${theme.preview.accent}`}></div>
                  <div className={`w-3 h-6 rounded-sm ${theme.preview.accent} opacity-70`}></div>
                  <div className={`w-3 h-7 rounded-sm ${theme.preview.accent} opacity-50`}></div>
                </div>
              </div>

              {/* Theme info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-theme-primary">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <span className="text-xs bg-theme-accent text-theme-on-primary px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-theme-muted">{theme.description}</p>
              </div>

              {/* Checkmark for selected */}
              {currentTheme === theme.id && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-theme-muted text-center mt-6">
          Your theme preference will be saved to your account
        </p>
      </div>
    </div>
  );
}
