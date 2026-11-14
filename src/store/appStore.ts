// Compatibility shim.
//
// The former localStorage prototype store has been replaced by an API-backed
// store (./apiStore) that talks to the Express + MongoDB backend. Every page
// still imports `useAppStore` from this module, so the public surface is
// unchanged.
export { useAppStore, refresh } from './apiStore';
export type { AppDataState, PendingRegistrationState } from './apiStore';
