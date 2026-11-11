// Thin typed-enough bridge to the main-process services registered in electron/ipc/clinic.ipc.ts.
// `make('plans').save(x)` invokes the IPC channel `plans:save` with the same arguments.
type Api = Record<string, (...args: any[]) => Promise<any>>;

const make = (namespace: string): Api =>
  new Proxy({}, {
    get: (_target, method: string) => (...args: any[]) =>
      window.electronAPI.invoke(`${namespace}:${method}`, ...args),
  }) as Api;

export const notesApi = make('notes');
export const teethApi = make('teeth');
export const plansApi = make('plans');
export const medicinesApi = make('medicines');
export const prescriptionsApi = make('prescriptions');
export const rxTemplatesApi = make('rxTemplates');
export const labApi = make('lab');
export const consentsApi = make('consents');
export const inventoryApi = make('inventory');
export const membershipsApi = make('memberships');
export const analyticsApi = make('analytics');
export const filesApi = make('files');
export const queueApi = make('appointments');
export const appApi = make('app');

/** Electron prefixes errors thrown in the main process; show only the useful part. */
export function errorText(err: any, fallback = 'Something went wrong'): string {
  const msg: string = err?.message || '';
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') || fallback;
}
