export type FlightResult<T> = { started: true; value: T } | { started: false };

/**
 * Lets only one task run at a time. React state updates are asynchronous, so
 * `disabled={pending}` alone cannot stop two fast clicks in the same frame;
 * this flag flips synchronously before the first await.
 */
export function createSingleFlight() {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    async run<T>(task: () => Promise<T>): Promise<FlightResult<T>> {
      if (busy) return { started: false };
      busy = true;
      try {
        return { started: true, value: await task() };
      } finally {
        busy = false;
      }
    },
  };
}
