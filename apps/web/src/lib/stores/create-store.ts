import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { devtools, persist } from "zustand/middleware";

type StoreOptions = {
  name: string;
  persist?: boolean;
};

export function createStore<T extends object>(
  initializer: StateCreator<T, [["zustand/devtools", never]], []>,
  options: StoreOptions,
): UseBoundStore<StoreApi<T>> {
  const { name, persist: enablePersist } = options;

  if (enablePersist) {
    return create<T>()(
      devtools(
        persist(initializer as StateCreator<T, [], []>, {
          name: `${name}-storage`,
        }),
        { name },
      ),
    );
  }

  return create<T>()(devtools(initializer, { name }));
}
