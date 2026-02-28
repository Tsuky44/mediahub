'use client'

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { AbilityContext } from './AbilityContext';
import { defineAbilityFor } from '@/lib/ability';

export function AbilityProvider({ children, user }: { children: React.ReactNode, user?: any }) {
  const { data: session } = useSession();
  
  const ability = useMemo(() => {
    const currentUser = user || session?.user
    // console.log('[AbilityProvider] User:', currentUser)
    const a = defineAbilityFor(currentUser as any);
    // console.log('[AbilityProvider] Rules:', a.rules)
    return a
  }, [session, user]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
