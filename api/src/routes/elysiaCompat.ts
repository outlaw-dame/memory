export const signedIn = { isSignedIn: true } as const

export const signedInGuard = { as: 'scoped', ...signedIn, } as any
