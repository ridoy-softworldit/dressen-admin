/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import AddProducts from "@/components/modules/Dashboard/CreateOrder/AddProducts";
import CustomerInfo from "@/components/modules/Dashboard/CreateOrder/CustomerInfo";
import OrderItems from "@/components/modules/Dashboard/CreateOrder/OrderItems";
import OrderSummary from "@/components/modules/Dashboard/CreateOrder/OrderSummary";
import PaymentAndShipping from "@/components/modules/Dashboard/CreateOrder/PaymentAndShipping";
import { Button } from "@/components/ui/button";
import { selectCurrentUser } from "@/redux/featured/auth/authSlice";
import { useCreateOrderMutation } from "@/redux/featured/order/orderApi";
import { useGetAllProductsQuery } from "@/redux/featured/products/productsApi";
import { useAppSelector } from "@/redux/hooks";
import { Product } from "@/types/Product";
import { ShoppingCart } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";

const fields = [
  { label: "First Name", placeholder: "John", id: "firstName" },
  { label: "Last Name", placeholder: "Doe", id: "lastName" },
  {
    label: "Email",
    placeholder: "customer@email.com",
    id: "email",
    type: "email",
  },
  { label: "City", placeholder: "City", id: "city" },
  { label: "Address", placeholder: "Address", id: "address" },
  { label: "Postal code", placeholder: "Postal code", id: "postalcode" },
  { label: "Phone ", placeholder: "Phone ", id: "phone" },
  { label: "Country ", placeholder: "country ", id: "country" },
];

type SelectedProduct = {
  productId: string;
  quantity: number;
};

type paymentAndShipping = {
  paymentMethod: string;
  shippingMethod: string;
};

const CreateOrder = () => {
  const [createOrder] = useCreateOrderMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: products,
    isLoading,
    error,
  } = useGetAllProductsQuery({ searchTerm });

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [paymentAndShipping, setPaymentAndShipping] =
    useState<paymentAndShipping>({
      paymentMethod: "",
      shippingMethod: "",
    });
  const [orderNote, setOrderNote] = useState("");

  const currentUser = useAppSelector(selectCurrentUser);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  const handleChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const allSelectedProducts = products
    ?.filter((product: Product) =>
      selectedProducts.some((p) => p.productId === product._id)
    )
    .map((product: Product) => {
      const qty =
        selectedProducts.find((p) => p.productId === product._id)?.quantity ||
        0;
      return { ...product, quantity: qty };
    });

  const shippingInfo = {
    name: "Express Shipping",
    type: "amount",
  };

  const tax = 0;
  const discount = 0;
  const orderInfo = allSelectedProducts?.map((product) => {
    const subTotal =
      (product.productInfo?.salePrice || product.productInfo?.price || 0) *
      product.quantity;
    const total = subTotal;

    return {
      orderBy: currentUser?._id,
      shopInfo: product.shopId,
      productInfo: product._id,
      status: "pending",
      isCancelled: false,
      quantity: product.quantity,
      totalAmount: {
        subTotal,
        tax,
        shipping: shippingInfo,
        discount,
        total,
      },
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
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      postalCode: formData.postalcode,
      country: formData.country,
    },
    paymentInfo: paymentAndShipping.paymentMethod,
    orderNote: orderNote,
  };

  const CreateFinalOrder = async () => {
    if (!paymentAndShipping.paymentMethod) {
      return toast.error("Payment Method is required!");
    }
    if (!formData.postalcode) {
      return toast.error("Postal Code is required!");
    }
    if (!formData.firstName) {
      return toast.error("First Name is required!");
    }
    if (!formData.lastName) {
      return toast.error("Last Name is required!");
    }
    if (!formData.email) {
      return toast.error("Email is required!");
    }
    if (!formData.city) {
      return toast.error("City is required!");
    }
    if (!formData.address) {
      return toast.error("Address is required!");
    }
    if (!formData.phone) {
      return toast.error("Phone Number is required!");
    }
    if (!formData.country) {
      return toast.error("Cuntry is required!");
    }

    setCreateOrderLoading(true);

    try {
      const res = await createOrder(finalOrder as any).unwrap();
      setFormData({});
      setSelectedProducts([]);
      setPaymentAndShipping({
        paymentMethod: "",
        shippingMethod: "",
      });
      setOrderNote("");
      setCreateOrderLoading(false);
      toast.success("Order placed successfully!");
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
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
            Create New Order
          </h2>
          <p className="opacity-60 text-xs sm:text-sm lg:text-base">
            Manually create orders for customers
          </p>
        </span>
        <span className="flex items-center gap-2">
          <Button disabled variant={"outline"}>
            Save Draft
          </Button>
          <Button onClick={CreateFinalOrder}>
            <ShoppingCart />{" "}
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
          <AddProducts
            setSearchTerm={setSearchTerm}
            products={products || []}
            searchTerm={searchTerm}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />{" "}
          {/* Use fetched products */}
          <OrderItems
            products={allSelectedProducts}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />
        </div>
        <div className="space-y-7 xl:col-span-1">
          <PaymentAndShipping setPaymentAndShipping={setPaymentAndShipping} />
          <OrderSummary finalOrder={finalOrder} setOrderNote={setOrderNote} />
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
