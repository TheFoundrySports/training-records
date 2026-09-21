# Feature: WorkoutDetailPage MUI Refactor

## Summary

Refactorizar WorkoutDetailPage y BJJWorkoutDetail para usar MUI Grid v2 en lugar del layout shadcn/ui actual, mejorando la legibilidad de campos clave-valor y la consistencia visual con WorkoutListPage.

## What Already Exists

- `WorkoutDetailPage.tsx` — usa `DetailRow` con flex/w-40 que se rompe en multilínea
- `BJJWorkoutDetail.tsx` — mismo problema con `DetailRow`
- `WorkoutListPage.tsx` — ya usa MUI ThemeProvider y componentes MUI
- `mui-workouts-theme.ts` — theme configurado con tokens shadcn
- `material-tokens.ts` — paleta MUI mirror de shadcn

## Tasks

- [x] Task 1: Migrar WorkoutDetailPage a MUI ThemeProvider
- [x] Task 2: Reemplazar DetailRow con MetadataField MUI (Box + flex layout)
- [x] Task 3: Mejorar layout del Card con mejor espaciado y tipografía MUI
- [x] Task 4: Migrar BJJWorkoutDetail a MUI ThemeProvider
- [x] Task 5: Aplicar MetadataField a BJJSectionCard y DetailRow de BJJ
- [x] Task 6: Verificar dark mode sync con readShadcnDarkMode
- [ ] Task 7: Testear con Playwright (E2E)

## Files to Modify

- `src/features/workouts/pages/WorkoutDetailPage.tsx` — refactorizado con MUI ✓
- `src/features/bjj/components/BJJWorkoutDetail.tsx` — refactorizado con MUI ✓
- `src/features/workouts/pages/WorkoutDetailPage.test.tsx` — actualizado con mocks de Garmin y renderWithMuiTheme ✓

## Files to Create

- `src/features/workouts/components/MetadataField.tsx` — componente reutilizable para campos clave-valor MUI ✓

## Technical Approach

1. **ThemeProvider wrapper**: Envolver cada page con MUI ThemeProvider usando `createWorkoutsTheme(readShadcnDarkMode())`
2. **Flex Layout**: Usar `<Box sx={{ display: 'flex' }}>` con minWidth para labels y flex:1 para values
   - Label toma minWidth fijo en sm+, full width en xs
   - Value se expande para ocupar el resto
3. **Componentes MUI**:
   - `Typography` para labels y valores
   - `Card` / `CardContent` para contención
   - `Stack` para espaciado vertical entre rows
   - `Chip` para badges de tipo de workout
4. **Dark mode**: Mantener `readShadcnDarkMode()` para sincronizar con app shell

## Testing Strategy

### Unit Testing
- Tests de `WorkoutDetailPage.test.tsx` pasan (38 tests)
- Tests de `BJJWorkoutDetail.test.tsx` pasan (14 tests)

### Playwright Testing
- Pendiente: test E2E para verificar layout responsivo y contenido visible

## Risks & Considerations

- El Dialog de confirmación sigue usando shadcn/ui — mantener por consistencia con el resto de la app
- `WorkoutNotesSection` sigue usando shadcn — puede requerir refactor futuro
- Compatibilidad con existentes: los tests pasan sin cambios

## Opportunities for refactoring or unification

- Extraer `DetailRow` → `MetadataField` componente MUI reutilizable ✓
- Unificar theme creation en un hook `useWorkoutsTheme()`
- Considerar mover BJJSectionCard a componente MUI puro ✓

## Questions/Blockers

- Ninguno: el scope está claro

---

## Commit Log

*(Se actualizará con cada work-unit commit)*

## Status: IN PROGRESS

Migración de WorkoutDetailPage y BJJWorkoutDetail a MUI completada. Tests unitarios pasando.
