interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
    on: (event: string, handler: (args: string[]) => void) => void;
    removeListener: (event: string, handler: (args: string[]) => void) => void;
    selectedAddress?: string;
  };
}
