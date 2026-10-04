import { checkKeyStatus, type KeyStatus } from "@/lib/key-protection";

export function useKeyProtection() {
  const status: KeyStatus = checkKeyStatus();

  return {
    ...status,
    isGenerating: false,
    generatedLink: null,
    actionError: null,
    justActivated: false,
    handleGenerateKey: async () => {},
    refreshStatus: () => {},
  };
}
