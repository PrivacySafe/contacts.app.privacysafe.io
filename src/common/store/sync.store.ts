import { computed, ref } from 'vue';
import { defineStore } from 'pinia';


export const useSyncStore = defineStore('sync', () => {
  const inSynchronizationProcess = ref<Map<string, boolean>>(new Map());

  const isSyncRunning = computed(() => inSynchronizationProcess.value.size > 0);

  function addToSyncList(path: string) {
    inSynchronizationProcess.value.set(path, true);
  }

  function removeFromSyncList(path: string) {
    if (inSynchronizationProcess.value.has(path)) {
      inSynchronizationProcess.value.delete(path);
    }
  }

  return {
    inSynchronizationProcess,
    isSyncRunning,
    addToSyncList,
    removeFromSyncList,
  };
});
