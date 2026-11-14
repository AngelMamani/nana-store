import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AdminCategoriesPage } from "./admin/AdminCategoriesPage.tsx"
import { AdminHomePage } from "./admin/AdminHomePage.tsx"
import { AdminInventoryPage } from "./admin/AdminInventoryPage.tsx"
import { AdminLayout } from "./admin/AdminLayout.tsx"
import { AdminOffersPage } from "./admin/AdminOffersPage.tsx"
import { AdminOrdersPage } from "./admin/AdminOrdersPage.tsx"
import { AdminProductFormPage } from "./admin/AdminProductFormPage.tsx"
import { AdminProductsPage } from "./admin/AdminProductsPage.tsx"
import { AdminStorePage } from "./admin/AdminStorePage.tsx"
import { AdminUsersPage } from "./admin/AdminUsersPage.tsx"
import { AdminVideosPage } from "./admin/AdminVideosPage.tsx"
import { AuthProvider } from "./auth/AuthProvider.tsx"
import { CartProvider } from "./cart/CartProvider.tsx"
import { CatalogProvider } from "./catalog/CatalogProvider.tsx"
import { StoreShell } from "./components/StoreShell.tsx"
import { AccountPage } from "./pages/AccountPage.tsx"
import { CategoryPage } from "./pages/CategoryPage.tsx"
import { HomePage } from "./pages/HomePage.tsx"
import { LoginPage } from "./pages/LoginPage.tsx"
import { ProductPage } from "./pages/ProductPage.tsx"
import { RegisterPage } from "./pages/RegisterPage.tsx"
import { SearchPage } from "./pages/SearchPage.tsx"

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CatalogProvider>
        <CartProvider>
          <Routes>
            <Route path="entrar" element={<LoginPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route path="productos" element={<AdminProductsPage />} />
              <Route path="productos/nuevo" element={<AdminProductFormPage />} />
              <Route path="productos/:productId" element={<AdminProductFormPage />} />
              <Route path="categorias" element={<AdminCategoriesPage />} />
              <Route path="inventario" element={<AdminInventoryPage />} />
              <Route path="ofertas" element={<AdminOffersPage />} />
              <Route path="pedidos" element={<AdminOrdersPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="videos" element={<AdminVideosPage />} />
              <Route path="tienda" element={<AdminStorePage />} />
            </Route>

            <Route element={<StoreShell />}>
              <Route index element={<HomePage />} />
              <Route path="c/:slug" element={<CategoryPage />} />
              <Route path="p/:productId" element={<ProductPage />} />
              <Route path="buscar" element={<SearchPage />} />
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
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

