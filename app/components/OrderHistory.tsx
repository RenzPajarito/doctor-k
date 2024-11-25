import { Order } from "@/app/order/page";
import { useState } from "react";
import PaymentModal from "./PaymentModal";

interface OrderHistoryProps {
  orders: Order[];
  isLoadingOrders: boolean;
}

const OrderHistory = ({ orders, isLoadingOrders }: OrderHistoryProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePaymentSubmit = (method: string) => {
    if (!selectedOrder?.id) return;
    console.log(
      `Payment processed for order ${selectedOrder.id} with ${method}`
    );
  };

  const handlePaymentClick = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Order History
      </h2>

      {isLoadingOrders ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div
              key={`${order.id}-${index}`}
              className="bg-white rounded-lg shadow-md p-4 space-y-3 hover:shadow-lg transition-shadow"
              tabIndex={0}
              role="article"
              aria-label={`Order from ${new Date(
                order.createdAt
              ).toLocaleString()}`}
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    <time dateTime={new Date(order.createdAt).toISOString()}>
                      {new Date(order.createdAt).toLocaleString()}
                    </time>
                  </p>
                  <p className="font-medium text-orange-600">
                    Total: ₱{order.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Table #{order.tableNumber}
                  </p>
                </div>
                <span
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${
                      order.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : order.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  `}
                  role="status"
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2">
                {order.items.map((item, itemIndex) => (
                  <div
                    key={`${item.id}-${itemIndex}`}
                    className="flex justify-between items-center text-sm text-gray-600 py-1 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex flex-col">
                      {(!item.selectedOptions ||
                        item.selectedOptions.length === 0) && (
                        <span className="font-medium">{item.name}</span>
                      )}
                      {item.selectedOptions?.length > 0 && (
                        <span className="text-md text-gray-500">
                          {item.selectedOptions
                            .map((opt) => opt.name)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.status === "completed" && (
                <button
                  onClick={() => handlePaymentClick(order)}
                  className="w-full mt-3 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={`Process payment for order from ${new Date(
                    order.createdAt
                  ).toLocaleString()}`}
                >
                  Process Payment
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8" role="status">
          No order history
        </p>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        onSubmit={handlePaymentSubmit}
        orderTotal={selectedOrder?.total || 0}
        orderId={selectedOrder?.id}
      />
    </div>
  );
};

export default OrderHistory;
