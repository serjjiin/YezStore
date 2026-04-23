import { create } from 'zustand'

export type CartItem = {
    id: string
    title: string
    price: number
    quantity: number
    artisan: string
    image_url?: string
}

export type ShippingOption = {
    id: number
    name: string
    price: string
    delivery_time: number
    company: { name: string }
}

type CartStore = {
    items: CartItem[]
    shipping: ShippingOption | null
    addItem: (item: CartItem) => void
    removeItem: (id: string) => void
    clearCart: () => void
    setShipping: (option: ShippingOption | null) => void
    subtotal: () => number
    total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    shipping: null,

    addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id)
        if (existing) {
            set({
                items: get().items.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                ),
            })
        } else {
            set({ items: [...get().items, { ...item, quantity: 1 }] })
        }
    },

    removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
    },

    clearCart: () => set({ items: [], shipping: null }),

    setShipping: (option) => set({ shipping: option }),

    subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

    total: () => {
        const subtotal = get().subtotal()
        const shippingPrice = parseFloat(get().shipping?.price ?? '0')
        return subtotal + shippingPrice
    },
}))