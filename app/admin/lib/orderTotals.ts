type OrderTotals = {
  total_amount: number | string
  shipping_cost: number | string
}

export function getOrderTotal(order: OrderTotals): number {
  return Number(order.total_amount)
}

export function getOrderProductsSubtotal(order: OrderTotals): number {
  return Number(order.total_amount) - Number(order.shipping_cost)
}
