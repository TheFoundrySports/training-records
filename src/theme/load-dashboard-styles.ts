/**
 * Side-effect entry: loads the Open Design CSS port + dashboard fonts.
 * Import once from `BJJDashboardPage` (and the route fallback) so widget
 * class names resolve to the Material token system.
 *
 * Moved to shared src/theme/ in PR 4 (MaterialScope foundation).
 */
import '@fontsource-variable/roboto'
import '@fontsource-variable/roboto-mono'
import './material-dashboard.css'
