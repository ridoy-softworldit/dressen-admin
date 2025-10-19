/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useReactToPrint } from "react-to-print";
import { CircleChevronUp, CircleChevronDown, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/redux/featured/order/orderApi";

type OrderStatus =
  | "pending"
  | "processing"
  | "at-local-facility"
  | "delivered"
  | "cancelled"
  | "paid";

type Order = {
  order_id: string;
  created: string;
  createdAt: string;
  customer: string;
  total: number;
  profit: number;
  profit_percent: number;
  status: OrderStatus;
  userType: "sr" | "customer";
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "at-local-facility",
  "delivered",
  "cancelled",
  "paid",
];

const OrderPage = () => {
  const { data: orderData = [] } = useGetAllOrdersQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");
  const [searchValue, setSearchValue] = useState("");

  const [sortType, setSortType] = useState<"sr" | "customer">("sr");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [ordersByStatus, setOrdersByStatus] = useState<
    Record<OrderStatus, Order[]>
  >({
    pending: [],
    processing: [],
    "at-local-facility": [],
    delivered: [],
    cancelled: [],
    paid: [],
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // 🔹 Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!orderData || orderData.length === 0) return;

    const transformOrder = (raw: any): Order => {
      const hasSr =
        Array.isArray(raw.orderInfo) &&
        raw.orderInfo.some((info: any) => info.userRole === "sr");

      return {
        order_id: raw._id,
        created: new Date(raw.createdAt).toLocaleString(),
        createdAt: raw.createdAt,
        customer:
          `${raw.customerInfo.firstName} ${raw.customerInfo.lastName}` ||
          "Unknown",
        total: raw.totalAmount || 0,
        profit:
          raw.orderInfo?.reduce(
            (acc: number, item: any) => acc + (item.commission?.amount || 0),
            0
          ) || 0,
        profit_percent:
          raw.orderInfo?.reduce(
            (acc: number, item: any) => acc + (item.commission?.value || 0),
            0
          ) || 0,
        status: raw.orderInfo[raw.orderInfo.length - 1]?.status || "pending",
        userType: hasSr ? "sr" : "customer",
      };
    };

    const transformed = orderData.map(transformOrder);

    const grouped: Record<OrderStatus, Order[]> = {
      pending: [],
      processing: [],
      "at-local-facility": [],
      delivered: [],
      cancelled: [],
      paid: [],
    };

    transformed.forEach((order) => {
      if (ORDER_STATUSES.includes(order.status))
        grouped[order.status].push(order);
      else grouped["pending"].push(order);
    });

    setOrdersByStatus(grouped);
  }, [orderData]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await updateOrderStatus({ id: orderId, status: newStatus }).unwrap();

      const currentStatus = Object.keys(ordersByStatus).find((status) =>
        ordersByStatus[status as OrderStatus].some(
          (o) => o.order_id === orderId
        )
      ) as OrderStatus;

      if (!currentStatus || newStatus === currentStatus) return;

      const updatedOrder = ordersByStatus[currentStatus].find(
        (o) => o.order_id === orderId
      );
      if (!updatedOrder) return;

      const newOrder = { ...updatedOrder, status: newStatus };

      const updatedOrdersByStatus = {
        ...ordersByStatus,
        [currentStatus]: ordersByStatus[currentStatus].filter(
          (o) => o.order_id !== orderId
        ),
        [newStatus]: [newOrder, ...ordersByStatus[newStatus]],
      };

      setOrdersByStatus(updatedOrdersByStatus);
      setExpandedOrder(null);
    } catch (err: any) {
      console.error(
        "Failed to update status:",
        err?.data?.message || err.message
      );
      alert("Failed to update status!");
    }
  };

  // 🔹 Filter orders by SR/Customer + date + search
  const getFilteredOrders = (status: OrderStatus) => {
    return (ordersByStatus[status] || [])
      .filter((item) => {
        if (sortType === "sr") return item.userType === "sr";
        return item.userType === "customer";
      })
      .filter((item) =>
        item.order_id.toLowerCase().includes(searchValue.toLowerCase())
      )
      .filter((item) => {
        if (startDate && endDate) {
          const created = new Date(item.createdAt).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          return created >= start && created <= end;
        }
        return true;
      });
  };

  // 🔹 Pagination logic
  const filteredOrders = getFilteredOrders(activeTab);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // reset page when filters change
  }, [activeTab, searchValue, sortType, startDate, endDate]);

  return (
    <>
      {/* 🔹 Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pt-6">
        {/* Search */}
        <div className="relative w-full sm:w-1/3 bg-white">
          <input
            type="text"
            placeholder="Search by order id"
            className="w-full rounded-md px-4 py-2 text-sm"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
          />
        </div>

        {/* Sort + Filter by Date */}
        <div className="flex flex-wrap gap-2">
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as "sr" | "customer")}
            className="rounded-md bg-white text-gray-500 px-3 py-2 text-sm shadow-sm border"
          >
            <option value="sr">Sort by: SR</option>
            <option value="customer">Sort by: Customer</option>
          </select>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm">
            <span className="text-sm text-gray-500">Filter by date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as OrderStatus)}
      >
        <Tabs.List className="flex overflow-x-auto">
          {ORDER_STATUSES.map((status) => (
            <Tabs.Trigger
              key={status}
              value={status}
              className="flex-1 h-[45px] px-4 bg-white text-sm text-center hover:text-violet11 data-[state=active]:text-violet11 data-[state=active]:border-b-2 data-[state=active]:border-violet-500"
            >
              {status}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {ORDER_STATUSES.map((status) => (
          <Tabs.Content
            key={status}
            value={status}
            className="grow bg-white p-5 rounded-b-md"
          >
            <div className="overflow-x-auto">
              <Table className="min-w-[678px]">
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead className="text-gray-400">ORDER ID</TableHead>
                    <TableHead className="text-gray-400">CREATED</TableHead>
                    <TableHead className="text-gray-400">CUSTOMER</TableHead>
                    <TableHead className="text-gray-400">TOTAL</TableHead>
                    <TableHead className="text-gray-400">PROFIT</TableHead>
                    <TableHead className="text-gray-400">STATUS</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status === activeTab &&
                    paginatedOrders.map((item) => (
                      <TableRow key={item.order_id}>
                        <TableCell className="text-center">
                          <button
                            className="rounded-full border p-1 text-gray-500"
                            onClick={() =>
                              setExpandedOrder(
                                expandedOrder === item.order_id
                                  ? null
                                  : item.order_id
                              )
                            }
                          >
                            {expandedOrder === item.order_id ? (
                              <CircleChevronUp />
                            ) : (
                              <CircleChevronDown />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.order_id}
                        </TableCell>
                        <TableCell>{item.created}</TableCell>
                        <TableCell>{item.customer}</TableCell>
                        <TableCell>৳{item.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>৳{item.profit}</span>
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 text-xs rounded-md font-semibold">
                              {item.profit_percent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                                  item.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : item.status === "processing"
                                    ? "bg-purple-100 text-purple-800"
                                    : item.status === "at-local-facility"
                                    ? "bg-blue-100 text-blue-800"
                                    : item.status === "delivered"
                                    ? "bg-cyan-100 text-cyan-800"
                                    : item.status === "paid"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.status}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {ORDER_STATUSES.map((statusOption) => (
                                <DropdownMenuItem
                                  key={statusOption}
                                  onSelect={() =>
                                    handleStatusChange(
                                      item.order_id,
                                      statusOption
                                    )
                                  }
                                >
                                  {statusOption}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* 🔹 Pagination */}
            {status === activeTab && totalPages > 0 && (
              <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>

                {/* Logic for showing limited page numbers */}
                {(() => {
                  const pages = [];
                  const maxButtons = 5; // একসাথে যতগুলো বাটন দেখাতে চাও
                  let start = Math.max(
                    1,
                    currentPage - Math.floor(maxButtons / 2)
                  );
                  const end = Math.min(totalPages, start + maxButtons - 1);

                  // যদি শেষের দিকে চলে যায়, শুরু ঠিক করা
                  if (end - start < maxButtons - 1) {
                    start = Math.max(1, end - maxButtons + 1);
                  }

                  // প্রথম পেজ দেখাও
                  if (start > 1) {
                    pages.push(1);
                    if (start > 2) pages.push("...");
                  }

                  // মাঝের পেজগুলো
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }

                  // শেষ পেজ দেখাও
                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push("...");
                    pages.push(totalPages);
                  }

                  return pages.map((num, idx) =>
                    num === "..." ? (
                      <span key={idx} className="px-2">
                        ...
                      </span>
                    ) : (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num as number)}
                        className={`px-3 py-1 border rounded ${
                          num === currentPage
                            ? "bg-violet-500 text-white border-violet-500"
                            : "bg-white"
                        }`}
                      >
                        {num}
                      </button>
                    )
                  );
                })()}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* 🔹 Expanded Order Modal */}
      {expandedOrder && (
        <div className="bg-[#00000085] fixed top-0 left-0 w-[100vw] h-[100vh] flex items-center justify-center z-50">
          <div className="relative bg-white p-6 rounded-xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex gap-2 absolute top-2 right-2 no-print">
              <button
                className="border p-2 border-blue-500"
                onClick={reactToPrintFn}
              >
                Print
              </button>
              <button
                onClick={() => setExpandedOrder(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {(() => {
              const rawOrder = orderData.find(
                (o: any) => o._id === expandedOrder
              );
              if (!rawOrder) return <p>Order not found.</p>;

              return (
                <div ref={contentRef} className="space-y-6 px-4">
                  {/* Header */}
                  <div className="pb-4 text-center">
                    <h1 className="text-3xl font-bold uppercase mb-2">
                      ORDER MEMO
                    </h1>
                    <p className="text-sm text-gray-600">
                      Order #{rawOrder._id}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(rawOrder.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {Array.isArray(rawOrder?.orderInfo) &&
                    rawOrder.orderInfo[0] && (
                      <div className="flex flex-col gap-1 font-medium">
                        <p className="text-sm text-gray-600">
                          Order By :{" "}
                          {(rawOrder.orderInfo[0] as any).userRole || "Unknown"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Name :{" "}
                          {(rawOrder.orderInfo[0] as any).orderBy?.name ||
                            "Unknown"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Id:{" "}
                          {(rawOrder.orderInfo[0] as any).orderBy?._id ||
                            "Unknown"}
                        </p>
                      </div>
                    )}

                  {/* Customer Info + Payment */}
                  <div className="flex flex-col sm:flex-row justify-between gap-6">
                    <div className="border border-gray-300 sm:w-2/3 p-4 rounded">
                      <h3 className="font-bold mb-3 uppercase text-sm border-b pb-2">
                        Customer Information
                      </h3>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-semibold">Name:</span>{" "}
                          {rawOrder.customerInfo.firstName}{" "}
                          {rawOrder.customerInfo.lastName}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span>{" "}
                          {rawOrder.customerInfo.phone}
                        </p>
                        <p>
                          <span className="font-semibold">Address:</span>{" "}
                          {rawOrder.customerInfo.address}
                        </p>
                      </div>
                    </div>

                    <div className="border border-gray-300 sm:w-1/3 p-4 rounded">
                      <h3 className="font-bold mb-3 uppercase text-sm border-b pb-2">
                        Payment
                      </h3>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-semibold">Method:</span>{" "}
                          {rawOrder.paymentInfo}
                        </p>
                        <p>
                          <span className="font-semibold">Total:</span> ৳
                          {rawOrder.totalAmount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border border-gray-300 p-4 rounded">
                    <h3 className="font-bold mb-3 uppercase text-sm border-b pb-2">
                      Order Items
                    </h3>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-bold">Product</TableHead>
                            <TableHead className="font-bold">
                              Tracking
                            </TableHead>
                            <TableHead className="font-bold">Price</TableHead>
                            <TableHead className="font-bold">
                              Quantity
                            </TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="font-bold">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rawOrder?.orderInfo.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {item?.productInfo?.description?.name}
                              </TableCell>
                              <TableCell>{item.trackingNumber}</TableCell>
                              <TableCell className="text-right">
                                {item.selectedPrice}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.totalQuantity}
                              </TableCell>
                              <TableCell>{item.status}</TableCell>
                              <TableCell className="text-right">
                                ৳{item.totalAmount.total}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderPage;
