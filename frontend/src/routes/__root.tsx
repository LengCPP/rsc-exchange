import { Outlet, createRootRoute } from "@tanstack/react-router"
import React, { Suspense } from "react"

import NotFound from "@/components/Common/NotFound"
import { SyncColorMode } from "@/components/ui/color-mode"

const loadDevtools = () =>
  Promise.all([
    import("@tanstack/router-devtools"),
    import("@tanstack/react-query-devtools"),
  ]).then(([routerDevtools, reactQueryDevtools]) => {
    return {
      default: () => (
        <>
          <routerDevtools.TanStackRouterDevtools />
          <reactQueryDevtools.ReactQueryDevtools />
        </>
      ),
    }
  })

const TanStackDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(loadDevtools)

export const Route = createRootRoute({
  component: () => (
    <>
      <SyncColorMode />
      <Outlet />
      <Suspense>
        <TanStackDevtools />
      </Suspense>
    </>
  ),
  notFoundComponent: () => <NotFound />,
})
