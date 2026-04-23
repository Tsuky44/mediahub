import { createContext } from 'react';
import { createContextualCan } from '@casl/react';
import { AppAbility } from '@/lib/ability';

export const AbilityContext = createContext<AppAbility>(null as any);
export const Can = createContextualCan(AbilityContext.Consumer);
