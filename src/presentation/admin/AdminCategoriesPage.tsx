import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { slugify } from "../../domain/catalog/slug.ts"
import type { Category } from "../../domain/catalog/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import {
  confirmAdminAction,
  promptAdminText,
  showAdminError,
  showAdminSuccess,
} from "./admin-alerts.ts"

const VIEW_KEY = "nana-admin-categories-view"

type CategoryView = "list" | "cards"

function readView(): CategoryView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

export function AdminCategoriesPage() {
  useCatalog()
  const categories = container.listCategories()
  const products = container.listProducts()
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [view, setView] = useState<CategoryView>(readView)

  const sorted = useMemo(
    () => [...categories].sort((left, right) => left.order - right.order),
    [categories],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter(
      (category) =>
        category.name.toLowerCase().includes(needle) || category.slug.toLowerCase().includes(needle),
    )
  }, [sorted, query])

  function productCount(id: string) {
    return products.filter((product) => product.categoryId === id).length
  }

  function changeView(next: CategoryView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      await showAdminError("Nombre corto", "Escribe al menos 2 caracteres para la categoría.")
      return
    }
    const ok = await confirmAdminAction({
      title: "Nueva categoría",
      text: `¿Agregar “${trimmed}” al menú de la tienda?`,
      confirmText: "Agregar",
      icon: "question",
    })
    if (!ok) return
    try {
      await container.saveCategory({
        id: crypto.randomUUID(),
        name: trimmed,
        slug: slugify(trimmed),
        order: (sorted.at(-1)?.order ?? 0) + 1,
      })
      setName("")
      await showAdminSuccess("Categoría creada", "Ya aparece en el menú de la tienda.")
    } catch {
      await showAdminError("No se pudo guardar", "Revisa las reglas de Firestore e inténtalo de nuevo.")
    }
  }

  async function rename(id: string) {
    const current = categories.find((category) => category.id === id)
    if (!current) return
    const nextName = await promptAdminText({
      title: "Renombrar categoría",
      text: "Este nombre se ve en el menú de la tienda.",
      value: current.name,
      confirmText: "Guardar",
      placeholder: "Nombre de la categoría",
    })
    if (!nextName || nextName === current.name) return
    try {
      await container.saveCategory({ ...current, name: nextName, slug: slugify(nextName) })
      await showAdminSuccess("Categoría actualizada", "El menú de la tienda ya muestra el nuevo nombre.")
    } catch {
      await showAdminError("No se pudo guardar", "Revisa las reglas de Firestore e inténtalo de nuevo.")
    }
  }

  async function remove(id: string) {
    const current = categories.find((category) => category.id === id)
    if (!current) return
    const used = productCount(id)
    if (used > 0) {
      await showAdminError(
        "No se puede eliminar",
        `Hay ${used} prenda${used === 1 ? "" : "s"} en “${current.name}”. Muévelas a otra categoría antes de borrarla.`,
      )
      return
    }
    const ok = await confirmAdminAction({
      title: "Eliminar categoría",
      text: `“${current.name}” se quitará del menú de la tienda.`,
      confirmText: "Eliminar",
      danger: true,
    })
    if (!ok) return
    try {
      await container.deleteCategory(id)
      await showAdminSuccess("Categoría eliminada", "Ya no aparece en el menú de la tienda.")
    } catch {
      await showAdminError("No se pudo eliminar", "Revisa las reglas de Firestore e inténtalo de nuevo.")
    }
  }

  return (
    <div className="admin-screen admin-cats">
      <section className="admin-cats-hero">
        <div>
          <p className="admin-kicker">Catálogo</p>
          <h1>Categorías</h1>
          <p>
            {visible.length} de {categories.length} en el menú · ropa de niña, niño, bebé, zapatos y más.
          </p>
        </div>
      </section>

      <form className="admin-cats-create" onSubmit={onCreate}>
        <label className="admin-cats-search">
          <Glyph name="plus" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nueva categoría, ej. Abrigos"
          />
        </label>
        <button className="btn" type="submit">
          Agregar
        </button>
      </form>

      <div className="admin-cats-toolbar">
        <label className="admin-cats-search admin-cats-search--filter">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar categoría"
          />
        </label>
        <div className="admin-products-views" role="group" aria-label="Modo de vista">
          <button
            type="button"
            className={view === "list" ? "is-active" : ""}
            aria-pressed={view === "list"}
            title="Vista lista"
            onClick={() => changeView("list")}
          >
            <Glyph name="list" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={view === "cards" ? "is-active" : ""}
            aria-pressed={view === "cards"}
            title="Vista tarjetas"
            onClick={() => changeView("cards")}
          >
            <Glyph name="cards" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <section className="admin-products-empty">
          <Glyph name="grid" />
          <strong>No hay categorías con ese filtro</strong>
          <p>Crea una nueva o prueba otro nombre.</p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-cats-grid">
          {visible.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              count={productCount(category.id)}
              onRename={() => void rename(category.id)}
              onRemove={() => void remove(category.id)}
            />
          ))}
        </section>
      ) : (
        <section className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Enlace</th>
                  <th>Productos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((category) => {
                  const count = productCount(category.id)
                  return (
                    <tr key={category.id}>
                      <td>
                        <div className="admin-cat-list">
                          <span className="admin-cat-card__badge">{category.name.slice(0, 1).toUpperCase()}</span>
                          <strong>{category.name}</strong>
                        </div>
                      </td>
                      <td>/{category.slug}</td>
                      <td>
                        {count} prenda{count === 1 ? "" : "s"}
                      </td>
                      <td>
                        <div className="admin-cat-card__actions">
                          <button type="button" title="Renombrar" onClick={() => void rename(category.id)}>
                            <Glyph name="edit" />
                          </button>
                          <button type="button" className="is-danger" title="Eliminar" onClick={() => void remove(category.id)}>
                            <Glyph name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function CategoryCard({
  category,
  count,
  onRename,
  onRemove,
}: {
  category: Category
  count: number
  onRename: () => void
  onRemove: () => void
}) {
  return (
    <article className="admin-cat-card">
      <div className="admin-cat-card__badge" aria-hidden="true">
        {category.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="admin-cat-card__body">
        <h2>{category.name}</h2>
        <p>/{category.slug}</p>
        <strong>
          {count} prenda{count === 1 ? "" : "s"}
        </strong>
      </div>
      <div className="admin-cat-card__actions">
        <button type="button" title="Renombrar" onClick={onRename}>
          <Glyph name="edit" />
        </button>
        <button type="button" className="is-danger" title="Eliminar" onClick={onRemove}>
          <Glyph name="trash" />
        </button>
      </div>
    </article>
  )
}

function Glyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    cards: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
