import { useState, useEffect } from "react";
import { db } from "@/lib/firebase.config";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import Image from "next/image";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (method: string) => void;
  orderTotal: number;
  orderId?: string;
}

interface GCashInfo {
  fullName: string;
  phoneNumber: string;
}

const PaymentModal = ({
  isOpen,
  onClose,
  onSubmit,
  orderTotal,
  orderId,
}: PaymentModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [gcashInfo, setGCashInfo] = useState<GCashInfo | null>(null);
  const [paymentProof, setPaymentProof] = useState("");

  useEffect(() => {
    if (selectedMethod === "GCash") {
      fetchGCashInfo();
    }
  }, [selectedMethod]);

  const fetchGCashInfo = async () => {
    try {
      const adminDocRef = doc(db, "admin", "FBDukaeYvvWHDgGCtqQZvwEIHxj2"); // Replace 'adminID' with your actual admin document ID.
      const adminDoc = await getDoc(adminDocRef);
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        if (data.gcashInfo) {
          setGCashInfo(data.gcashInfo as GCashInfo);
        } else {
          setGCashInfo(null); // No GCash info available
        }
      }
    } catch (error) {
      console.error("Error fetching GCash info:", error);
      setGCashInfo(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod || !orderId) return;

    if (selectedMethod === "GCash" && !paymentProof.trim()) {
      alert("Please enter the GCash reference number");
      return;
    }

    setIsUpdating(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        paymentMethod: selectedMethod.toLowerCase(),
        status: "completed",
        ...(selectedMethod === "GCash" && {
          paymentProof: paymentProof.trim(),
        }),
      });

      onSubmit(selectedMethod);
      onClose();
    } catch (error) {
      console.error("Error updating payment method:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Select Payment Method</h3>
        <p className="text-gray-600 mb-4">
          Total Amount: ${orderTotal.toFixed(2)}
        </p>

        <div className="space-y-3">
          {["GCash", "Cash"].map((method) => (
            <button
              key={method}
              onClick={() => setSelectedMethod(method)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors
                ${
                  selectedMethod === method
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-200"
                }`}
            >
              <span className="font-medium">{method}</span>
            </button>
          ))}
        </div>

        {selectedMethod === "GCash" && gcashInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="text-lg font-semibold mb-2">
              GCash Payment Details
            </h4>
            <div className="text-center flex flex-col items-center">
              <Image
                src="/gcashqr.png"
                alt="GCash QR Code"
                className="w-48 h-48"
                width={192}
                height={192}
              />
              <p className="text-sm text-gray-700 mt-2">
                Scan this QR code to pay using GCash.
              </p>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Full Name:</strong> {gcashInfo.fullName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Phone Number:</strong> {gcashInfo.phoneNumber}
            </p>

            <div className="mt-4">
              <label
                htmlFor="paymentProof"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                GCash Reference Number*
              </label>
              <input
                id="paymentProof"
                type="text"
                value={paymentProof}
                onChange={(e) => setPaymentProof(e.target.value)}
                placeholder="Enter GCash reference number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                required
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedMethod ||
              isUpdating ||
              (selectedMethod === "GCash" && !paymentProof.trim())
            }
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUpdating ? "Processing..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
