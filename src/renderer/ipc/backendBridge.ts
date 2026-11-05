/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/**
 * Backend Bridge - Permite operação híbrida/migrada entre Tauri (Rust) e Electron (Node)
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean(window.__TAURI__))
  );
};

export async function invokeBackend<T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(command, args);
    } catch (err) {
      console.error(`[Tauri Bridge Error] command ${command}:`, err);
      throw err;
    }
  }

  // Fallback para Electron
  try {
    const { ipcRenderer } = await import('electron');
    return await ipcRenderer.invoke(command, args);
  } catch (err) {
    console.error(`[Electron Bridge Error] command ${command}:`, err);
    throw err;
  }
}
