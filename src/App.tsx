import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { Direction } from "radix-ui"
import { Toaster } from "@/components/ui/sonner"
import { useLanguageToggle } from "@/hooks/useLanguageToggle"
import { queryClient } from "@/lib/queryClient"
import { router } from "@/router"

export function App() {
  // Mounted once at the app root so `lang`/`dir` on <html> are correct on
  // every route, including the public login pages that render no shell.
  const { isArabic } = useLanguageToggle()

  return (
    <QueryClientProvider client={queryClient}>
      <Direction.Provider dir={isArabic ? "rtl" : "ltr"}>
        <RouterProvider router={router} />
        <Toaster
          dir={isArabic ? "rtl" : "ltr"}
          position={isArabic ? "top-left" : "top-right"}
        />
      </Direction.Provider>
    </QueryClientProvider>
  )
}

export default App
