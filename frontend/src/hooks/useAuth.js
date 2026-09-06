// BLUEWRITE — useAuth Hook
// Planned authentication hook. Implementation starts in a later phase.

import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  return useAuthContext();
}