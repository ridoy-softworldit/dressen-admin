export interface ShippingInfo {
  name: string;
  type: string;
}

export interface OrderTotalAmount {
  subTotal: number;
  tax: number;
  shipping: ShippingInfo;
  discount: number;
  total: number;
}

export interface Commission {
  type: "percentage" | "fixed";
  value: number;
  amount: number;
}

export interface OrderItem {
  orderBy: string;
  shopInfo: string;
  productInfo: string;
  trackingNumber: string;
  status: string;
  isCancelled: boolean;
  quantity: number;
  totalAmount: OrderTotalAmount;
  commission?: Commission; // ✅ added commission
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface Order {
  _id: string;
  orderInfo: OrderItem[];
  customerInfo: CustomerInfo;
  paymentInfo: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  totalQuantity?: number;
  totalCommission?: number;
  commissionRate?: number;
  averagePercentageRate?:number;
}
