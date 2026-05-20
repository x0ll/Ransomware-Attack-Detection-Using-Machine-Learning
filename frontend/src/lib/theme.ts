export type Theme = 'dark' | 'light'

/**
 * Reads the current theme preference from localStorage.
 * Defaults to 'dark' if no preference has been saved.
 */
export function getTheme(): Theme {
  try {
    const s = localStorage.getItem('ransomguard_settings')
    if (s) return JSON.parse(s).theme || 'dark'
  } catch {}
  return 'dark'
}

/**
 * Persists the selected theme to localStorage, then applies it immediately
 * and notifies all components via a custom browser event.
 */
export function setThemeStorage(theme: Theme) {
  try {
    // Merge the theme into the existing settings object to avoid overwriting other keys
    const s = JSON.parse(localStorage.getItem('ransomguard_settings') || '{}')
    localStorage.setItem('ransomguard_settings', JSON.stringify({ ...s, theme }))
  } catch {}
  applyTheme(theme)
  // Dispatch a global event so all open components update their appearance
  window.dispatchEvent(new Event('theme-changed'))
}

/**
 * Applies the theme by setting a data attribute on the root element
 * and updating the body background color directly.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
    document.body.style.background = '#f0f4f8'
  } else {
    root.setAttribute('data-theme', 'dark')
    document.body.style.background = '#0a0e1a'
  }
}
