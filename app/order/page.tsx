"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase.config";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import Cart from "@/app/components/Cart";
import OrderHistory from "@/app/components/OrderHistory";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// Category represents a food or drink category
export interface Category {
  id: string; // Unique identifier for the category
  name: string; // Name of the category
}

// MenuItem represents a food or drink item within a category
export interface MenuItem {
  id: string; // Unique identifier for the menu item
  name: string; // Name of the menu item
  price: number; // Price of the menu item
  category: string; // The ID of the category the item belongs to
  imageUrl?: string; // Optional URL for an image of the menu item
  options?: {
    id: string;
    name: string;
    isRequired: boolean;
    maxSelections?: number;
    price: number;
  }[];
}

// Add new CartItem interface
export interface CartItem extends MenuItem {
  quantity: number;
  selectedOptions: SelectedOption[];
}

// Add Order interface
export interface Order {
  id?: string;
  deviceId: string;
  tableNumber: number;
  items: CartItem[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: number;
  paymentMethod?: "cash" | "gcash";
  paymentStatus: "pending" | "paid";
}

// Add new interface for selected options
export interface SelectedOption {
  id: string;
  name: string;
  price: number;
}

// Add these interfaces for Firestore data
interface CategoryData {
  name: string;
}

interface MenuItemData {
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  options?: {
    id: string;
    name: string;
    isRequired: boolean;
    maxSelections?: number;
    price: number;
  }[];
}

// Add function to get/generate device ID
const getDeviceId = () => {
  const storageKey = "device_id";
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
};

// Add function to save order to Firestore
const saveOrder = async (order: Omit<Order, "id">) => {
  try {
    const orderRef = await addDoc(collection(db, "orders"), order);
    return orderRef.id;
  } catch (error) {
    console.error("Error saving order: ", error);
    throw error;
  }
};

// Update the fetchMenuData function with proper typing
async function fetchMenuData() {
  try {
    const categoriesSnapshot = await getDocs(collection(db, "categories"));
    const menuItemsSnapshot = await getDocs(collection(db, "menuItems"));

    const categories: Category[] = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as CategoryData).name,
    }));

    const menuItems: MenuItem[] = menuItemsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as MenuItemData),
      imageUrl: (doc.data() as MenuItemData).imageUrl || "",
      options: (doc.data() as MenuItemData).options || [],
    }));

    return { categories, menuItems };
  } catch (error) {
    console.error("Error fetching data: ", error);
    return { categories: [], menuItems: [] };
  }
}

// Add this function to update orders in Firestore
const updateTableNumberInFirestore = async (
  newTableNumber: string,
  deviceId: string
) => {
  try {
    const ordersRef = collection(db, "orders");
    const pendingOrdersQuery = query(
      ordersRef,
      where("deviceId", "==", deviceId),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(pendingOrdersQuery);

    // Update all pending orders with the new table number
    const updatePromises = snapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        tableNumber: newTableNumber,
      });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating table numbers:", error);
    throw error;
  }
};

// Create a separate client component for the menu content
function MenuContent() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [showTableModal, setShowTableModal] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      const menuData = await fetchMenuData();
      setCategories(menuData.categories);
      setMenuItems(menuData.menuItems);
      setIsLoading(false);
    }
    loadInitialData();

    // Setup real-time listener for orders
    const ordersRef = collection(db, "orders");
    const ordersQuery = query(
      ordersRef,
      where("deviceId", "==", getDeviceId()),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const updatedOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        setOrders(updatedOrders);
        setIsLoadingOrders(false);
      },
      (error) => {
        console.error("Error listening to orders:", error);
        setIsLoadingOrders(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check URL parameter first, then localStorage
    const tableFromUrl = searchParams.get("table");
    const savedTableNumber = localStorage.getItem("table_number");

    if (tableFromUrl) {
      setTableNumber(tableFromUrl);
      localStorage.setItem("table_number", tableFromUrl);
      setShowTableModal(false);
    } else if (savedTableNumber) {
      setTableNumber(savedTableNumber);
      setShowTableModal(false);
    }
  }, [searchParams]);

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null); // Deselect category
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handlePlaceOrder = (
    item: MenuItem,
    selectedOptions: SelectedOption[] = []
  ) => {
    setCart((currentCart) => {
      // Find existing item with the same ID and options
      const existingItem = currentCart.find(
        (cartItem) =>
          cartItem.id === item.id &&
          JSON.stringify(cartItem.selectedOptions) ===
            JSON.stringify(selectedOptions)
      );

      if (existingItem) {
        // Update quantity of existing item
        return currentCart.map((cartItem) =>
          cartItem.id === item.id &&
          JSON.stringify(cartItem.selectedOptions) ===
            JSON.stringify(selectedOptions)
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      // Add new item to cart
      return [
        ...currentCart,
        {
          ...item,
          quantity: 1,
          selectedOptions,
        },
      ];
    });
  };

  const handleUpdateQuantity = (
    itemId: string,
    newQuantity: number,
    selectedOptions: SelectedOption[]
  ) => {
    if (newQuantity < 1) {
      setCart((currentCart) =>
        currentCart.filter(
          (item) =>
            !(
              item.id === itemId &&
              JSON.stringify(item.selectedOptions) ===
                JSON.stringify(selectedOptions)
            )
        )
      );
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId &&
        JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleTableNumberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    try {
      // Save to localStorage
      localStorage.setItem("table_number", tableNumber);

      // Update Firestore
      await updateTableNumberInFirestore(tableNumber, getDeviceId());

      setShowTableModal(false);
    } catch (error) {
      console.error("Error updating table number:", error);
      // Optionally show an error message to the user
      alert("Failed to update table number. Please try again.");
    }
  };

  const handleOrderNow = async () => {
    if (cart.length === 0 || isSubmitting || !tableNumber) return;

    try {
      setIsSubmitting(true);

      const newOrder: Omit<Order, "id"> = {
        deviceId: getDeviceId(),
        tableNumber: parseInt(tableNumber),
        items: cart,
        total: cartTotal,
        status: "pending",
        createdAt: Date.now(),
        paymentMethod: "cash",
        paymentStatus: "pending"
      };

      const orderId = await saveOrder(newOrder);

      // Update the state only if the order does not already exist
      setOrders((prevOrders) => {
        const orderExists = prevOrders.some((order) => order.id === orderId);
        if (orderExists) {
          return prevOrders;
        }
        return [
          {
            ...newOrder,
            id: orderId,
          } as Order,
          ...prevOrders,
        ];
      });

      setCart([]); // Clear the cart after order is placed
    } catch (error) {
      console.error("Error placing order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMenuItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Add this handler
  const handleTableNumberClick = () => {
    setShowTableModal(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Enter Table Number</h2>
            <form onSubmit={handleTableNumberSubmit}>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter table number"
                required
                autoFocus
              />
              <button
                type="submit"
                className="w-full mt-4 bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Our Menu
      </h1>

      {tableNumber && (
        <div className="mb-4 text-center">
          <button
            onClick={handleTableNumberClick}
            className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 inline-flex items-center gap-1"
            aria-label="Edit table number"
          >
            <span>Table #{tableNumber}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Categories Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
                  ${
                    selectedCategory === null
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
                aria-pressed={selectedCategory === null}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
                    ${
                      selectedCategory === category.id
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  `}
                  aria-pressed={selectedCategory === category.id}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {selectedCategory ? "Menu Items" : "All Menu Items"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:grid-cols-3">
              {filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {item.imageUrl && (
                      <div className="aspect-w-16 aspect-h-9">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-48 object-cover"
                          width={500}
                          height={500}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-lg font-semibold text-orange-600">
                          ₱{item.price.toFixed(2)}
                        </p>
                      </div>
                      {item.options && item.options.length > 0 && (
                        <div className="mb-3 p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Options:
                          </p>
                          <div className="space-y-2">
                            {item.options.map((option) => {
                              const optionPrice =
                                item.options?.find(
                                  (opt) => opt.id === option.id
                                )?.price ?? 0;

                              return (
                                <label
                                  key={option.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                      onChange={(e) => {
                                        const selectedOption = {
                                          id: option.id,
                                          name: option.name,
                                          price: optionPrice,
                                        };
                                        if (e.target.checked) {
                                          handlePlaceOrder(item, [
                                            selectedOption,
                                          ]);
                                        }
                                      }}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {option.name}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="p-4">
                        <button
                          onClick={() => handlePlaceOrder(item, [])}
                          className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                          aria-label={`Place order for ${item.name}`}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                          </svg>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center py-8">
                  No items found
                </p>
              )}
            </div>
          </div>

          {/* Order History moved below menu items */}
          <div className="mt-8">
            <OrderHistory orders={orders} isLoadingOrders={isLoadingOrders} />
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-96">
          <div className="lg:sticky lg:top-4">
            <Cart
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onOrderNow={handleOrderNow}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Update the main page component
const MenuPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuContent />
    </Suspense>
  );
};

export default MenuPage;
