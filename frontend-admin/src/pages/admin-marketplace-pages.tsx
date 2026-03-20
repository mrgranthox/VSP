import { useQuery } from "@tanstack/react-query";
import { CalendarClock, BriefcaseBusiness } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, FilterCard, PaginationControls } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest } from "@/lib/api";
import { formatDateTime, formatDisplayName, formatNumber } from "@/lib/utils";
import type { BookingItemSummary, ServiceRequestItemSummary } from "@/types/admin";

const ServiceRequestsPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    return params.toString();
  }, [page, query, status]);

  const requestsQuery = useQuery({
    queryKey: ["admin", "service-requests", page, status, query],
    queryFn: () => apiPaginatedRequest<ServiceRequestItemSummary>(`/admin/service-requests?${queryString}`)
  });

  const requests = requestsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Marketplace request visibility across customers, trades, assignments, and current booking linkage." title="Service Requests" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Search requests</span>
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Title or description"
            value={query}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All requests</option>
            <option value="OPEN">Open</option>
            <option value="MATCHED">Matched</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Requests in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(requestsQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {requests.length === 0 ? (
        <EmptyState description="No service requests matched the current filters." title="No requests found" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{request.title}</CardTitle>
                  <CardDescription>{request.description}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDisplayName(request.customerUser?.profile, request.customerUser?.email ?? "Unknown customer")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Trade</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{request.tradeCategory?.name ?? "Unknown trade"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Requested at</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(request.requestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assignments</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatNumber(request.assignments.length)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {request.assignments.slice(0, 3).map((assignment) => (
                    <Badge key={assignment.id} variant={getStatusBadgeVariant(assignment.assignmentStatus)}>
                      {formatDisplayName(assignment.workerProfile.user?.profile, assignment.workerProfile.user?.email ?? "Worker")} · {assignment.assignmentStatus}
                    </Badge>
                  ))}
                  {request.booking ? <Badge variant={getStatusBadgeVariant(request.booking.status)}>Booking {request.booking.status}</Badge> : null}
                </div>

                <Link className="inline-flex" to={`/service-requests/${request.id}`}>
                  <Button variant="outline">Open request detail</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={requestsQuery.data?.pagination} />
    </div>
  );
};

const BookingsPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    return params.toString();
  }, [page, status]);

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", page, status],
    queryFn: () => apiPaginatedRequest<BookingItemSummary>(`/admin/bookings?${queryString}`)
  });

  const bookings = bookingsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Booking operations, worker assignment context, reschedules, and service-request linkage." title="Bookings" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All bookings</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RESCHEDULED">Rescheduled</option>
          </Select>
        </label>

        <Card className="border-dashed lg:col-span-2">
          <CardContent className="flex h-full items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Bookings in view</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(bookingsQuery.data?.pagination.total ?? 0)}</p>
            </div>
            <CalendarClock className="h-10 w-10 text-slate-300" />
          </CardContent>
        </Card>
      </FilterCard>

      {bookings.length === 0 ? (
        <EmptyState description="No bookings matched the current filter." title="No bookings found" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{booking.serviceRequest?.title ?? "Booking without request title"}</CardTitle>
                  <CardDescription>{booking.serviceRequest?.tradeCategory?.name ?? "Unknown trade"}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDisplayName(booking.customerUser?.profile, booking.customerUser?.email ?? "Unknown customer")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Worker</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDisplayName(booking.workerProfile?.user?.profile, booking.workerProfile?.user?.email ?? "Unknown worker")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Starts</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(booking.scheduledStart)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reschedules</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatNumber(booking.reschedules?.length ?? 0)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <BriefcaseBusiness className="h-4 w-4" />
                  {booking.serviceRequest?.locationText ?? "No location text available"}
                </div>

                <Link className="inline-flex" to={`/bookings/${booking.id}`}>
                  <Button variant="outline">Open booking detail</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={bookingsQuery.data?.pagination} />
    </div>
  );
};

export { BookingsPage, ServiceRequestsPage };
