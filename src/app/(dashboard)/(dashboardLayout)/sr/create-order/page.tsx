"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";

import AddProducts from "@/components/modules/Dashboard/CreateOrder/AddProducts";
import CustomerInfo from "@/components/modules/Dashboard/CreateOrder/CustomerInfo";
import OrderItems from "@/components/modules/Dashboard/CreateOrder/OrderItems";
import OrderSummary from "@/components/modules/Dashboard/CreateOrder/OrderSummary";
import PaymentAndShipping from "@/components/modules/Dashboard/CreateOrder/PaymentAndShipping";
import { Button } from "@/components/ui/button";

import { useAppSelector } from "@/redux/hooks";
import { selectCurrentUser } from "@/redux/featured/auth/authSlice";
import { useCreateOrderMutation } from "@/redux/featured/order/orderApi";
import { useGetAllProductsQuery } from "@/redux/featured/products/productsApi";
import { Product } from "@/types/Product";

const fields = [
  { label: "First Name", placeholder: "John", id: "firstName" },
  { label: "Last Name", placeholder: "Doe", id: "lastName" },
  { label: "Address", placeholder: "Address", id: "address" },
  { label: "Phone ", placeholder: "Phone ", id: "phone" },
];

type SelectedProduct = {
  productId: string;
  quantity: number;
  priceType: "retail" | "wholesale";
  price: number;
  commission?: {
    type: string;
    value: number;
  };
};

type PaymentType = {
  paymentMethod: string;
};

const CreateOrder = () => {
  const [createOrder] = useCreateOrderMutation();
  const currentUser = useAppSelector(selectCurrentUser);

  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: products,
    isLoading,
    error,
  } = useGetAllProductsQuery({ searchTerm });

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [payment, setPayment] = useState<PaymentType>({ paymentMethod: "" });
  const [orderNote, setOrderNote] = useState("");
  const [createOrderLoading, setCreateOrderLoading] = useState(false);

  // ✅ handle customer info changes
  const handleChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectPriceType = (
    productId: string,
    type: "retail" | "wholesale"
  ) => {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.productId === productId) {
          const product = products?.find((prod) => prod._id === productId);
          if (!product) return p;

          // ✅ Corrected commission mapping
          const commission =
            type === "retail" // retail = regularType
              ? {
                  type: product.commission?.regularType || "fixed",
                  value: product.commission?.regularValue || 0,
                }
              : {
                  type: product.commission?.retailType || "fixed",
                  value: product.commission?.retailValue || 0,
                };

          let price = 0;
          if (type === "retail") {
            price =
              product.productInfo.salePrice && product.productInfo.salePrice > 0
                ? Number(product.productInfo.salePrice)
                : Number(product.productInfo.price);
          } else {
            price =
              product.productInfo.wholeSalePrice &&
              product.productInfo.wholeSalePrice > 0
                ? Number(product.productInfo.wholeSalePrice)
                : Number(product.productInfo.price);
          }

          return { ...p, priceType: type, price, commission };
        }
        return p;
      })
    );
  };
  // ✅ Merge product info for order summary
  const allSelectedProducts = selectedProducts
    .map((sel) => {
      const product = products?.find((p) => p._id === sel.productId);
      if (!product) return null;
      return {
        ...product,
        quantity: sel.quantity,
        priceType: sel.priceType,
        price: sel.price,
        commission: sel.commission,
      };
    })
    .filter(Boolean) as (Product & {
    quantity: number;
    priceType: string;
    price: number;
    commission?: { type: string; value: number };
  })[];

  const tax = 0;
  const discount = 0;
  const shipping = { name: "Standard Shipping", type: "free" };

  // ✅ Generate final order info
  // ✅ Generate final order info
  const orderInfo = allSelectedProducts?.map((product) => {
    const price = product.price; // এইটা frontend থেকে calculate করা হয়েছে
    const subTotal = price * product.quantity;

    const commissionType = product.commission?.type || "fixed";
    const commissionValue = Number(product.commission?.value || 0);

    return {
      orderBy: currentUser?._id,
      userRole: currentUser?.role,
      productInfo: product._id,
      selectedPrice: Number(price), // ✅ এখানে শুধু amount pathano হলো
      status: "pending",
      isCancelled: false,
      quantity: product.quantity,
      totalQuantity: product.quantity,
      totalAmount: {
        subTotal,
        tax,
        shipping,
        discount,
        total: subTotal,
      },
      commission: {
        type: commissionType,
        value: commissionValue,
        amount:
          commissionType === "percent"
            ? (subTotal * commissionValue) / 100
            : commissionValue,
      },
      priceType: product.priceType, // retail / wholesale
      price: price,
    };
  });

  const overallTotal = orderInfo?.reduce(
    (acc, item) => acc + item.totalAmount.total,
    0
  );

  const finalOrder = {
    orderInfo,
    totalAmount: overallTotal,
    customerInfo: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      address: formData.address,
      country: "Bangladesh",
    },
    paymentInfo: payment.paymentMethod,
    orderNote: orderNote,
  };

  // ✅ Create order function
  const CreateFinalOrder = async () => {
    if (!payment.paymentMethod)
      return toast.error("Payment Method is required!");
    if (!formData.firstName) return toast.error("First Name is required!");
    if (!formData.lastName) return toast.error("Last Name is required!");
    if (!formData.address) return toast.error("Address is required!");
    if (!formData.phone) return toast.error("Phone Number is required!");

    setCreateOrderLoading(true);

    try {
      const res = await createOrder(finalOrder as any).unwrap();
      console.log(res);

      setFormData({});
      setSelectedProducts([]);
      setPayment({ paymentMethod: "" });
      setOrderNote("");
      setCreateOrderLoading(false);

      toast.success("Order placed successfully!");

      // ✅ Redirect using window.location
      window.location.href = "/sr/orders"; // page reload সহ redirect
    } catch (error) {
      setCreateOrderLoading(false);
      toast.error("Failed to place order.");
    }
  };

  if (isLoading) return <p>Loading products...</p>;
  if (error) return <p>Error loading products</p>;

  return (
    <div className="py-6 p-2 sm:p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <span>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Create New Order
          </h2>
          <p className="opacity-60 text-xs sm:text-sm lg:text-base">
            Manually create orders for Customers
          </p>
        </span>

        <span className="flex items-center gap-2">
          <Button onClick={CreateFinalOrder}>
            <ShoppingCart />
            {createOrderLoading ? "Creating..." : "Create Order"}
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
        <div className="space-y-7 xl:col-span-2">
          <CustomerInfo
            handleChange={handleChange}
            formData={formData}
            fields={fields}
          />

          {/* Pass handleSelectPriceType to AddProducts */}
          <AddProducts
            setSearchTerm={setSearchTerm}
            products={products || []}
            searchTerm={searchTerm}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
            handleSelectPriceType={handleSelectPriceType}
          />

          <OrderItems
            products={allSelectedProducts}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />
        </div>

        <div className="space-y-7 xl:col-span-1">
          <PaymentAndShipping setPaymentAndShipping={setPayment} />
          <OrderSummary finalOrder={finalOrder} setOrderNote={setOrderNote} />
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
