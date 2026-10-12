/**
 * Chargement différé d'un composant.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

type Loaded<P> = ComponentType<P> | { default: ComponentType<P> };

type DynamicOptions = {
  loading?: () => ReactNode;
  /** Sans effet (rendu toujours côté navigateur) ; conservé pour compatibilité. */
  ssr?: boolean;
};

export default function dynamic<P extends object>(
  loader: () => Promise<Loaded<P>>,
  options: DynamicOptions = {},
) {
  const LazyComponent = lazy(async () => {
    const loaded = await loader();
    const component =
      typeof loaded === "object" && loaded !== null && "default" in loaded
        ? loaded.default
        : (loaded as ComponentType<P>);
    return { default: component };
  });

  function DynamicComponent(props: P) {
    return (
      <Suspense fallback={options.loading ? options.loading() : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  return DynamicComponent;
}
