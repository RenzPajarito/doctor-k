"use client";

import { CartItem, SelectedOption } from "@/app/order/page";

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (
    itemId: string,
    newQuantity: number,
    selectedOptions: SelectedOption[]
  ) => void;
  onOrderNow: () => void;
  isSubmitting: boolean;
}

const Cart = ({
  cart,
  onUpdateQuantity,
  onOrderNow,
  isSubmitting,
}: CartProps) => {
  const cartTotal = cart.reduce((total, item) => {
    const itemBasePrice = item.price * item.quantity;
    const optionsPrice = item.selectedOptions.reduce(
      (sum, option) => sum + option.price * item.quantity,
      0
    );
    return total + itemBasePrice + optionsPrice;
  }, 0);

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Cart</h2>
      {cart.length > 0 ? (
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto">
            {cart.map((item) => {
              const itemTotal =
                (item.price +
                  item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0)) *
                item.quantity;

              return (
                <div
                  key={`${item.id}-${item.selectedOptions
                    .map((o) => o.id)
                    .join("-")}`}
                  className="flex flex-col bg-white p-4 rounded-lg shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {!item.selectedOptions.length && (
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                      )}
                      {item.selectedOptions.length > 0 && (
                        <div className="mt-1">
                          {item.selectedOptions.map((option) => (
                            <span
                              key={option.id}
                              className="inline-block mr-2 text-md text-gray-600"
                            >
                              {option.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-600">
                        ₱{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity - 1,
                              item.selectedOptions
                            )
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                          aria-label="Decrease quantity"
                        >
                          <span className="text-xl">-</span>
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              item.quantity + 1,
                              item.selectedOptions
                            )
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                          aria-label="Increase quantity"
                        >
                          <span className="text-xl">+</span>
                        </button>
                      </div>
                      <p className="font-semibold text-orange-600">
                        ₱{itemTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold">Total:</h3>
            <p className="text-xl font-bold text-orange-600">
              ₱{cartTotal.toFixed(2)}
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={onOrderNow}
              disabled={isSubmitting || cart.length === 0}
              className={`
                w-full py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-semibold
                ${
                  isSubmitting || cart.length === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }
              `}
              aria-label="Place your order"
            >
              {isSubmitting ? "Placing Order..." : "Order Now"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Your cart is empty</p>
      )}
    </div>
  );
};

export default Cart;
