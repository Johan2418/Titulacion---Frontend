import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { crearQueryClient, Providers } from './providers'
import { crearRouter } from './router'

export function App() {
  const [client] = useState(crearQueryClient)
  const [router] = useState(crearRouter)
  return (
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>
  )
}
