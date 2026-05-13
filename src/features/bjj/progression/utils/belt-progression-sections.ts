import type { ProgressionSection } from '../types/belt-progression.types'

/**

 */
export const PROGRESSION_SECTIONS: ProgressionSection[] = [
  // ── Section 1: Pilares del JiuJitsu (informational — no checkboxes) ─────────
  {
    id: 'pilares',
    title: '1. Pilares del JiuJitsu',
    isInformational: true,
    items: [
      { id: 'pilares-0', label: 'Si estás arriba, mantente arriba.' },
      { id: 'pilares-1', label: 'Ponte de pie.' },
      { id: 'pilares-2', label: 'Lucha en las transiciones.' },
      { id: 'pilares-3', label: 'Si estás en el suelo, usa tus pies.' },
      { id: 'pilares-4', label: 'Posición antes que sumisión.' },
      { id: 'pilares-5', label: 'Tus amigos cerca, los codos más cerca.' },
      { id: 'pilares-6', label: 'Siempre hay algo que hacer.' },
      { id: 'pilares-7', label: 'La espalda, recta.' },
      { id: 'pilares-8', label: 'Compite, aunque no compitas.' },
      { id: 'pilares-9', label: 'Lucha en serio.' },
    ],
  },

  // ── Section 2: Técnicas Requeridas (32 items) ───────────────────────────────
  {
    id: 'tecnicas',
    title: '2. Técnicas Requeridas',
    isInformational: false,
    items: [
      // 2.1 Comienzo de la lucha (4 items)
      { id: 'tecnicas-comienzo-0', label: 'Double Leg', category: 'takedown' },
      { id: 'tecnicas-comienzo-1', label: 'Single Leg', category: 'takedown' },
      { id: 'tecnicas-comienzo-2', label: 'Collar Drag / Arm Drag', category: 'takedown' },
      { id: 'tecnicas-comienzo-3', label: 'Guard Pull', category: 'takedown' },

      // 2.2 Pasados (5 items)
      { id: 'tecnicas-pasados-0', label: 'Abrir la Guardia Cerrada', category: 'guard_pass' },
      { id: 'tecnicas-pasados-1', label: 'Knee Slide & Leg Weave', category: 'guard_pass' },
      { id: 'tecnicas-pasados-2', label: 'Double Under', category: 'guard_pass' },
      { id: 'tecnicas-pasados-3', label: 'Leg Drag', category: 'guard_pass' },
      { id: 'tecnicas-pasados-4', label: 'Toreando', category: 'guard_pass' },

      // 2.3 Guardia (8 items)
      { id: 'tecnicas-guardia-0', label: 'Retención Básica de Guardia', category: 'guard' },
      { id: 'tecnicas-guardia-1', label: 'Collar y Manga', category: 'guard' },
      { id: 'tecnicas-guardia-2', label: 'De La Riva', category: 'guard' },
      { id: 'tecnicas-guardia-3', label: 'Guardia Araña y Lasso', category: 'guard' },
      { id: 'tecnicas-guardia-4', label: 'Guardia Mariposa', category: 'guard' },
      { id: 'tecnicas-guardia-5', label: 'Media Guardia', category: 'guard' },
      { id: 'tecnicas-guardia-6', label: 'Guardia Cerrada', category: 'guard' },
      { id: 'tecnicas-guardia-7', label: 'Guardia X & Single X', category: 'guard' },

      // 2.4 Sumisiones (7 items)
      { id: 'tecnicas-sumisiones-0', label: 'Triángulo', category: 'submission' },
      { id: 'tecnicas-sumisiones-1', label: 'Palanca de Brazo (Armbar)', category: 'submission' },
      { id: 'tecnicas-sumisiones-2', label: 'Kimura', category: 'submission' },
      { id: 'tecnicas-sumisiones-3', label: 'Omoplata', category: 'submission' },
      { id: 'tecnicas-sumisiones-4', label: 'Cross Choke (Estrangulación Cruzada)', category: 'submission' },
      { id: 'tecnicas-sumisiones-5', label: 'Mataleón (Rear Naked Choke)', category: 'submission' },
      { id: 'tecnicas-sumisiones-6', label: 'Llave de Pie (Botinha / Straight Ankle Lock)', category: 'submission' },

      // 2.5 Escapes y salidas (6 items)
      { id: 'tecnicas-escapes-0', label: 'Escape de Montada', category: 'escape' },
      { id: 'tecnicas-escapes-1', label: 'Escape de Control Lateral', category: 'escape' },
      { id: 'tecnicas-escapes-2', label: 'Escape de Espalda', category: 'escape' },
      { id: 'tecnicas-escapes-3', label: 'Escape de Triángulo', category: 'escape' },
      { id: 'tecnicas-escapes-4', label: 'Escape de Guillotina', category: 'escape' },
      { id: 'tecnicas-escapes-5', label: 'Escape de Palanca de Brazo (Armbar)', category: 'escape' },

      // 2.6 Jerarquía de las posiciones (1 item — conceptual)
      { id: 'tecnicas-jerarquia-0', label: 'Conocer la jerarquía de las posiciones y cómo transicionar en ellas' },
    ],
  },

  // ── Section 3: Sparring Skills (6 items) ────────────────────────────────────
  {
    id: 'sparring',
    title: '3. Sparring Skills',
    isInformational: false,
    items: [
      // 3.1 Defensa y mantenimiento de la guardia
      { id: 'sparring-defensa-0', label: 'Demostrar capacidad para defender y mantener la guardia razonablemente.' },

      // 3.2 Evitar errores comunes de cinturón blanco
      { id: 'sparring-errores-0', label: 'No pasar la guardia de rodillas.' },
      { id: 'sparring-errores-1', label: 'No abrazar al compañero en posiciones desfavorables.' },
      { id: 'sparring-errores-2', label: 'No usar técnicas ineficaces que solo funcionan contra cinturones blancos.' },

      // 3.3 Dominio de posición
      { id: 'sparring-posicion-0', label: 'Si llegas a una posición dominante, ser capaz de mantenerla.' },

      // 3.4 Actitud en sparring contra superiores
      { id: 'sparring-actitud-0', label: 'Plantar cara a compañeros con más experiencia, confiar en tu técnica.' },
    ],
  },

  // ── Section 4: Requisitos Adicionales (6 items) ─────────────────────────────
  {
    id: 'requisitos',
    title: '4. Requisitos Adicionales',
    isInformational: false,
    items: [
      // 4.1 Ser buencompañerx
      { id: 'requisitos-companero-0', label: 'Ayudar a los demás a aprender.' },
      { id: 'requisitos-companero-1', label: 'No intimidar.' },
      { id: 'requisitos-companero-2', label: 'No ser el que lesiona a los demás.' },
      { id: 'requisitos-companero-3', label: 'Preocuparse de que todo el mundo esté bien y aprenda.' },

      // 4.2 Edad
      { id: 'requisitos-edad-0', label: 'Ser mayor de 15 años.' },

      // 4.3 Tiempo de entrenamiento
      { id: 'requisitos-tiempo-0', label: 'Haber entrenado en La Cúpula al menos 1.5 a 2 años.' },
    ],
  },

  // ── Section 5: Bonus (1 item) ──────────────────────────────────────────────
  {
    id: 'bonus',
    title: '5. Bonus',
    isInformational: false,
    items: [
      { id: 'bonus-0', label: 'Competir en al menos un torneo local antes de la graduación.' },
    ],
  },
]

/**

 */
export const TOTAL_CHECKABLE_ITEMS = PROGRESSION_SECTIONS.filter(
  (s) => !s.isInformational
).reduce((acc, s) => acc + s.items.length, 0)
// = 32 + 6 + 6 + 1 = 45