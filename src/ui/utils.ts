// util `cn` vendorizado (shadcn/ui) — sem dependência externa no R0: junta
// classes truthy num string só. (Sem tailwind-merge: o R0 não tem conflito de
// classe a resolver; entra quando `codigo-de-entrada` exigir.)
export function cn(...entradas: Array<string | false | null | undefined>): string {
  return entradas.filter(Boolean).join(' ')
}
