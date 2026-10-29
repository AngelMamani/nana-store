import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider.tsx"
import { CartProvider } from "./cart/CartProvider.tsx"
import { StoreShell } from "./components/StoreShell.tsx"
import { AccountPage } from "./pages/AccountPage.tsx"
import { CategoryPage } from "./pages/CategoryPage.tsx"
import { HomePage } from "./pages/HomePage.tsx"
import { LoginPage } from "./pages/LoginPage.tsx"
import { ProductPage } from "./pages/ProductPage.tsx"
import { RegisterPage } from "./pages/RegisterPage.tsx"
import { SearchPage } from "./pages/SearchPage.tsx"

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<StoreShell />}>
              <Route index element={<HomePage />} />
              <Route path="c/:slug" element={<CategoryPage />} />
              <Route path="p/:productId" element={<ProductPage />} />
              <Route path="buscar" element={<SearchPage />} />
              <Route path="entrar" element={<LoginPage />} />
              <Route path="registro" element={<RegisterPage />} />
              <Route path="cuenta" element={<AccountPage />} />
              <Route
                path="*"
                element={
                  <div className="page empty-state">
                    <h1>Página no encontrada</h1>
                    <p>Vuelve al inicio para ver el catálogo de NaNa.</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

