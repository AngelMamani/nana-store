import { useMemo, useState, type ReactNode } from "react"
import { cartQuantity, cartTotal } from "../../domain/cart/cart.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { CartContext, type CartContextValue } from "./cart-context.ts"

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState(() => container.loadCart())
  const [isOpen, setOpen] = useState(false)

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      quantity: cartQuantity(cart),
      total: cartTotal(cart),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      addLine: (line) => {
        setCart(container.addProductToCart(line))
        setOpen(true)
      },
      setQuantity: (lineId, quantity) => setCart(container.changeCartQuantity(lineId, quantity)),
      removeLine: (lineId) => setCart(container.removeCartLine(lineId)),
      setNote: (note) => setCart(container.updateCartNote(note)),
      clear: () => setCart(container.clearCart()),
    }),
    [cart, isOpen],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
